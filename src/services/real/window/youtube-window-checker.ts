import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  LanguageCode,
  LanguageWindowCheck,
  WindowInterpretation,
  WindowReport,
} from "@/domain";
import { COUNTRY_LABELS, LANGUAGE_LABELS } from "@/lib/constants";
import { getApiCache, putApiCache } from "@/lib/repository";
import { LONGFORM_MIN_SECONDS, SHORTS_TITLE_TAG } from "@/lib/video-format";
import type {
  WindowChecker,
  WindowCheckInput,
  WindowTarget,
} from "../../contracts";
import { computeWindowVerdict } from "../../window-verdict";
import { isGrinderChannel } from "../channel-quality";
import {
  createQuotaLedger,
  fetchChannels,
  fetchVideos,
  searchVideos,
  type YouTubeChannel,
} from "../data-collector/youtube-api";
import { matchesLanguage } from "../radar/language-filter";
import { parseIsoDuration } from "../radar/video-filters";
import { buildTemplateWindowInterpretation } from "../../mock/mock-window-checker";

/**
 * Verificador de Janela REAL.
 *
 * Por idioma-alvo: 1 search.list (100u, tema traduzido pela IA,
 * relevância na janela de 90d) + videos.list (1u) + channels.list (1u)
 * ≈ 102u. Cache de 24h POR TEMA+IDIOMA — repetir custa 0. O gasto
 * entra no orçamento global das análises, NÃO no teto do Radar.
 *
 * Vereditos: services/window-verdict.ts (motor). A IA só traduz a
 * consulta e interpreta o quadro — nunca inventa números.
 */

const CHECK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Janela de "recente" da mini-análise. */
const RECENT_WINDOW_DAYS = 90;
/** Outlier "ativo" = publicado nos últimos 30 dias. */
const ACTIVE_OUTLIER_MAX_AGE_DAYS = 30;
/** Mesmas regras do coletor/radar. */
const OUTLIER_MULTIPLIER = 3;
const OUTLIER_MIN_VIEWS = 1_000;
const STRONG_CHANNEL_SUBSCRIBERS = 100_000;

const ANTHROPIC_MODEL = "claude-sonnet-5";
const AI_TIMEOUT_MS = 60_000;

const RELEVANCE_LANGUAGE: Record<string, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
  it: "it",
  fr: "fr",
  de: "de",
};

const translationSchema = z.object({
  translations: z
    .array(z.object({ language: z.string(), query: z.string().min(1) }))
    .min(1),
});

const interpretationSchema = z.object({
  enterFirst: z.string().min(1),
  culturalNotes: z
    .array(z.object({ language: z.string(), note: z.string().min(1) }))
    .min(1)
    .max(7),
  validateBefore: z.array(z.string().min(1)).min(2).max(4),
});

function checkCacheKey(query: string, target: WindowTarget): string {
  return `window:v1:${query.trim().toLowerCase()}|${target.language}|${target.country}`;
}

function windowStartIso(): string {
  const twelveHours = 12 * 3_600_000;
  const start = Date.now() - RECENT_WINDOW_DAYS * 24 * 3_600_000;
  return new Date(Math.floor(start / twelveHours) * twelveHours).toISOString();
}

export class YouTubeWindowChecker implements WindowChecker {
  private anthropic: Anthropic | null = null;

  constructor(private readonly fallback: WindowChecker) {}

  async check(input: WindowCheckInput): Promise<WindowReport> {
    if (!process.env.YOUTUBE_API_KEY) {
      return this.fallback.check(input);
    }
    try {
      return await this.run(input);
    } catch (error) {
      console.warn(
        "[YouTubeWindowChecker] Verificação real falhou — usando o mock.",
        error
      );
      return this.fallback.check(input);
    }
  }

  private getAnthropic(): Anthropic | null {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    if (this.anthropic === null) {
      this.anthropic = new Anthropic({ timeout: AI_TIMEOUT_MS, maxRetries: 1 });
    }
    return this.anthropic;
  }

