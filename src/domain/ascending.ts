import type { NicheCategory, RadarWindow } from "./radar";
import type { CountryCode, LanguageCode } from "./topic";

/**
 * Canal em ascensão: dark, novo ou de médio porte, com desempenho
 * CONSISTENTE (múltiplos vídeos recentes performando, não 1 viral).
 */
export interface AscendingChannel {
  channelId: string;
  channelTitle: string;
  subscribers: number;
  totalVideos: number;
  channelPublishedAt: string | null;
  /** Categoria dominante do canal na varredura. */
  category: NicheCategory;
  isReplicable: boolean;
  /** Últimos long-form avaliados (base das métricas abaixo). */
  evaluatedVideos: number;
  /** Quantos deles passaram do piso de views. */
  hitCount: number;
  /** hitCount ÷ evaluatedVideos, 0–1. */
  hitRate: number;
  /** Views médias dos uploads das últimas semanas. */
  avgRecentViews: number;
  /** Uploads long-form por semana (cadência recente). */
  uploadsPerWeek: number;
  /** ISO do upload mais recente avaliado. */
  lastUploadAt: string | null;
}

/** Relatório da aba "Canais em Ascensão". */
export interface AscendingReport {
  language: LanguageCode;
  country: CountryCode;
  window: RadarWindow;
  source: "real" | "mock";
  checkedAt: string;
  /** Unidades gastas na avaliação (0 = cache). */
  quotaUnits: number;
  channels: AscendingChannel[];
}
