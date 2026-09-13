import "server-only";

import { createHash } from "node:crypto";
import { getApiCache, putApiCache } from "@/lib/repository";

/**
 * Cliente mínimo da YouTube Data API v3 com cache em SQLite (24h)
 * e contabilidade de quota. A chave NUNCA entra na chave de cache
 * nem em mensagens de erro.
 *
 * Custos de quota por chamada (documentação oficial):
 *   search.list = 100 unidades · videos.list = 1 · channels.list = 1
 */

const BASE_URL = "https://www.googleapis.com/youtube/v3";

/** TTL do cache: análises repetidas em 24h não gastam quota. */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Quota diária do tier gratuito da YouTube Data API. */
export const DAILY_QUOTA_LIMIT = 10_000;

function dailyQuotaKey(): string {
  return `yt-quota:${new Date().toISOString().slice(0, 10)}`;
}

/** Total de unidades gastas HOJE (todas as frentes: análise, radar, janela). */
export async function getDailyQuotaSpent(): Promise<number> {
  const raw = await getApiCache(dailyQuotaKey());
  const parsed = raw === null ? 0 : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function addDailyQuotaSpent(units: number): Promise<void> {
  const spent = await getDailyQuotaSpent();
  await putApiCache(dailyQuotaKey(), String(spent + units), 48 * 3_600_000);
}

export const QUOTA_COSTS = {
  search: 100,
  videos: 1,
  channels: 1,
} as const;

/** Contabilidade de quota de UMA análise (só chamadas que saíram à rede). */
export interface QuotaLedger {
  units: number;
  calls: string[];
  cacheHits: number;
}

export function createQuotaLedger(): QuotaLedger {
  return { units: 0, calls: [], cacheHits: 0 };
}

// ---- Formatos (subconjunto) das respostas da API ----

export interface YouTubeSearchResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { publishedAt?: string };
  }>;
  pageInfo?: { totalResults?: number };
}

export interface YouTubeVideo {
  id?: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    channelTitle?: string;
    description?: string;
    tags?: string[];
    /**
     * Idioma declarado pelo criador. A quota é cobrada por CHAMADA,
     * não por campo, então estes vêm sem custo adicional no mesmo
     * `part=snippet` já solicitado. São opcionais: o criador pode
     * não tê-los preenchido.
     */
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
    /** Categoria oficial do YouTube — coerência temática da amostra. */
    categoryId?: string;
    /** "live" | "upcoming" | "none" — lives distorcem duração e views. */
    liveBroadcastContent?: string;
  };
  contentDetails?: {
    duration?: string;
    /** true = conteúdo reivindicado por terceiro; sinal direto de não replicável. */
    licensedContent?: boolean;
  };
  status?: { madeForKids?: boolean };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  /** URLs da Wikipédia; taxonomia grossa, serve para agrupar. */
  topicDetails?: { topicCategories?: string[] };
}

interface YouTubeVideosResponse {
  items?: YouTubeVideo[];
}

export interface YouTubeChannel {
  id?: string;
  /** `country` é o país declarado do canal — vem sem custo no mesmo part. */
  snippet?: { title?: string; publishedAt?: string; country?: string };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
}

interface YouTubeChannelsResponse {
  items?: YouTubeChannel[];
}

// ---- Núcleo: GET com cache de 24h ----

async function cachedGet<T>(
  path: string,
  params: Record<string, string>,
  quotaCost: number,
  label: string,
  apiKey: string,
  ledger: QuotaLedger
): Promise<T> {
  // Chave de cache determinística SEM a chave da API.
  const canonical = `${path}?${new URLSearchParams(params).toString()}`;
  const cacheKey =
    "yt:" + createHash("sha256").update(canonical).digest("hex");

  const cached = await getApiCache(cacheKey);
  if (cached !== null) {
    ledger.cacheHits += 1;
    return JSON.parse(cached) as T;
  }

  const response = await fetch(
    `${BASE_URL}/${canonical}&key=${encodeURIComponent(apiKey)}`
  );
  if (!response.ok) {
    // Nunca incluir a URL completa (contém a chave) na mensagem.
    const body = await response.text().catch(() => "");
    throw new Error(
      `YouTube API ${path} respondeu ${response.status}: ${body.slice(0, 300)}`
    );
  }

  const json = (await response.json()) as T;
  ledger.units += quotaCost;
  ledger.calls.push(`${label} (${quotaCost}u)`);
  await putApiCache(cacheKey, JSON.stringify(json), CACHE_TTL_MS);
  await addDailyQuotaSpent(quotaCost);
  return json;
}

