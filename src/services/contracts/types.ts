import type { CountryCode, Topic } from "@/domain";

/**
 * Tipos intermediários do pipeline:
 * coleta → normalização → métricas → scoring → oportunidades → IA → recomendação
 *
 * Estes tipos são o "fio" que conecta os serviços. As implementações
 * (mock ou real) podem mudar; os formatos abaixo, não.
 */

/** De onde veio cada bloco de dados coletados. */
export type DataSourceKind = "real" | "mock";

export interface RawDataSources {
  /** Estatísticas de vídeos/canais (real = YouTube Data API v3). */
  videoStats: DataSourceKind;
  /** Série de tendência e sinais por país (real ainda não conectado). */
  trends: DataSourceKind;
}

/**
 * Estatísticas agregadas de vídeos sobre o tema, derivadas de uma
 * amostra dos resultados de topo (real: YouTube Data API v3).
 */
export interface RawVideoStats {
  /** Total estimado de vídeos publicados sobre o tema (ordem de grandeza). */
  videoCount: number;
  /** Vídeos efetivamente analisados na amostra. */
  sampleSize: number;
  avgViews: number;
  medianViews: number;
  /** Taxa média de engajamento (likes+comentários / views), 0–1. */
  avgEngagementRate: number;
  /** VPH mediano da amostra (views por hora desde a publicação). */
  medianVph: number;
  /** VPH mediano só dos vídeos recentes (últimos 90 dias). */
  recentMedianVph: number;
  /**
   * Fração da amostra performando muito acima da média do próprio
   * canal (outliers). Alta = tema com espaço para vídeos estourarem.
   */
  outlierRatio: number;
  /** Canais distintos na amostra de topo. */
  channelCount: number;
  /** Fatia de views do canal dominante na amostra, 0–1. */
  dominantChannelShare: number;
  /** Fração da amostra vinda de canais fortes (muitos inscritos), 0–1. */
  strongChannelShare: number;
  /** Inscritos medianos dos canais da amostra (0 = desconhecido). */
  medianSubscribers: number;
  /** Novos vídeos por semana no tema (cadência dos uploads recentes). */
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
  /** Origem de cada bloco (alimenta os selos "estimado" da UI). */
  sources: RawDataSources;
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
  /** Origem dos dados, repassada da coleta. */
  sources: RawDataSources;
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
