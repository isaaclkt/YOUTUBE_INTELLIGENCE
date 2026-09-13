import type { LanguageCode } from "@/domain";
import { LONGFORM_MIN_SECONDS, SHORTS_TITLE_TAG } from "@/lib/video-format";
import {
  WINDOW_MAX_AGE_DAYS,
  WINDOW_MIN_AGE_DAYS,
} from "@/services/decision/parameters";
import type { DecisionVideo } from "@/services/decision/metrics";
import { matchesLanguage } from "../radar/language-filter";
import { isKidsContent, parseIsoDuration } from "../radar/video-filters";
import type { YouTubeChannel, YouTubeVideo } from "./youtube-api";

/**
 * Constrói a amostra do MOTOR DE DECISÃO V2 a partir das respostas
 * cruas da YouTube Data API.
 *
 * Só entra aqui dado REAL. Nenhum valor de preenchimento é gerado:
 * o que não passa nos gates é descartado e CONTADO, porque a taxa de
 * descarte alimenta a qualidade da evidência.
 */

const MS_PER_DAY = 86_400_000;

export interface DecisionSample {
  videos: DecisionVideo[];
  /** Vídeos recebidos da API antes de qualquer filtro. */
  rawCount: number;
  /** Descartados pelo gate de VALIDADE (dados inconsistentes). */
  discardedCount: number;
  /** Descartados por não pertencerem à amostra (formato, idioma, janela). */
  filteredCount: number;
}

/** Mapa de idioma declarado → idioma-alvo do produto. */
const DECLARED_LANGUAGE_PREFIX: Record<LanguageCode, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
  it: "it",
  fr: "fr",
  de: "de",
};

/**
 * O vídeo está no idioma-alvo?
 *
 * PRECEDÊNCIA: quando o criador declarou o idioma, a declaração vence
 * — é dado, não inferência. A heurística de stopwords (que continua
 * valendo para o Radar e a Janela) só decide quando não há declaração.
 */
export function matchesTargetLanguage(
  video: YouTubeVideo,
  target: LanguageCode
): boolean {
  const declared =
    video.snippet?.defaultAudioLanguage ?? video.snippet?.defaultLanguage;
  if (declared && declared.trim() !== "") {
    const prefix = declared.trim().toLowerCase().split("-")[0];
    return prefix === DECLARED_LANGUAGE_PREFIX[target];
  }
  return matchesLanguage(
    video.snippet?.title ?? "",
    video.snippet?.description,
    target
  );
}

/**
 * Gate de validade (RN-08). Um vídeo que falha aqui conta como
 * INCONSISTENTE — sinal diferente de "não pertence à amostra".
 */
function isStructurallyValid(video: YouTubeVideo, now: number): boolean {
  if (!video.id || !video.snippet?.channelId) return false;

  const publishedAt = video.snippet?.publishedAt;
  if (!publishedAt) return false;
  const publishedMs = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedMs) || publishedMs > now) return false;

  const rawViews = video.statistics?.viewCount;
  if (rawViews === undefined) return false;
  const views = Number(rawViews);
  if (!Number.isFinite(views) || views < 0) return false;

  // Duração ilegível impede julgar formato — é inconsistência, não filtro.
  if (parseIsoDuration(video.contentDetails?.duration) <= 0) return false;

  return true;
}

/** O vídeo pertence à amostra do V2? (formato, janela, idioma, público) */
function belongsToSample(
  video: YouTubeVideo,
  target: LanguageCode,
  now: number
): boolean {
  const title = video.snippet?.title ?? "";

  // Lives e estreias distorcem duração e acumulação de views.
  const live = video.snippet?.liveBroadcastContent;
  if (live && live !== "none") return false;

  const duration = parseIsoDuration(video.contentDetails?.duration);
  if (duration < LONGFORM_MIN_SECONDS || SHORTS_TITLE_TAG.test(title)) {
    return false;
  }

  if (isKidsContent(title, video.status?.madeForKids)) return false;

  const ageDays =
    (now - new Date(video.snippet!.publishedAt!).getTime()) / MS_PER_DAY;
  if (ageDays < WINDOW_MIN_AGE_DAYS || ageDays > WINDOW_MAX_AGE_DAYS) {
    return false;
  }

  return matchesTargetLanguage(video, target);
}

/**
 * Inscritos do canal, ou null quando ocultos/ausentes.
 * null é propagado até o motor, que o conta como "não classificável"
 * em vez de tratar como canal pequeno.
 */
function subscribersOf(channel: YouTubeChannel | undefined): number | null {
  if (!channel) return null;
  const stats = channel.statistics;
  if (stats?.hiddenSubscriberCount === true) return null;
  const subs = Number(stats?.subscriberCount ?? NaN);
  return Number.isFinite(subs) ? subs : null;
}

export function buildDecisionSample(input: {
  videos: readonly YouTubeVideo[];
  channels: readonly YouTubeChannel[];
  language: LanguageCode;
  now: Date;
}): DecisionSample {
  const now = input.now.getTime();

  const channelById = new Map<string, YouTubeChannel>();
  for (const channel of input.channels) {
    if (channel.id) channelById.set(channel.id, channel);
  }

  let discardedCount = 0;
  let filteredCount = 0;
  const videos: DecisionVideo[] = [];

  for (const video of input.videos) {
    if (!isStructurallyValid(video, now)) {
      discardedCount += 1;
      continue;
    }
    if (!belongsToSample(video, input.language, now)) {
      filteredCount += 1;
      continue;
    }
    const channelId = video.snippet!.channelId!;
    videos.push({
      videoId: video.id!,
      channelId,
      views: Number(video.statistics!.viewCount),
      publishedAt: new Date(video.snippet!.publishedAt!).toISOString(),
      subscribers: subscribersOf(channelById.get(channelId)),
    });
  }

  return {
    videos,
    rawCount: input.videos.length,
    discardedCount,
    filteredCount,
  };
}

/**
 * Pressão de oferta (M3): densidade de publicação em vídeos por 30 dias.
 *
 * Medida pelo INTERVALO que os resultados mais recentes cobrem — quanto
 * mais denso o tema, menor o intervalo. Formulado assim porque contar
 * "50 ÷ período" esbarra num teto aritmético que nunca alcança o divisor.
 *
 * Devolve null quando não há base para medir.
 */
export function computeSupplyPerMonth(
  publishDates: readonly Date[],
  now: Date,
  pageSize = 50
): number | null {
  const valid = publishDates
    .map((d) => d.getTime())
    .filter((ms) => Number.isFinite(ms) && ms <= now.getTime());
  if (valid.length === 0) return null;

  const oldest = Math.min(...valid);
  const spanDays = (now.getTime() - oldest) / MS_PER_DAY;
  if (spanDays <= 0) return null;

  // Página cheia: a densidade é o que o intervalo revela.
  // Página incompleta: o intervalo é a janela inteira consultada.
  if (valid.length >= pageSize) {
    return (valid.length * 30) / spanDays;
  }
  return (valid.length * 30) / Math.max(spanDays, WINDOW_MAX_AGE_DAYS);
}
