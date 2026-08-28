import "server-only";

import type { LanguageCode, Topic } from "@/domain";
import type {
  DataCollector,
  RawTopicData,
  RawVideoStats,
} from "../../contracts";
import { deriveVideoStats } from "./derive-video-stats";
import {
  createQuotaLedger,
  fetchChannels,
  fetchVideos,
  searchVideos,
} from "./youtube-api";

/**
 * Coletor REAL: YouTube Data API v3.
 *
 * - Chave (YOUTUBE_API_KEY) lida SOMENTE no servidor — `server-only`
 *   quebra o build se este módulo vazar para um bundle de cliente.
 * - Sem chave, erro da API ou amostra insuficiente → fallback
 *   automático para o coletor mock, sem quebrar a UI.
 * - Estatísticas de vídeos/canais são REAIS; série de tendência e
 *   sinais por país continuam MOCK (marcados em `sources.trends` e
 *   exibidos com o selo "estimado" na UI).
 *
 * QUOTA por análise nova (sem cache): ~204 unidades
 *   2 × search.list (relevância + recentes) = 200
 *   videos.list (até 100 ids, 50/chamada)   = 1–2
 *   channels.list (canais únicos, 50/chamada) = 1–2
 * Com cache (24h, SQLite): repetir o mesmo tema+idioma+país custa 0.
 */

/** ISO 639-1 aceito pelo parâmetro relevanceLanguage. */
const RELEVANCE_LANGUAGE: Record<LanguageCode, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
  it: "it",
  fr: "fr",
  de: "de",
};

/** Abaixo disso a amostra não sustenta medianas — melhor cair no mock. */
const MIN_SAMPLE_SIZE = 5;

export class YouTubeDataCollector implements DataCollector {
  constructor(private readonly fallback: DataCollector) {}

  async collect(topic: Topic): Promise<RawTopicData> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return this.fallback.collect(topic);
    }

    // O mock roda em paralelo: fornece tendência/países (estimados)
    // no caminho feliz e é o resultado inteiro no caminho de falha.
    const fallbackPromise = this.fallback.collect(topic);

    try {
      const video = await this.collectVideoStats(topic, apiKey);
      const estimated = await fallbackPromise;
      return {
        topic,
        video,
        trendSeries: estimated.trendSeries,
        countrySignals: estimated.countrySignals,
        sources: { videoStats: "real", trends: "mock" },
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "[YouTubeDataCollector] Coleta real falhou — usando o coletor mock.",
        error
      );
      return fallbackPromise;
    }
  }

  private async collectVideoStats(
    topic: Topic,
    apiKey: string
  ): Promise<RawVideoStats> {
    const ledger = createQuotaLedger();
    const searchOptions = {
      query: topic.query,
      relevanceLanguage: RELEVANCE_LANGUAGE[topic.language],
      regionCode: topic.country,
    };

    // Mais relevantes (demanda/concorrência) + mais recentes (cadência).
    const [byRelevance, byDate] = await Promise.all([
      searchVideos({ ...searchOptions, order: "relevance" }, apiKey, ledger),
      searchVideos({ ...searchOptions, order: "date" }, apiKey, ledger),
    ]);

    const videoIds = [
      ...new Set(
        [...(byRelevance.items ?? []), ...(byDate.items ?? [])]
          .map((item) => item.id?.videoId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    if (videoIds.length < MIN_SAMPLE_SIZE) {
      throw new Error(
        `Amostra insuficiente para "${topic.query}" (${videoIds.length} vídeos).`
      );
    }

    const videos = await fetchVideos(videoIds, apiKey, ledger);

    const channelIds = [
      ...new Set(
        videos
          .map((video) => video.snippet?.channelId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const channels = await fetchChannels(channelIds, apiKey, ledger);

    const now = new Date();
    const newestPublishDates = (byDate.items ?? [])
      .map((item) => item.snippet?.publishedAt)
      .filter((iso): iso is string => Boolean(iso))
      .map((iso) => new Date(iso))
      .filter((date) => !Number.isNaN(date.getTime()));

    const stats = deriveVideoStats({
      videos,
      channels,
      newestPublishDates,
      searchTotalResults: byRelevance.pageInfo?.totalResults,
      now,
    });

    if (stats.sampleSize < MIN_SAMPLE_SIZE) {
      throw new Error(
        `Amostra insuficiente após limpeza para "${topic.query}" (${stats.sampleSize} vídeos).`
      );
    }

    console.info(
      `[YouTubeDataCollector] "${topic.query}" (${topic.language}/${topic.country}): ` +
        `${ledger.units} unidades de quota nesta análise, ${ledger.cacheHits} respostas do cache. ` +
        `Chamadas: ${ledger.calls.join(", ") || "nenhuma (tudo em cache)"}.`
    );

    return stats;
  }
}
