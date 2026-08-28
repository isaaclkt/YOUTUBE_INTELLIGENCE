import type { RawVideoStats } from "../../contracts";
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

interface VideoSample {
  views: number;
  vph: number;
  engagement: number;
  publishedAt: Date;
  channelId: string;
}

interface ChannelSample {
  subscribers: number | null;
  avgViewsPerVideo: number;
}

function toVideoSample(video: YouTubeVideo, now: Date): VideoSample | null {
  const publishedAtIso = video.snippet?.publishedAt;
  const channelId = video.snippet?.channelId;
  const viewsRaw = video.statistics?.viewCount;
  if (!publishedAtIso || !channelId || viewsRaw === undefined) return null;

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

  return {
    views,
    vph: views / hoursSincePublish,
    // Cap em 0.5: engajamento acima disso é quase sempre anomalia.
    engagement: Math.min(0.5, (likes + comments) / Math.max(views, 1)),
    publishedAt,
    channelId,
  };
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

export function deriveVideoStats(input: {
  videos: readonly YouTubeVideo[];
  channels: readonly YouTubeChannel[];
  /** Datas de publicação da busca ordenada por data (cadência). */
  newestPublishDates: readonly Date[];
  searchTotalResults: number | undefined;
  now: Date;
}): RawVideoStats {
  const { videos, channels, newestPublishDates, searchTotalResults, now } =
    input;

  const sample = videos
    .map((v) => toVideoSample(v, now))
    .filter((v): v is VideoSample => v !== null);

  const channelById = new Map<string, ChannelSample>();
  for (const channel of channels) {
    if (channel.id) channelById.set(channel.id, toChannelSample(channel));
  }

  const views = sample.map((v) => v.views);
  const vphs = sample.map((v) => v.vph);

  const recentCutoff = now.getTime() - RECENT_WINDOW_DAYS * 24 * 3_600_000;
  const recentVphs = sample
    .filter((v) => v.publishedAt.getTime() >= recentCutoff)
    .map((v) => v.vph);

  // Concentração: fatia de views do canal com mais views na amostra.
  const viewsByChannel = new Map<string, number>();
  for (const v of sample) {
    viewsByChannel.set(v.channelId, (viewsByChannel.get(v.channelId) ?? 0) + v.views);
  }
  const totalViews = views.reduce((sum, v) => sum + v, 0);
  const dominantChannelShare =
    totalViews > 0 ? Math.max(...viewsByChannel.values()) / totalViews : 0;

  // Canais fortes: fração da amostra publicada por canais grandes.
  const strongVideos = sample.filter((v) => {
    const channel = channelById.get(v.channelId);
    return (
      channel !== undefined &&
      channel.subscribers !== null &&
      channel.subscribers >= STRONG_CHANNEL_SUBSCRIBERS
    );
  });

  // Outliers: vídeos performando muito acima da média do próprio canal.
  const outliers = sample.filter((v) => {
    const channel = channelById.get(v.channelId);
    if (!channel || channel.avgViewsPerVideo <= 0) return false;
    return (
      v.views >= OUTLIER_MIN_VIEWS &&
      v.views >= OUTLIER_MULTIPLIER * channel.avgViewsPerVideo
    );
  });

  const knownSubscribers = [...channelById.values()]
    .map((c) => c.subscribers)
    .filter((s): s is number => s !== null);

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    videoCount: Math.min(
      Math.max(searchTotalResults ?? sample.length, sample.length),
      VIDEO_COUNT_CAP
    ),
    sampleSize: sample.length,
    avgViews: Math.round(mean(views)),
    medianViews: Math.round(median(views)),
    avgEngagementRate: Math.round(mean(sample.map((v) => v.engagement)) * 1000) / 1000,
    medianVph: round1(median(vphs)),
    recentMedianVph: round1(
      recentVphs.length >= 5 ? median(recentVphs) : median(vphs)
    ),
    outlierRatio:
      sample.length > 0
        ? Math.round((outliers.length / sample.length) * 100) / 100
        : 0,
    channelCount: viewsByChannel.size,
    dominantChannelShare: Math.round(dominantChannelShare * 100) / 100,
    strongChannelShare:
      sample.length > 0
        ? Math.round((strongVideos.length / sample.length) * 100) / 100
        : 0,
    medianSubscribers: Math.round(median(knownSubscribers)),
    recentUploadsPerWeek: deriveUploadsPerWeek(newestPublishDates, now),
  };
}
