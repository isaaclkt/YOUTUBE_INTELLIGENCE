import type { CountryCode, Topic } from "@/domain";

/**
 * Tipos intermediários do pipeline:
 * coleta → normalização → métricas → scoring → oportunidades → IA → recomendação
 *
 * Estes tipos são o "fio" que conecta os serviços. As implementações
 * (mock ou real) podem mudar; os formatos abaixo, não.
 */

/** Estatísticas agregadas de vídeos sobre o tema (fase real: YouTube Data API). */
export interface RawVideoStats {
  /** Total estimado de vídeos publicados sobre o tema. */
  videoCount: number;
  avgViews: number;
  medianViews: number;
  /** Taxa média de engajamento (likes+comentários / views), 0–1. */
  avgEngagementRate: number;
  /** Canais ativos no tema. */
  channelCount: number;
  /** Fatia de views do canal dominante, 0–1. Alto = mercado concentrado. */
  dominantChannelShare: number;
  /** Novos vídeos por semana no tema. */
  recentUploadsPerWeek: number;
}

/** Um ponto da série de interesse de busca (fase real: fonte de tendências). */
export interface RawTrendPoint {
  /** 11 = há 11 semanas ... 0 = semana atual. */
  weeksAgo: number;
  /** Interesse relativo de busca, 0–100. */
  interest: number;
}

/** Sinais por país, usados no ranking de mercados. */
export interface RawCountrySignal {
  country: CountryCode;
  /** Interesse de busca no país, 0–100. */
  searchInterest: number;
  /** Nível de concorrência local, 0–100. */
  competitionLevel: number;
}

/** Saída da etapa de COLETA. */
export interface RawTopicData {
  topic: Topic;
  video: RawVideoStats;
  /** Série das últimas 12 semanas, da mais antiga para a mais recente. */
  trendSeries: RawTrendPoint[];
  countrySignals: RawCountrySignal[];
  /** ISO 8601. */
  collectedAt: string;
}

/** Saída da etapa de NORMALIZAÇÃO — sinais comparáveis entre si. */
export interface NormalizedData {
  topic: Topic;
  /** Interesse do público, 0–1. */
  demandSignal: number;
  /** Direção da tendência, -1 (queda forte) a +1 (alta forte). */
  growthSignal: number;
  /** Pressão competitiva, 0–1. */
  competitionSignal: number;
  /** Saturação de conteúdo, 0–1. */
  saturationSignal: number;
  /** Qualidade/volume dos dados coletados, 0–1. Alimenta o Confidence. */
  dataQuality: number;
  countrySignals: RawCountrySignal[];
}

/** Saída da etapa de MÉTRICAS — números que a IA interpreta (nunca inventa). */
export interface ComputedMetrics {
  /** Demanda, 0–100. */
  demandIndex: number;
  /** Crescimento percentual estimado por semana (pode ser negativo). */
  growthRate: number;
  /** Concorrência, 0–100. */
  competitionIndex: number;
  /** Saturação, 0–100. */
  saturationIndex: number;
  /** Momento da tendência, 0–100 (50 = estável). */
  trendMomentum: number;
  /** Qualidade dos dados, 0–1. */
  dataQuality: number;
}
