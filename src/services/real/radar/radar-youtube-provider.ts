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
import {
  createQuotaLedger,
  fetchChannels,
  fetchVideos,
  searchVideos,
  type YouTubeChannel,
} from "../data-collector/youtube-api";
import { matchesLanguage } from "./language-filter";
import { RADAR_SEED_QUERIES } from "./seed-queries";
import { matchesFormat, parseIsoDuration } from "./video-filters";

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

/** Estimativas conservadoras por formato (pré-checagem do teto). */
const ESTIMATED_UNITS: Record<RadarFormat, number> = {
  longform: 1_650,
  shorts: 850,
};

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

function sweepCacheKey(input: RadarSweepInput): string {
  return `radar:v2:${input.format}:${input.language}:${input.country}:${input.window}`;
}

function quotaDayKey(): string {
  return `radar-quota:${new Date().toISOString().slice(0, 10)}`;
}

async function getRadarQuotaSpentToday(): Promise<number> {
  const raw = await getApiCache(quotaDayKey());
  const parsed = raw === null ? 0 : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function addRadarQuotaSpent(units: number): Promise<void> {
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

    // 1. Cache de varredura (12h): olhar de novo custa 0 unidades.
    const cacheKey = sweepCacheKey(input);
    const cached = await getApiCache(cacheKey);
    if (cached !== null) {
      return { ...(JSON.parse(cached) as RadarSweep), quotaUnits: 0 };
    }

    // 2. Teto diário: nunca deixar o Radar consumir o dia inteiro.
    const spentToday = await getRadarQuotaSpentToday();
    if (spentToday + ESTIMATED_UNITS[input.format] > RADAR_DAILY_QUOTA_BUDGET) {
      throw new RadarBudgetExceededError(spentToday, RADAR_DAILY_QUOTA_BUDGET);
    }

    try {
      const sweep = await this.runSweep(input, apiKey);
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
    apiKey: string
  ): Promise<RadarSweep> {
    const ledger = createQuotaLedger();
    const seeds = RADAR_SEED_QUERIES[input.language];
    const windowHours =
      RADAR_WINDOWS.find((w) => w.key === input.window)?.hours ?? 168;
    const publishedAfter = windowStartIso(windowHours);
    const relevanceLanguage = RELEVANCE_LANGUAGE[input.language] ?? "en";
    const durations = FORMAT_DURATIONS[input.format];

    // categorias × durações do formato, tudo em paralelo.
    const categories = Object.keys(seeds) as NicheCategory[];
    const searches = await Promise.all(
      categories.flatMap((category) =>
        durations.map((videoDuration) =>
          searchVideos(
            {
              query: seeds[category],
              relevanceLanguage,
              regionCode: input.country,
              order: "viewCount",
              publishedAfter,
              videoDuration,
            },
            apiKey,
            ledger
          ).then((response) => ({ category, response }))
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

    // Pós-filtros: formato (duração real + #shorts) e idioma RÍGIDO.
    const kept = videos.filter((video) => {
      const title = video.snippet?.title ?? "";
      const duration = parseIsoDuration(video.contentDetails?.duration);
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

      radarVideos.push({
        videoId: id,
        title: video.snippet?.title ?? "(sem título)",
        channelId,
        channelTitle: video.snippet?.channelTitle ?? "(canal desconhecido)",
        subscribers: channel?.subscribers ?? null,
        views,
        publishedAt: new Date(publishedMs).toISOString(),
        vph: Math.round((views / hours) * 10) / 10,
        isOutlier,
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
      trendingVideos: [...radarVideos]
        .sort((a, b) => b.vph - a.vph)
        .slice(0, TRENDING_LIMIT),
      // Canais em ascensão fazem sentido para a operação long-form;
      // a aba Shorts é radar de temas, não de canais.
      risingChannels:
        input.format === "longform"
          ? buildRisingChannels(radarVideos, channelById, now)
          : [],
      heatingNiches: buildHeatingNiches(radarVideos),
    };

    console.info(
      `[RadarYouTubeProvider] Varredura ${input.format}/${input.language}/${input.country}/${input.window}: ` +
        `${ledger.units} unidades de quota, ${ledger.cacheHits} respostas do cache, ` +
        `${radarVideos.length} vídeos mantidos (${discarded} descartados por formato/idioma). ` +
        `Chamadas: ${ledger.calls.join(", ")}.`
    );

    return sweep;
  }
}

function buildRisingChannels(
  videos: readonly RadarVideo[],
  channelById: ReadonlyMap<string, ChannelInfo>,
  nowMs: number
): RadarChannel[] {
  const byChannel = new Map<
    string,
    { recentViews: number; bestVph: number; videoCount: number }
  >();
  for (const video of videos) {
    const entry = byChannel.get(video.channelId) ?? {
      recentViews: 0,
      bestVph: 0,
      videoCount: 0,
    };
    entry.recentViews += video.views;
    entry.bestVph = Math.max(entry.bestVph, video.vph);
    entry.videoCount += 1;
    byChannel.set(video.channelId, entry);
  }

  const rising: RadarChannel[] = [];
  for (const [channelId, agg] of byChannel) {
    const info = channelById.get(channelId);
    // Sem contagem de inscritos não há razão views/inscritos — pula.
    if (!info || info.subscribers === null || info.subscribers <= 0) continue;

    const ageDays = info.publishedAt
      ? (nowMs - new Date(info.publishedAt).getTime()) / 86_400_000
      : Number.POSITIVE_INFINITY;
    const isSmall = info.subscribers <= RISING_MAX_SUBSCRIBERS;
    const isYoung = ageDays <= RISING_MAX_CHANNEL_AGE_DAYS;
    if (!isSmall && !isYoung) continue;
    if (agg.bestVph < RISING_MIN_VPH) continue;

    rising.push({
      channelId,
      channelTitle: info.title,
      subscribers: info.subscribers,
      channelPublishedAt: info.publishedAt,
      recentViews: agg.recentViews,
      bestVph: agg.bestVph,
      videoCount: agg.videoCount,
      viewsPerSubscriber:
        Math.round((agg.recentViews / info.subscribers) * 10) / 10,
    });
  }

  return rising
    .sort((a, b) => b.viewsPerSubscriber - a.viewsPerSubscriber)
    .slice(0, RISING_LIMIT);
}

function buildHeatingNiches(videos: readonly RadarVideo[]): RadarNiche[] {
  const byCategory = new Map<NicheCategory, RadarNiche>();
  for (const video of videos) {
    const niche = byCategory.get(video.category) ?? {
      category: video.category,
      outlierCount: 0,
      sampleCount: 0,
      topOutlierTitle: null,
      topOutlierVideoId: null,
    };
    niche.sampleCount += 1;
    if (video.isOutlier) niche.outlierCount += 1;
    byCategory.set(video.category, niche);
  }

  // Melhor outlier (maior VPH) por categoria, como exemplo concreto.
  for (const niche of byCategory.values()) {
    const top = videos
      .filter((v) => v.category === niche.category && v.isOutlier)
      .sort((a, b) => b.vph - a.vph)[0];
    if (top) {
      niche.topOutlierTitle = top.title;
      niche.topOutlierVideoId = top.videoId;
    }
  }

  return [...byCategory.values()].sort(
    (a, b) => b.outlierCount - a.outlierCount || b.sampleCount - a.sampleCount
  );
}
