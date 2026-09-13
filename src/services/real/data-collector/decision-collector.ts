import "server-only";

import type { LanguageCode, Topic } from "@/domain";
import type { DecisionInput } from "@/services/decision/engine";
import {
  decisionTier,
  WINDOW_MAX_AGE_DAYS,
  WINDOW_MIN_AGE_DAYS,
} from "@/services/decision/parameters";
import {
  buildDecisionSample,
  computeSupplyPerMonth,
} from "./decision-sample";
import {
  createQuotaLedger,
  fetchChannels,
  fetchVideos,
  searchVideos,
  type QuotaLedger,
} from "./youtube-api";

/**
 * Coleta as entradas do MOTOR DE DECISÃO V2.
 *
 * REGRA INEGOCIÁVEL: nada de mock chega aqui. Sem chave, ou com erro
 * de API, o retorno traz `usedFallback: true` e amostra vazia — o
 * motor transforma isso em DADOS INSUFICIENTES, nunca num veredito.
 *
 * QUOTA
 *   tier "reduced" (padrão): 2 buscas (medium + long) ≈ 202u
 *   tier "full":             +2 buscas por data para M3 ≈ 402u
 */

const RELEVANCE_LANGUAGE: Record<LanguageCode, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
  it: "it",
  fr: "fr",
  de: "de",
};

const MS_PER_DAY = 86_400_000;
const LONGFORM_DURATIONS = ["medium", "long"] as const;

/** Extremos da janela, arredondados para blocos de 12h (cache estável). */
function windowBounds(now: Date): { after: string; before: string } {
  const block = 12 * 3_600_000;
  const floorTo = (ms: number) => new Date(Math.floor(ms / block) * block).toISOString();
  return {
    after: floorTo(now.getTime() - WINDOW_MAX_AGE_DAYS * MS_PER_DAY),
    before: floorTo(now.getTime() - WINDOW_MIN_AGE_DAYS * MS_PER_DAY),
  };
}

function emptyInput(): DecisionInput {
  return {
    videos: [],
    rawCount: 0,
    discardedCount: 0,
    supplyPerMonth: null,
    usedFallback: true,
  };
}

/** Mede a densidade de publicação — só no tier completo (+200u). */
async function collectSupply(
  topic: Topic,
  bounds: { after: string; before: string },
  apiKey: string,
  ledger: QuotaLedger,
  now: Date
): Promise<number | null> {
  const searches = await Promise.all(
    LONGFORM_DURATIONS.map((videoDuration) =>
      searchVideos(
        {
          query: topic.query,
          relevanceLanguage: RELEVANCE_LANGUAGE[topic.language],
          regionCode: topic.country,
          order: "date",
          publishedAfter: bounds.after,
          publishedBefore: bounds.before,
          videoDuration,
        },
        apiKey,
        ledger
      )
    )
  );

  const dates = searches
    .flatMap((response) => response.items ?? [])
    .map((item) => item.snippet?.publishedAt)
    .filter((iso): iso is string => Boolean(iso))
    .map((iso) => new Date(iso))
    .filter((date) => !Number.isNaN(date.getTime()));

  // pageSize 100: duas páginas de 50 (medium + long).
  return computeSupplyPerMonth(dates, now, 100);
}

export async function collectDecisionInput(
  topic: Topic
): Promise<DecisionInput> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return emptyInput();

  const now = new Date();
  const bounds = windowBounds(now);
  const tier = decisionTier();
  const ledger = createQuotaLedger();

  try {
    // 1. Busca restrita à JANELA e ao long-form, nas duas faixas de duração.
    const searches = await Promise.all(
      LONGFORM_DURATIONS.map((videoDuration) =>
        searchVideos(
          {
            query: topic.query,
            relevanceLanguage: RELEVANCE_LANGUAGE[topic.language],
            regionCode: topic.country,
            order: "relevance",
            publishedAfter: bounds.after,
            publishedBefore: bounds.before,
            videoDuration,
          },
          apiKey,
          ledger
        )
      )
    );

    const videoIds = [
      ...new Set(
        searches
          .flatMap((response) => response.items ?? [])
          .map((item) => item.id?.videoId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    if (videoIds.length === 0) {
      // Busca vazia é informação real, não falha: amostra vazia sem fallback.
      return {
        videos: [],
        rawCount: 0,
        discardedCount: 0,
        supplyPerMonth: null,
        usedFallback: false,
      };
    }

    // 2. Estatísticas dos vídeos e dos canais.
    const videos = await fetchVideos(videoIds, apiKey, ledger);
    const channelIds = [
      ...new Set(
        videos
          .map((video) => video.snippet?.channelId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const channels = channelIds.length
      ? await fetchChannels(channelIds, apiKey, ledger)
      : [];

    const sample = buildDecisionSample({
      videos,
      channels,
      language: topic.language,
      now,
    });

    // 3. Pressão de oferta: só no tier completo.
    const supplyPerMonth =
      tier === "full"
        ? await collectSupply(topic, bounds, apiKey, ledger, now)
        : null;

    console.info(
      `[DecisionCollector] "${topic.query}" (${topic.language}/${topic.country}, tier ${tier}): ` +
        `${sample.videos.length} vídeos na amostra de ${sample.rawCount} recebidos ` +
        `(${sample.discardedCount} inconsistentes, ${sample.filteredCount} fora do recorte). ` +
        `${ledger.units} unidades de quota, ${ledger.cacheHits} do cache.`
    );

    return {
      videos: sample.videos,
      rawCount: sample.rawCount,
      discardedCount: sample.discardedCount,
      supplyPerMonth,
      usedFallback: false,
      tier,
    };
  } catch (error) {
    console.warn(
      "[DecisionCollector] Coleta real falhou — o motor devolverá DADOS INSUFICIENTES.",
      error
    );
    return emptyInput();
  }
}
