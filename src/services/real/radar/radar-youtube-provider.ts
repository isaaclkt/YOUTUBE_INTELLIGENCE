import "server-only";

import type {
  NicheCategory,
  RadarChannel,
  RadarFormat,
  RadarNiche,
  RadarSweep,
  RadarVideo,
} from "@/domain";
import { RADAR_WINDOWS } from "@/lib/constants";
import { getApiCache, putApiCache } from "@/lib/repository";
import {
  RadarBudgetExceededError,
  type RadarProvider,
  type RadarSweepInput,
} from "../../contracts";
import { isGrinderChannel } from "../channel-quality";
import {
  createQuotaLedger,
  fetchChannels,
  fetchVideos,
  searchVideos,
  type YouTubeChannel,
} from "../data-collector/youtube-api";
import { classifyReplicable } from "./format-classifier";
import { matchesLanguage } from "./language-filter";
import { createHash } from "node:crypto";
import type { RadarCategoryConfig } from "@/domain";
import { listActiveRadarCategories } from "@/lib/repository";
import {
  isKidsContent,
  matchesFormat,
  parseIsoDuration,
} from "./video-filters";

/**
 * Radar REAL, em dois formatos:
 *
 * - "longform" (Radar principal — nossa operação é de vídeos longos):
 *   por categoria, DUAS buscas (videoDuration=medium e long → 4min+).
 *   8 categorias × 2 × 100 = 1.600u de busca (~1.620u no total).
 * - "shorts" (aba de fonte de ideias): UMA busca por categoria
 *   (videoDuration=short). 8 × 100 = 800u (~815u no total).
 *
 * Pós-filtros em ambos: duração real (contentDetails) + "#shorts" no
 * título + FILTRO RÍGIDO DE IDIOMA (script + stopwords) — vídeo fora
 * do idioma selecionado é descartado da amostra.
 *
 * Proteções de quota: cache de 12h por formato+idioma+país+janela e
 * teto diário compartilhado do Radar (RADAR_DAILY_QUOTA_BUDGET).
 */

/** CALIBRÁVEL: teto diário de unidades gastas pelo Radar (as 2 abas). */
export const RADAR_DAILY_QUOTA_BUDGET = 8_000;

/** Buscas por categoria, por formato (videoDuration da API). */
const FORMAT_DURATIONS: Record<
  RadarFormat,
  ReadonlyArray<"short" | "medium" | "long">
> = {
  // medium (4–20min) + long (>20min) = long-form 4min+
  longform: ["medium", "long"],
  shorts: ["short"],
};

/** Cache da varredura: 12h por formato+idioma+país+janela. */
const SWEEP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** CALIBRÁVEL: "canal em ascensão" = pequeno OU novo, com VPH alto. */
const RISING_MAX_SUBSCRIBERS = 100_000;
const RISING_MAX_CHANNEL_AGE_DAYS = 365;
const RISING_MIN_VPH = 10;

/** Mesma regra de outlier do coletor de análises. */
const OUTLIER_MULTIPLIER = 3;
const OUTLIER_MIN_VIEWS = 1_000;

const TRENDING_LIMIT = 15;
const RISING_LIMIT = 10;
const MIN_SWEEP_VIDEOS = 8;

/** ISO 639-1 aceito pelo relevanceLanguage (espelha o coletor). */
const RELEVANCE_LANGUAGE: Record<string, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
  it: "it",
  fr: "fr",
  de: "de",
};

function sweepCacheKey(
  input: RadarSweepInput,
  categories: readonly RadarCategoryConfig[]
): string {
  // v9: chave inclui hash do conjunto slug+semente do idioma —
  // editar/ativar categorias na tela ⚙️ invalida naturalmente.
  const catHash = createHash("sha256")
    .update(
      JSON.stringify(
        [...categories]
          .map((c) => [c.slug, c.seeds[input.language] ?? ""])
          .sort()
      )
    )
    .digest("hex")
    .slice(0, 10);
  return `radar:v9:${input.format}:${input.language}:${input.country}:${input.window}:${catHash}`;
}

/** Cap do payload de outliers persistido na varredura. */
const OUTLIER_VIDEOS_CAP = 120;