  private async run(input: WindowCheckInput): Promise<WindowReport> {
    const apiKey = process.env.YOUTUBE_API_KEY as string;

    // 1. Cache por tema+idioma (24h).
    const cached = new Map<string, LanguageWindowCheck>();
    const missing: WindowTarget[] = [];
    for (const target of input.targets) {
      const raw = await getApiCache(checkCacheKey(input.query, target));
      if (raw !== null) {
        cached.set(`${target.language}|${target.country}`, {
          ...(JSON.parse(raw) as LanguageWindowCheck),
          quotaUnits: 0,
          fromCache: true,
        });
      } else {
        missing.push(target);
      }
    }

    // 2. Tradução via IA só para os alvos sem cache (barata; 1 chamada).
    const translations = await this.translateQuery(input, missing);

    // 3. Mini-análise por idioma faltante, em paralelo.
    const fresh = await Promise.all(
      missing.map((target) =>
        this.checkLanguage(
          input.query,
          translations.get(target.language) ?? input.query,
          target,
          apiKey
        )
      )
    );
    for (const check of fresh) {
      await putApiCache(
        checkCacheKey(input.query, {
          language: check.language,
          country: check.country,
        }),
        JSON.stringify(check),
        CHECK_CACHE_TTL_MS
      );
    }

    const checks = input.targets.map(
      (target) =>
        cached.get(`${target.language}|${target.country}`) ??
        (fresh.find(
          (c) => c.language === target.language && c.country === target.country
        ) as LanguageWindowCheck)
    );

    // 4. Leitura da IA (fallback: template a partir dos vereditos).
    const interpretation = await this.interpret(input.query, checks);

    const totalQuotaUnits = checks.reduce((sum, c) => sum + c.quotaUnits, 0);
    console.info(
      `[YouTubeWindowChecker] "${input.query}": ${checks.length} idiomas, ` +
        `${totalQuotaUnits} unidades (${checks.filter((c) => c.fromCache).length} do cache). ` +
        `Vereditos: ${checks.map((c) => `${c.language}=${c.verdict}`).join(", ")}.`
    );
    return {
      query: input.query,
      sourceLanguage: input.sourceLanguage,
      checks,
      interpretation,
      checkedAt: new Date().toISOString(),
      totalQuotaUnits,
    };
  }