// ---- Chamadas tipadas ----

export async function searchVideos(
  options: {
    query: string;
    relevanceLanguage: string;
    regionCode: string;
    order: "relevance" | "date" | "viewCount";
    /** RFC 3339 — só vídeos publicados depois deste instante. */
    publishedAfter?: string;
    /**
     * RFC 3339 — fecha a janela de amostragem na própria API, em vez
     * de filtrar depois. Sem isto, os 50 resultados podem cair todos
     * fora da faixa de idade que o motor analisa.
     */
    publishedBefore?: string;
    /** Filtro de duração da API: short <4min, medium 4–20min, long >20min. */
    videoDuration?: "short" | "medium" | "long";
  },
  apiKey: string,
  ledger: QuotaLedger
): Promise<YouTubeSearchResponse> {
  const params: Record<string, string> = {
    part: "snippet",
    type: "video",
    maxResults: "50",
    q: options.query,
    relevanceLanguage: options.relevanceLanguage,
    regionCode: options.regionCode,
    order: options.order,
  };
  if (options.publishedAfter) {
    params.publishedAfter = options.publishedAfter;
  }
  if (options.publishedBefore) {
    params.publishedBefore = options.publishedBefore;
  }
  if (options.videoDuration) {
    params.videoDuration = options.videoDuration;
  }
  return cachedGet<YouTubeSearchResponse>(
    "search",
    params,
    QUOTA_COSTS.search,
    `search.list/${options.order}`,
    apiKey,
    ledger
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Estatísticas de até N vídeos (50 ids por chamada de 1 unidade). */
export async function fetchVideos(
  ids: readonly string[],
  apiKey: string,
  ledger: QuotaLedger
): Promise<YouTubeVideo[]> {
  const results: YouTubeVideo[] = [];
  for (const group of chunk(ids, 50)) {
    const response = await cachedGet<YouTubeVideosResponse>(
      "videos",
      {
        // A quota é por CHAMADA, não por part: todos estes campos
        // vêm pelo mesmo 1 unidade. `status` traz madeForKids,
        // `topicDetails` traz os tópicos do vídeo.
        part: "statistics,snippet,contentDetails,status,topicDetails",
        id: group.join(","),
        maxResults: "50",
      },
      QUOTA_COSTS.videos,
      "videos.list",
      apiKey,
      ledger
    );
    results.push(...(response.items ?? []));
  }
  return results;
}

export interface YouTubePlaylistItemsResponse {
  items?: Array<{
    contentDetails?: { videoId?: string; videoPublishedAt?: string };
  }>;
}

/**
 * Últimos uploads de um canal via playlist de uploads (id determinístico:
 * "UC..." → "UU...", sem chamada extra). Custo: 1 unidade.
 */
export async function fetchChannelUploads(
  channelId: string,
  maxResults: number,
  apiKey: string,
  ledger: QuotaLedger
): Promise<YouTubePlaylistItemsResponse> {
  const playlistId = "UU" + channelId.slice(2);
  return cachedGet<YouTubePlaylistItemsResponse>(
    "playlistItems",
    {
      part: "contentDetails",
      playlistId,
      maxResults: String(maxResults),
    },
    1,
    "playlistItems.list",
    apiKey,
    ledger
  );
}

/** Estatísticas de até N canais (50 ids por chamada de 1 unidade). */
export async function fetchChannels(
  ids: readonly string[],
  apiKey: string,
  ledger: QuotaLedger
): Promise<YouTubeChannel[]> {
  const results: YouTubeChannel[] = [];
  for (const group of chunk(ids, 50)) {
    const response = await cachedGet<YouTubeChannelsResponse>(
      "channels",
      { part: "statistics,snippet", id: group.join(","), maxResults: "50" },
      QUOTA_COSTS.channels,
      "channels.list",
      apiKey,
      ledger
    );
    results.push(...(response.items ?? []));
  }
  return results;
}
