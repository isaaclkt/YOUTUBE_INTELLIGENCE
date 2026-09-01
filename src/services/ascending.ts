import type {
  AscendingChannel,
  AscendingReport,
  CountryCode,
  LanguageCode,
  NicheCategory,
  RadarSweep,
  RadarWindow,
} from "@/domain";
import { getApiCache, putApiCache } from "@/lib/repository";
import { LONGFORM_MIN_SECONDS, SHORTS_TITLE_TAG } from "@/lib/video-format";
import { RadarBudgetExceededError } from "./contracts";
import type { RadarOutcome } from "./radar";
import { runRadarSweep } from "./radar";
import { isGrinderChannel } from "./real/channel-quality";
import {
  createQuotaLedger,
  fetchChannels,
  fetchChannelUploads,
  fetchVideos,
} from "./real/data-collector/youtube-api";
import {
  addRadarQuotaSpent,
  getRadarQuotaSpentToday,
  RADAR_DAILY_QUOTA_BUDGET,
} from "./real/radar/radar-youtube-provider";
import { parseIsoDuration } from "./real/radar/video-filters";
import { between, createRng, intBetween } from "./mock/seeded-random";

/**
 * ============================================================
 * ⚠️  ABA "CANAIS EM ASCENSÃO" — constantes CALIBRÁVEIS
 *
 * Diferente do bloco "canais novos explodindo" (1 outlier isolado):
 * aqui buscamos CONSISTÊNCIA — múltiplos vídeos recentes performando.
 * Custo por canal avaliado ≈ 1u (playlistItems.list) + rateio do
 * videos.list (~0,3u). Avaliação limitada a ASC_MAX_CHANNELS por
 * varredura; candidatos vêm dos outliers já em cache do Radar.
 * O gasto entra no teto diário do Radar.
 * ============================================================
 */
export const ASC_MAX_SUBSCRIBERS = 300_000;
export const ASC_MAX_CHANNEL_AGE_MONTHS = 24;
export const ASC_MAX_CHANNELS_EVALUATED = 8;
const ASC_UPLOADS_FETCHED = 15;
const ASC_VIDEOS_EVALUATED = 10;
export const ASC_MIN_VIEWS_HIT = 2_000;
export const ASC_MIN_HITS = 3;
const ASC_RECENT_WEEKS = 8;
const REPORT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const ASC_ESTIMATED_UNITS = 60;

export type AscendingOutcome =
  | { status: "ok"; report: AscendingReport }
  | { status: "budget_exceeded"; spentToday: number; budget: number };

interface Candidate {
  channelId: string;
  channelTitle: string;
  category: NicheCategory;
  isReplicable: boolean;
  outlierCount: number;
}

/** Candidatos: canais com outlier na varredura, dark primeiro. */
function pickCandidates(sweep: RadarSweep): Candidate[] {
  const byChannel = new Map<string, Candidate>();
  for (const video of sweep.outlierVideos ?? []) {
    const existing = byChannel.get(video.channelId);
    if (existing) {
      existing.outlierCount += 1;
      if (video.isReplicable) existing.isReplicable = true;
    } else {
      byChannel.set(video.channelId, {
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        category: video.category,
        isReplicable: video.isReplicable,
        outlierCount: 1,
      });
    }
  }
  return [...byChannel.values()].sort(
    (a, b) =>
      Number(b.isReplicable) - Number(a.isReplicable) ||
      b.outlierCount - a.outlierCount
  );
}

export async function runAscendingChannels(params: {
  language: LanguageCode;
  country: CountryCode;
  window: RadarWindow;
}): Promise<AscendingOutcome> {
  const cacheKey = `canais:v1:${params.language}:${params.country}:${params.window}`;
  const cached = await getApiCache(cacheKey);
  if (cached !== null) {
    const report = JSON.parse(cached) as AscendingReport;
    return { status: "ok", report: { ...report, quotaUnits: 0 } };
  }

  const outcome: RadarOutcome = await runRadarSweep({
    ...params,
    format: "longform",
  });
  if (outcome.status !== "ok") return outcome;
  const sweep = outcome.sweep;

  const apiKey = process.env.YOUTUBE_API_KEY;
  let report: AscendingReport;
  try {
    report =
      !apiKey || sweep.source === "mock"
        ? buildMockReport(params, sweep)
        : await evaluateReal(params, sweep, apiKey);
  } catch (error) {
    if (error instanceof RadarBudgetExceededError) {
      return {
        status: "budget_exceeded",
        spentToday: error.spentToday,
        budget: error.budget,
      };
    }
    throw error;
  }

  if (report.source === "real") {
    await putApiCache(cacheKey, JSON.stringify(report), REPORT_CACHE_TTL_MS);
  }
  return { status: "ok", report };
}