  private async translateQuery(
    input: WindowCheckInput,
    missing: readonly WindowTarget[]
  ): Promise<Map<LanguageCode, string>> {
    const result = new Map<LanguageCode, string>();
    result.set(input.sourceLanguage, input.query);
    const needed = [
      ...new Set(
        missing
          .map((t) => t.language)
          .filter((lang) => lang !== input.sourceLanguage)
      ),
    ];
    if (needed.length === 0) return result;

    const client = this.getAnthropic();
    if (!client) return result; // sem IA: busca com o tema original

    try {
      const response = await client.messages.parse({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        system:
          "Traduza a consulta de busca do YouTube para cada idioma pedido, adaptando ao vocabulário que criadores/espectadores locais realmente usam (não tradução literal). Responda apenas no formato pedido.",
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              consulta: input.query,
              idiomaOrigem: LANGUAGE_LABELS[input.sourceLanguage],
              idiomasDestino: needed.map((l) => ({
                language: l,
                label: LANGUAGE_LABELS[l],
              })),
            }),
          },
        ],
        output_config: {
          format: zodOutputFormat(translationSchema),
          effort: "low",
        },
      });
      for (const item of response.parsed_output?.translations ?? []) {
        if ((needed as string[]).includes(item.language)) {
          result.set(item.language as LanguageCode, item.query);
        }
      }
    } catch (error) {
      console.warn(
        "[YouTubeWindowChecker] Tradução falhou — usando o tema original.",
        error
      );
    }
    return result;
  }

  private async checkLanguage(
    originalQuery: string,
    translatedQuery: string,
    target: WindowTarget,
    apiKey: string
  ): Promise<LanguageWindowCheck> {
    const ledger = createQuotaLedger();
    const search = await searchVideos(
      {
        query: translatedQuery,
        relevanceLanguage: RELEVANCE_LANGUAGE[target.language] ?? "en",
        regionCode: target.country,
        order: "relevance",
        publishedAfter: windowStartIso(),
      },
      apiKey,
      ledger
    );
    const ids = [
      ...new Set(
        (search.items ?? [])
          .map((item) => item.id?.videoId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const videos = ids.length ? await fetchVideos(ids, apiKey, ledger) : [];
    const channelIds = [
      ...new Set(
        videos
          .map((v) => v.snippet?.channelId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const channels = channelIds.length
      ? await fetchChannels(channelIds, apiKey, ledger)
      : [];

    const channelById = new Map<
      string,
      { subscribers: number | null; avgViews: number; totalVideos: number }
    >();
    for (const channel of channels as YouTubeChannel[]) {
      if (!channel.id) continue;
      const stats = channel.statistics;
      const hidden = stats?.hiddenSubscriberCount === true;
      const subs = hidden ? null : Number(stats?.subscriberCount ?? NaN);
      const totalVideos = Math.max(1, Number(stats?.videoCount ?? 1));
      channelById.set(channel.id, {
        subscribers: Number.isFinite(subs as number) ? subs : null,
        avgViews: Number(stats?.viewCount ?? 0) / totalVideos,
        totalVideos,
      });
    }

    const now = Date.now();
    // Long-form no idioma-alvo (o filtro de eficiência dos canais é
    // aplicado abaixo, nas contagens de fortes/outliers).
    const longForm = videos.filter((video) => {
      const title = video.snippet?.title ?? "";
      const duration = parseIsoDuration(video.contentDetails?.duration);
      return (
        duration >= LONGFORM_MIN_SECONDS &&
        !SHORTS_TITLE_TAG.test(title) &&
        matchesLanguage(title, video.snippet?.description, target.language)
      );
    });

    let strongCount = 0;
    let activeOutliers = 0;
    const vphs: number[] = [];
    for (const video of longForm) {
      const channelId = video.snippet?.channelId ?? "";
      const channel = channelById.get(channelId);
      const views = Number(video.statistics?.viewCount ?? 0);
      const publishedMs = new Date(video.snippet?.publishedAt ?? 0).getTime();
      const hours = Math.max(1, (now - publishedMs) / 3_600_000);
      vphs.push(views / hours);

      if (!channel) continue;
      const grinder = isGrinderChannel(channel.totalVideos, channel.subscribers);
      if (
        channel.subscribers !== null &&
        channel.subscribers >= STRONG_CHANNEL_SUBSCRIBERS
      ) {
        strongCount += 1;
      }
      const ageDays = (now - publishedMs) / 86_400_000;
      if (
        !grinder &&
        channel.avgViews > 0 &&
        views >= OUTLIER_MIN_VIEWS &&
        views >= OUTLIER_MULTIPLIER * channel.avgViews &&
        ageDays <= ACTIVE_OUTLIER_MAX_AGE_DAYS
      ) {
        activeOutliers += 1;
      }
    }

    const topVphs = [...vphs].sort((a, b) => b - a).slice(0, 10);
    const metrics = {
      recentLongFormCount: longForm.length,
      strongChannelShare:
        longForm.length > 0
          ? Math.round((strongCount / longForm.length) * 100) / 100
          : 0,
      activeOutliers,
    };

    return {
      language: target.language,
      country: target.country,
      translatedQuery,
      verdict: computeWindowVerdict(metrics),
      ...metrics,
      avgTopVph:
        topVphs.length > 0
          ? Math.round(
              (topVphs.reduce((s, v) => s + v, 0) / topVphs.length) * 10
            ) / 10
          : 0,
      sampleSize: videos.length,
      quotaUnits: ledger.units,
      fromCache: false,
    };
  }

  private async interpret(
    query: string,
    checks: readonly LanguageWindowCheck[]
  ): Promise<WindowInterpretation> {
    const client = this.getAnthropic();
    if (!client) return buildTemplateWindowInterpretation(checks);

    try {
      const response = await client.messages.parse({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: `Você interpreta o Verificador de Janela entre Idiomas de uma ferramenta para criadores de YouTube que fazem vídeos longos (dark/faceless). Os VEREDITOS por mercado já foram decididos pelo motor — explique-os, não os conteste, e NUNCA invente números: todo valor citado deve existir na entrada. Responda em português do Brasil. Produza: enterFirst (onde entrar primeiro e por quê, citando vereditos/números), culturalNotes (uma nota POR mercado da entrada, com o campo language igual ao código recebido: a adaptação cultural que o tema pede lá), validateBefore (2–4 itens do que validar antes de produzir). Sem promessas de viralização.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              tema: query,
              mercados: checks.map((c) => ({
                language: c.language,
                pais: COUNTRY_LABELS[c.country],
                consultaUsada: c.translatedQuery,
                veredito: c.verdict,
                longFormRecentes90d: c.recentLongFormCount,
                fracaoCanaisFortes: c.strongChannelShare,
                outliersAtivos30d: c.activeOutliers,
                vphMedioTop10: c.avgTopVph,
              })),
            }),
          },
        ],
        output_config: {
          format: zodOutputFormat(interpretationSchema),
          effort: "medium",
        },
      });
      const parsed = response.parsed_output;
      if (!parsed) throw new Error("Resposta fora do schema.");
      const validLangs = new Set(checks.map((c) => c.language as string));
      return {
        enterFirst: parsed.enterFirst,
        culturalNotes: parsed.culturalNotes
          .filter((n) => validLangs.has(n.language))
          .map((n) => ({ language: n.language as LanguageCode, note: n.note })),
        validateBefore: parsed.validateBefore,
        generatedBy: "ai",
      };
    } catch (error) {
      console.warn(
        "[YouTubeWindowChecker] Interpretação da IA falhou — usando template.",
        error
      );
      return buildTemplateWindowInterpretation(checks);
    }
  }
}
