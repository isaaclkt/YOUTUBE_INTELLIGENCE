import type { SampleVideo } from "@/domain";
import type { RawVideoStats } from "../../contracts";
import { parseIsoDuration } from "../radar/video-filters";
import type { YouTubeChannel, YouTubeVideo } from "./youtube-api";

/**
 * Derivação das métricas reais a partir da amostra da YouTube Data API.
 * Funções puras — sem rede, sem chave, fáceis de testar.
 *
 * Limiares marcados como CALIBRÁVEIS são pontos de partida razoáveis,
 * a revisar quando houver histórico de análises reais.
 */

/** CALIBRÁVEL: canal "forte" = 100 mil inscritos ou mais. */
const STRONG_CHANNEL_SUBSCRIBERS = 100_000;
/** CALIBRÁVEL: outlier = vídeo com ≥3× a média de views do próprio canal. */
const OUTLIER_MULTIPLIER = 3;
/** Piso de views para contar como outlier (evita ruído de canais minúsculos). */
const OUTLIER_MIN_VIEWS = 1_000;
/** Janela de "recente" para o VPH recente. */
const RECENT_WINDOW_DAYS = 90;
/** totalResults da busca é aproximado — usar só como ordem de grandeza. */
const VIDEO_COUNT_CAP = 1_000_000;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

interface ChannelSample {
  subscribers: number | null;
  avgViewsPerVideo: number;
}

/** Vídeo da amostra + dados internos que não vão para a UI. */
interface EnrichedVideo extends SampleVideo {
  engagement: number;
  publishedAtMs: number;
  channelId: string;
}

function toChannelSample(channel: YouTubeChannel): ChannelSample {
  const stats = channel.statistics;
  const hidden = stats?.hiddenSubscriberCount === true;
  const subscribers = hidden ? null : Number(stats?.subscriberCount ?? NaN);
  const totalViews = Number(stats?.viewCount ?? 0);
  const videoCount = Math.max(1, Number(stats?.videoCount ?? 1));
  return {
    subscribers: Number.isFinite(subscribers as number) ? subscribers : null,
    avgViewsPerVideo: totalViews / videoCount,
  };
}

function toEnrichedVideo(
  video: YouTubeVideo,
  channelById: ReadonlyMap<string, ChannelSample>,
  now: Date
): EnrichedVideo | null {
  const publishedAtIso = video.snippet?.publishedAt;
  const channelId = video.snippet?.channelId;
  const viewsRaw = video.statistics?.viewCount;
  if (!video.id || !publishedAtIso || !channelId || viewsRaw === undefined) {
    return null;
  }

  const publishedAt = new Date(publishedAtIso);
  if (Number.isNaN(publishedAt.getTime())) return null;

  const views = Number(viewsRaw);
  const likes = Number(video.statistics?.likeCount ?? 0);
  const comments = Number(video.statistics?.commentCount ?? 0);
  if (!Number.isFinite(views)) return null;

  const hoursSincePublish = Math.max(
    1,
    (now.getTime() - publishedAt.getTime()) / 3_600_000
  );

  const channel = channelById.get(channelId);
  const isStrongChannel =
    channel !== undefined &&
    channel.subscribers !== null &&
    channel.subscribers >= STRONG_CHANNEL_SUBSCRIBERS;
  const isOutlier =
    channel !== undefined &&
    channel.avgViewsPerVideo > 0 &&
    views >= OUTLIER_MIN_VIEWS &&
    views >= OUTLIER_MULTIPLIER * channel.avgViewsPerVideo;

  const durationSeconds = parseIsoDuration(video.contentDetails?.duration);

  return {
    videoId: video.id,
    title: video.snippet?.title ?? "(sem título)",
    channelTitle: video.snippet?.channelTitle ?? "(canal desconhecido)",
    subscribers: channel?.subscribers ?? null,
    views,
    publishedAt: publishedAt.toISOString(),
    vph: Math.round((views / hoursSincePublish) * 10) / 10,
    ...(durationSeconds > 0 ? { durationSeconds } : {}),
    isOutlier,
    isStrongChannel,
    // internos:
    engagement: Math.min(0.5, (likes + comments) / Math.max(views, 1)),
    publishedAtMs: publishedAt.getTime(),
    channelId,
  };
}