async function evaluateReal(
  params: { language: LanguageCode; country: CountryCode; window: RadarWindow },
  sweep: RadarSweep,
  apiKey: string
): Promise<AscendingReport> {
  // Respeita o teto diário do Radar (avaliação é barata, mas conta).
  const spentToday = await getRadarQuotaSpentToday();
  if (spentToday + ASC_ESTIMATED_UNITS > RADAR_DAILY_QUOTA_BUDGET) {
    throw new RadarBudgetExceededError(spentToday, RADAR_DAILY_QUOTA_BUDGET);
  }

  const ledger = createQuotaLedger();
  const candidates = pickCandidates(sweep);
  if (candidates.length === 0) {
    return emptyReport(params, "real", 0);
  }

  // 1. Estatísticas dos canais candidatos (1u por lote de 50).
  const channelStats = await fetchChannels(
    candidates.map((c) => c.channelId).slice(0, 50),
    apiKey,
    ledger
  );
  const statsById = new Map(
    channelStats
      .filter((c) => c.id)
      .map((c) => {
        const stats = c.statistics;
        const hidden = stats?.hiddenSubscriberCount === true;
        const subs = hidden ? null : Number(stats?.subscriberCount ?? NaN);
        return [
          c.id as string,
          {
            subscribers: Number.isFinite(subs as number)
              ? (subs as number)
              : null,
            totalVideos: Math.max(1, Number(stats?.videoCount ?? 1)),
            publishedAt: c.snippet?.publishedAt ?? null,
          },
        ] as const;
      })
  );

  // 2. Triagem: dark, não-grinder, novo (≤24 meses) OU médio (≤300k).
  const nowMs = Date.now();
  const screened = candidates.filter((candidate) => {
    const stats = statsById.get(candidate.channelId);
    if (!stats || stats.subscribers === null || stats.subscribers <= 0) {
      return false;
    }
    if (!candidate.isReplicable) return false;
    if (isGrinderChannel(stats.totalVideos, stats.subscribers)) return false;
    const ageMonths = stats.publishedAt
      ? (nowMs - new Date(stats.publishedAt).getTime()) / (30.44 * 86_400_000)
      : Number.POSITIVE_INFINITY;
    return (
      stats.subscribers <= ASC_MAX_SUBSCRIBERS ||
      ageMonths <= ASC_MAX_CHANNEL_AGE_MONTHS
    );
  });
  const evaluated = screened.slice(0, ASC_MAX_CHANNELS_EVALUATED);

  // 3. Uploads recentes por canal (1u cada) + estatísticas em lote.
  const uploadsByChannel = new Map<string, string[]>();
  await Promise.all(
    evaluated.map(async (candidate) => {
      if (!candidate.channelId.startsWith("UC")) return;
      try {
        const uploads = await fetchChannelUploads(
          candidate.channelId,
          ASC_UPLOADS_FETCHED,
          apiKey,
          ledger
        );
        uploadsByChannel.set(
          candidate.channelId,
          (uploads.items ?? [])
            .map((item) => item.contentDetails?.videoId)
            .filter((id): id is string => Boolean(id))
        );
      } catch (error) {
        console.warn(
          `[Canais] uploads de ${candidate.channelTitle} falharam — pulando.`,
          error
        );
      }
    })
  );
  const allVideoIds = [...uploadsByChannel.values()].flat();
  const videoStats = allVideoIds.length
    ? await fetchVideos(allVideoIds, apiKey, ledger)
    : [];
  const videoById = new Map(
    videoStats.filter((v) => v.id).map((v) => [v.id as string, v])
  );

  // 4. Consistência por canal.
  const recentCutoff = nowMs - ASC_RECENT_WEEKS * 7 * 86_400_000;
  const channels: AscendingChannel[] = [];
  for (const candidate of evaluated) {
    const stats = statsById.get(candidate.channelId);
    const uploadIds = uploadsByChannel.get(candidate.channelId) ?? [];
    if (!stats || uploadIds.length === 0) continue;

    const longForm = uploadIds
      .map((id) => videoById.get(id))
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .filter((v) => {
        const duration = parseIsoDuration(v.contentDetails?.duration);
        const title = v.snippet?.title ?? "";
        return duration >= LONGFORM_MIN_SECONDS && !SHORTS_TITLE_TAG.test(title);
      })
      .slice(0, ASC_VIDEOS_EVALUATED);
    if (longForm.length === 0) continue;

    const views = (v: (typeof longForm)[number]) =>
      Number(v.statistics?.viewCount ?? 0);
    const publishedMs = (v: (typeof longForm)[number]) =>
      new Date(v.snippet?.publishedAt ?? 0).getTime();

    const hits = longForm.filter((v) => views(v) >= ASC_MIN_VIEWS_HIT);
    const recentHits = hits.filter((v) => publishedMs(v) >= recentCutoff);
    // Consistência de verdade: múltiplos hits RECENTES, não viral velho.
    if (recentHits.length < ASC_MIN_HITS) continue;

    const recent = longForm.filter((v) => publishedMs(v) >= recentCutoff);
    const dates = longForm.map(publishedMs).filter((ms) => ms > 0);
    const spanWeeks =
      dates.length >= 2
        ? Math.max(0.5, (Math.max(...dates) - Math.min(...dates)) / (7 * 86_400_000))
        : 1;

    channels.push({
      channelId: candidate.channelId,
      channelTitle: candidate.channelTitle,
      subscribers: stats.subscribers as number,
      totalVideos: stats.totalVideos,
      channelPublishedAt: stats.publishedAt,
      category: candidate.category,
      isReplicable: candidate.isReplicable,
      evaluatedVideos: longForm.length,
      hitCount: hits.length,
      hitRate: Math.round((hits.length / longForm.length) * 100) / 100,
      avgRecentViews:
        recent.length > 0
          ? Math.round(recent.reduce((s, v) => s + views(v), 0) / recent.length)
          : 0,
      uploadsPerWeek: Math.round((longForm.length / spanWeeks) * 10) / 10,
      lastUploadAt:
        dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
    });
  }

  channels.sort(
    (a, b) => b.hitCount - a.hitCount || b.avgRecentViews - a.avgRecentViews
  );
  await addRadarQuotaSpent(ledger.units);
  console.info(
    `[Canais] ${params.language}/${params.country}/${params.window}: ` +
      `${evaluated.length} canais avaliados, ${channels.length} consistentes, ` +
      `${ledger.units} unidades. Chamadas: ${ledger.calls.join(", ")}.`
  );

  return {
    language: params.language,
    country: params.country,
    window: params.window,
    source: "real",
    checkedAt: new Date().toISOString(),
    quotaUnits: ledger.units,
    channels,
  };
}