function quotaDayKey(): string {
  return `radar-quota:${new Date().toISOString().slice(0, 10)}`;
}

export async function getRadarQuotaSpentToday(): Promise<number> {
  const raw = await getApiCache(quotaDayKey());
  const parsed = raw === null ? 0 : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function addRadarQuotaSpent(units: number): Promise<void> {
  const spent = await getRadarQuotaSpentToday();
  await putApiCache(quotaDayKey(), String(spent + units), 48 * 3_600_000);
}

/** Início da janela, arredondado para baixo em blocos de 12h (UTC) —
 *  mantém as URLs estáveis para o cache de API reaproveitar chamadas. */
function windowStartIso(windowHours: number): string {
  const twelveHours = 12 * 3_600_000;
  const start = Date.now() - windowHours * 3_600_000;
  return new Date(Math.floor(start / twelveHours) * twelveHours).toISOString();
}

interface ChannelInfo {
  title: string;
  subscribers: number | null;
  avgViewsPerVideo: number;
  /** Total de vídeos publicados pelo canal (base da eficiência). */
  totalVideos: number;
  publishedAt: string | null;
}

function toChannelInfo(channel: YouTubeChannel): ChannelInfo {
  const stats = channel.statistics;
  const hidden = stats?.hiddenSubscriberCount === true;
  const subscribers = hidden ? null : Number(stats?.subscriberCount ?? NaN);
  const totalViews = Number(stats?.viewCount ?? 0);
  const videoCount = Math.max(1, Number(stats?.videoCount ?? 1));
  return {
    title: channel.snippet?.title ?? "(canal desconhecido)",
    subscribers: Number.isFinite(subscribers as number) ? subscribers : null,
    avgViewsPerVideo: totalViews / videoCount,
    totalVideos: videoCount,
    publishedAt: channel.snippet?.publishedAt ?? null,
  };
}

export class RadarYouTubeProvider implements RadarProvider {
  constructor(private readonly fallback: RadarProvider) {}

  async sweep(input: RadarSweepInput): Promise<RadarSweep> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return this.fallback.sweep(input);
    }

    // Categorias ATIVAS com semente para o idioma (tela ⚙️ Categorias).
    const active = await listActiveRadarCategories();
    const swept = active.filter((c) => (c.seeds[input.language] ?? "").trim());
    if (swept.length === 0) {
      // Nenhuma categoria ativa com semente para o idioma: varredura
      // vazia honesta (a tela ⚙️ Categorias orienta a ligar algo).
      return {
        language: input.language,
        country: input.country,
        window: input.window,
        format: input.format,
        sweptAt: new Date().toISOString(),
        source: "real",
        quotaUnits: 0,
        trendingVideos: [],
        risingChannels: [],
        heatingNiches: [],
        outlierVideos: [],
      };
    }

    // 1. Cache de varredura (12h) — a chave inclui o conjunto de
    //    sementes: editar/ativar categorias invalida naturalmente.
    const cacheKey = sweepCacheKey(input, swept);
    const cached = await getApiCache(cacheKey);
    if (cached !== null) {
      return { ...(JSON.parse(cached) as RadarSweep), quotaUnits: 0 };
    }

    // 2. Teto diário: estimativa proporcional às categorias ativas.
    const durations = FORMAT_DURATIONS[input.format];
    const estimated = swept.length * durations.length * 100 + 50;
    const spentToday = await getRadarQuotaSpentToday();
    if (spentToday + estimated > RADAR_DAILY_QUOTA_BUDGET) {
      throw new RadarBudgetExceededError(spentToday, RADAR_DAILY_QUOTA_BUDGET);
    }

    try {
      const sweep = await this.runSweep(input, swept, apiKey);
      await putApiCache(cacheKey, JSON.stringify(sweep), SWEEP_CACHE_TTL_MS);
      await addRadarQuotaSpent(sweep.quotaUnits);
      return sweep;
    } catch (error) {
      if (error instanceof RadarBudgetExceededError) throw error;
      console.warn(
        "[RadarYouTubeProvider] Varredura real falhou — usando o Radar mock.",
        error
      );
      return this.fallback.sweep(input);
    }
  }

  private async runSweep(
    input: RadarSweepInput,
    sweptCategories: readonly RadarCategoryConfig[],
    apiKey: string
  ): Promise<RadarSweep> {
    const ledger = createQuotaLedger();
    const windowHours =
      RADAR_WINDOWS.find((w) => w.key === input.window)?.hours ?? 168;
    const publishedAfter = windowStartIso(windowHours);
    const relevanceLanguage = RELEVANCE_LANGUAGE[input.language] ?? "en";
    const durations = FORMAT_DURATIONS[input.format];

    // categorias ativas × durações do formato, tudo em paralelo.
    const searches = await Promise.all(
      sweptCategories.flatMap((categoryConfig) =>
        durations.map((videoDuration) =>
          searchVideos(
            {
              query: categoryConfig.seeds[input.language] ?? "",
              relevanceLanguage,
              regionCode: input.country,
              order: "viewCount",
              publishedAfter,
              videoDuration,
            },
            apiKey,
            ledger
          ).then((response) => ({ category: categoryConfig.slug, response }))
        )
      )
    );

    // Dedup entre categorias: o vídeo fica na 1ª categoria que o achou.
    const categoryByVideoId = new Map<string, NicheCategory>();
    for (const { category, response } of searches) {
      for (const item of response.items ?? []) {
        const id = item.id?.videoId;
        if (id && !categoryByVideoId.has(id)) {
          categoryByVideoId.set(id, category);
        }
      }
    }
    const videoIds = [...categoryByVideoId.keys()];
    if (videoIds.length === 0) {
      throw new Error(
        `Varredura sem resultados (${input.format}/${input.language}/${input.country}/${input.window}).`
      );
    }

    const videos = await fetchVideos(videoIds, apiKey, ledger);

    // Pós-filtros: formato (duração real + #shorts), idioma RÍGIDO e
    // conteúdo infantil (madeForKids + heurística de título, RPM baixo).
    let kidsDiscarded = 0;
    const kept = videos.filter((video) => {
      const title = video.snippet?.title ?? "";
      const duration = parseIsoDuration(video.contentDetails?.duration);
      if (isKidsContent(title, video.status?.madeForKids)) {
        kidsDiscarded += 1;
        return false;
      }
      return (
        matchesFormat(input.format, duration, title) &&
        matchesLanguage(title, video.snippet?.description, input.language)
      );
    });
    const discarded = videos.length - kept.length;

    const channelIds = [
      ...new Set(
        kept
          .map((v) => v.snippet?.channelId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const channels = await fetchChannels(channelIds, apiKey, ledger);
    const channelById = new Map<string, ChannelInfo>();
    for (const channel of channels) {
      if (channel.id) channelById.set(channel.id, toChannelInfo(channel));
    }

    const now = Date.now();
    const radarVideos: RadarVideo[] = [];
    for (const video of kept) {
      const id = video.id;
      const channelId = video.snippet?.channelId;
      const publishedAtIso = video.snippet?.publishedAt;
      const viewsRaw = video.statistics?.viewCount;
      if (!id || !channelId || !publishedAtIso || viewsRaw === undefined) {
        continue;
      }
      const publishedMs = new Date(publishedAtIso).getTime();
      const views = Number(viewsRaw);
      if (Number.isNaN(publishedMs) || !Number.isFinite(views)) continue;

      const channel = channelById.get(channelId);
      const hours = Math.max(1, (now - publishedMs) / 3_600_000);
      const isOutlier =
        channel !== undefined &&
        channel.avgViewsPerVideo > 0 &&
        views >= OUTLIER_MIN_VIEWS &&
        views >= OUTLIER_MULTIPLIER * channel.avgViewsPerVideo;

      const title = video.snippet?.title ?? "(sem título)";
      const channelTitle =
        video.snippet?.channelTitle ?? "(canal desconhecido)";
      radarVideos.push({
        videoId: id,
        title,
        channelId,
        channelTitle,
        subscribers: channel?.subscribers ?? null,
        views,
        publishedAt: new Date(publishedMs).toISOString(),
        vph: Math.round((views / hours) * 10) / 10,
        isOutlier,
        isReplicable: classifyReplicable({
          title,
          channelTitle,
          description: video.snippet?.description,
          tags: video.snippet?.tags,
        }),
        category: categoryByVideoId.get(id) ?? "curiosidades",
      });
    }

    if (radarVideos.length < MIN_SWEEP_VIDEOS) {
      throw new Error(
        `Varredura com amostra insuficiente após filtros (${radarVideos.length} vídeos).`
      );
    }

    const sweep: RadarSweep = {
      language: input.language,
      country: input.country,
      window: input.window,
      format: input.format,
      sweptAt: new Date().toISOString(),
      source: "real",
      quotaUnits: ledger.units,
      // Replicáveis primeiro (nossa operação), depois por VPH.
      trendingVideos: [...radarVideos]
        .sort(
          (a, b) =>
            Number(b.isReplicable) - Number(a.isReplicable) || b.vph - a.vph
        )
        .slice(0, TRENDING_LIMIT),
      // Canais em ascensão fazem sentido para a operação long-form;
      // a aba Shorts é radar de temas, não de canais.
      risingChannels:
        input.format === "longform"
          ? buildRisingChannels(radarVideos, channelById, now)
          : [],
      heatingNiches: buildHeatingNiches(radarVideos),
      // Pool de sinal para Nichos/Canais: outliers primeiro (sinal mais
      // forte) + topo replicável por VPH — canais estabelecidos raramente
      // disparam a régua de outlier, mas ainda mapeiam temas quentes.
      outlierVideos:
        input.format === "longform"
          ? [
              ...radarVideos
                .filter((v) => v.isOutlier)
                .sort((a, b) => b.vph - a.vph),
              ...radarVideos
                .filter((v) => !v.isOutlier && v.isReplicable)
                .sort((a, b) => b.vph - a.vph),
            ].slice(0, OUTLIER_VIDEOS_CAP)
          : [],
    };

    console.info(
      `[RadarYouTubeProvider] Varredura ${input.format}/${input.language}/${input.country}/${input.window}: ` +
        `${ledger.units} unidades de quota, ${ledger.cacheHits} respostas do cache, ` +
        `${radarVideos.length} vídeos mantidos (${discarded} descartados: ${kidsDiscarded} infantis, ` +
        `${discarded - kidsDiscarded} formato/idioma; ` +
        `${radarVideos.filter((v) => v.isReplicable).length} replicáveis). ` +
        `Chamadas: ${ledger.calls.join(", ")}.`
    );

    return sweep;
  }
}

/**
 * ⚠️ CALIBRÁVEL — score de "acertou de primeira":
 * razão views/inscritos (log) × fator de poucos vídeos publicados ×
 * peso de recência do melhor sinal × boost por outlier na varredura.
 * Canais "grinder" (muitos vídeos, quase nenhum inscrito) são
 * EXCLUÍDOS por padrão — ver src/services/real/channel-quality.ts.
 */
function risingScore(input: {
  viewsPerSubscriber: number;
  totalVideos: number;
  newestVideoAgeDays: number;
  hasOutlier: boolean;
}): number {
  const ratioScore = Math.log10(input.viewsPerSubscriber + 1);
  const fewVideosFactor = 1 / Math.log10(input.totalVideos + 3);
  const recencyWeight =
    input.newestVideoAgeDays <= 7
      ? 1.5
      : input.newestVideoAgeDays <= 14
        ? 1.2
        : input.newestVideoAgeDays <= 30
          ? 1.0
          : 0.6;
  const outlierBoost = input.hasOutlier ? 1.5 : 1;
  return ratioScore * fewVideosFactor * recencyWeight * outlierBoost;
}

function buildRisingChannels(
  videos: readonly RadarVideo[],
  channelById: ReadonlyMap<string, ChannelInfo>,
  nowMs: number
): RadarChannel[] {
  const byChannel = new Map<
    string,
    {
      recentViews: number;
      bestVph: number;
      videoCount: number;
      replicableCount: number;
      hasOutlier: boolean;
      newestVideoMs: number;
    }
  >();
  for (const video of videos) {
    const entry = byChannel.get(video.channelId) ?? {
      recentViews: 0,
      bestVph: 0,
      videoCount: 0,
      replicableCount: 0,
      hasOutlier: false,
      newestVideoMs: 0,
    };
    entry.recentViews += video.views;
    entry.bestVph = Math.max(entry.bestVph, video.vph);
    entry.videoCount += 1;
    if (video.isReplicable) entry.replicableCount += 1;
    if (video.isOutlier) entry.hasOutlier = true;
    entry.newestVideoMs = Math.max(
      entry.newestVideoMs,
      new Date(video.publishedAt).getTime()
    );
    byChannel.set(video.channelId, entry);
  }

  const rising: Array<RadarChannel & { score: number }> = [];
  for (const [channelId, agg] of byChannel) {
    const info = channelById.get(channelId);
    // Sem contagem de inscritos não há razão views/inscritos — pula.
    if (!info || info.subscribers === null || info.subscribers <= 0) continue;
    // Grinder sem tração: o formato dele já provou que não funciona.
    if (isGrinderChannel(info.totalVideos, info.subscribers)) continue;

    const ageDays = info.publishedAt
      ? (nowMs - new Date(info.publishedAt).getTime()) / 86_400_000
      : Number.POSITIVE_INFINITY;
    const isSmall = info.subscribers <= RISING_MAX_SUBSCRIBERS;
    const isYoung = ageDays <= RISING_MAX_CHANNEL_AGE_DAYS;
    if (!isSmall && !isYoung) continue;
    if (agg.bestVph < RISING_MIN_VPH) continue;

    const viewsPerSubscriber =
      Math.round((agg.recentViews / info.subscribers) * 10) / 10;
    const newestVideoAgeDays = agg.newestVideoMs
      ? (nowMs - agg.newestVideoMs) / 86_400_000
      : 90;

    rising.push({
      channelId,
      channelTitle: info.title,
      subscribers: info.subscribers,
      totalVideos: info.totalVideos,
      channelPublishedAt: info.publishedAt,
      recentViews: agg.recentViews,
      bestVph: agg.bestVph,
      videoCount: agg.videoCount,
      viewsPerSubscriber,
      // Canal replicável = maioria dos vídeos amostrados é dark-friendly.
      isReplicable: agg.replicableCount * 2 >= agg.videoCount,
      score: risingScore({
        viewsPerSubscriber,
        totalVideos: info.totalVideos,
        newestVideoAgeDays,
        hasOutlier: agg.hasOutlier,
      }),
    });
  }

  // Replicáveis primeiro (nossa operação), depois pelo score de
  // "acertou de primeira" (poucos vídeos + outlier recente + razão alta).
  return rising
    .sort(
      (a, b) =>
        Number(b.isReplicable) - Number(a.isReplicable) || b.score - a.score
    )
    .slice(0, RISING_LIMIT)
    .map(({ score: _score, ...channel }) => channel);
}

function buildHeatingNiches(videos: readonly RadarVideo[]): RadarNiche[] {
  const byCategory = new Map<NicheCategory, RadarNiche>();
  for (const video of videos) {
    const niche = byCategory.get(video.category) ?? {
      category: video.category,
      outlierCount: 0,
      replicableOutlierCount: 0,
      sampleCount: 0,
      topOutlierTitle: null,
      topOutlierVideoId: null,
    };
    niche.sampleCount += 1;
    if (video.isOutlier) {
      niche.outlierCount += 1;
      if (video.isReplicable) niche.replicableOutlierCount += 1;
    }
    byCategory.set(video.category, niche);
  }

  // Exemplo por categoria: o melhor outlier, preferindo replicáveis.
  for (const niche of byCategory.values()) {
    const top = videos
      .filter((v) => v.category === niche.category && v.isOutlier)
      .sort(
        (a, b) =>
          Number(b.isReplicable) - Number(a.isReplicable) || b.vph - a.vph
      )[0];
    if (top) {
      niche.topOutlierTitle = top.title;
      niche.topOutlierVideoId = top.videoId;
    }
  }

  return [...byCategory.values()].sort(
    (a, b) => b.outlierCount - a.outlierCount || b.sampleCount - a.sampleCount
  );
}