/** Cadência de uploads: N vídeos mais novos ÷ semanas que eles cobrem. */
export function deriveUploadsPerWeek(
  newestPublishDates: readonly Date[],
  now: Date
): number {
  if (newestPublishDates.length === 0) return 0;
  if (newestPublishDates.length === 1) return 1;
  const oldest = Math.min(...newestPublishDates.map((d) => d.getTime()));
  const spanWeeks = Math.max(
    0.25,
    (now.getTime() - oldest) / (7 * 24 * 3_600_000)
  );
  return Math.round((newestPublishDates.length / spanWeeks) * 10) / 10;
}

export interface DerivedSample {
  stats: RawVideoStats;
  /** Amostra por vídeo (sem os campos internos), para UI e persistência. */
  sampleVideos: SampleVideo[];
}

export function deriveVideoStats(input: {
  videos: readonly YouTubeVideo[];
  channels: readonly YouTubeChannel[];
  /** Datas de publicação da busca ordenada por data (cadência). */
  newestPublishDates: readonly Date[];
  searchTotalResults: number | undefined;
  now: Date;
}): DerivedSample {
  const { videos, channels, newestPublishDates, searchTotalResults, now } =
    input;

  const channelById = new Map<string, ChannelSample>();
  for (const channel of channels) {
    if (channel.id) channelById.set(channel.id, toChannelSample(channel));
  }

  const sample = videos
    .map((v) => toEnrichedVideo(v, channelById, now))
    .filter((v): v is EnrichedVideo => v !== null);

  const views = sample.map((v) => v.views);
  const vphs = sample.map((v) => v.vph);

  const recentCutoff = now.getTime() - RECENT_WINDOW_DAYS * 24 * 3_600_000;
  const recentVphs = sample
    .filter((v) => v.publishedAtMs >= recentCutoff)
    .map((v) => v.vph);

  // Concentração: fatia de views do canal com mais views na amostra.
  const viewsByChannel = new Map<string, number>();
  for (const v of sample) {
    viewsByChannel.set(
      v.channelId,
      (viewsByChannel.get(v.channelId) ?? 0) + v.views
    );
  }
  const totalViews = views.reduce((sum, v) => sum + v, 0);
  const dominantChannelShare =
    totalViews > 0 ? Math.max(...viewsByChannel.values()) / totalViews : 0;

  const knownSubscribers = [...channelById.values()]
    .map((c) => c.subscribers)
    .filter((s): s is number => s !== null);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const ratio = (count: number) =>
    sample.length > 0 ? Math.round((count / sample.length) * 100) / 100 : 0;

  const stats: RawVideoStats = {
    videoCount: Math.min(
      Math.max(searchTotalResults ?? sample.length, sample.length),
      VIDEO_COUNT_CAP
    ),
    sampleSize: sample.length,
    avgViews: Math.round(mean(views)),
    medianViews: Math.round(median(views)),
    avgEngagementRate:
      Math.round(mean(sample.map((v) => v.engagement)) * 1000) / 1000,
    medianVph: round1(median(vphs)),
    recentMedianVph: round1(
      recentVphs.length >= 5 ? median(recentVphs) : median(vphs)
    ),
    outlierRatio: ratio(sample.filter((v) => v.isOutlier).length),
    channelCount: viewsByChannel.size,
    dominantChannelShare: Math.round(dominantChannelShare * 100) / 100,
    strongChannelShare: ratio(sample.filter((v) => v.isStrongChannel).length),
    medianSubscribers: Math.round(median(knownSubscribers)),
    recentUploadsPerWeek: deriveUploadsPerWeek(newestPublishDates, now),
  };

  const sampleVideos: SampleVideo[] = sample.map(
    ({ engagement: _e, publishedAtMs: _p, channelId: _c, ...video }) => video
  );

  return { stats, sampleVideos };
}