function emptyReport(
  params: { language: LanguageCode; country: CountryCode; window: RadarWindow },
  source: "real" | "mock",
  quotaUnits: number
): AscendingReport {
  return {
    ...params,
    source,
    checkedAt: new Date().toISOString(),
    quotaUnits,
    channels: [],
  };
}

/** Demonstração determinística quando não há chave/dados reais. */
function buildMockReport(
  params: { language: LanguageCode; country: CountryCode; window: RadarWindow },
  sweep: RadarSweep
): AscendingReport {
  const channels: AscendingChannel[] = pickCandidates(sweep)
    .slice(0, 6)
    .map((candidate) => {
      const rng = createRng(`asc|${candidate.channelId}`);
      const evaluatedVideos = intBetween(rng, 6, 10);
      const hitCount = intBetween(rng, 3, evaluatedVideos);
      return {
        channelId: candidate.channelId,
        channelTitle: candidate.channelTitle,
        subscribers: intBetween(rng, 2_000, 250_000),
        totalVideos: intBetween(rng, 5, 60),
        channelPublishedAt: new Date(
          Date.now() - intBetween(rng, 60, 700) * 86_400_000
        ).toISOString(),
        category: candidate.category,
        isReplicable: candidate.isReplicable,
        evaluatedVideos,
        hitCount,
        hitRate: Math.round((hitCount / evaluatedVideos) * 100) / 100,
        avgRecentViews: Math.round(10 ** between(rng, 3.5, 5.5)),
        uploadsPerWeek: Math.round(between(rng, 0.5, 4) * 10) / 10,
        lastUploadAt: new Date(
          Date.now() - intBetween(rng, 1, 12) * 86_400_000
        ).toISOString(),
      };
    })
    .sort((a, b) => b.hitCount - a.hitCount);

  return { ...emptyReport(params, "mock", 0), channels };
}
