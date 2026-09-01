import type { CountryCode, LanguageCode } from "./topic";

/** Janela de publicação da varredura do Radar. */
export type RadarWindow = "24h" | "7d" | "30d";

/**
 * Formato varrido: "longform" (4min+, o Radar principal — nossa
 * operação é de vídeos longos) ou "shorts" (aba de fonte de ideias).
 */
export type RadarFormat = "longform" | "shorts";

/** Categorias de nicho varridas pelo Radar (uma consulta-semente cada). */
export type NicheCategory =
  | "historia"
  | "financas"
  | "saude"
  | "curiosidades"
  | "automotivo"
  | "animais"
  | "comida"
  | "religiao";

/** Um vídeo encontrado na varredura. */
export interface RadarVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  /** null = contagem de inscritos oculta. */
  subscribers: number | null;
  views: number;
  /** ISO 8601. */
  publishedAt: string;
  /** Views por hora desde a publicação. */
  vph: number;
  /** Performando muito acima da média do próprio canal. */
  isOutlier: boolean;
  /** Formato replicável (dark/faceless) segundo a heurística textual. */
  isReplicable: boolean;
  category: NicheCategory;
}

/** Canal pequeno/novo com vídeos recentes de VPH alto — nicho aberto. */
export interface RadarChannel {
  channelId: string;
  channelTitle: string;
  subscribers: number;
  /** Total de vídeos publicados pelo canal (channels.list). */
  totalVideos: number;
  /** Data de criação do canal (ISO), null se desconhecida. */
  channelPublishedAt: string | null;
  /** Soma de views dos vídeos do canal nesta varredura. */
  recentViews: number;
  /** Maior VPH entre os vídeos do canal na varredura. */
  bestVph: number;
  /** Vídeos do canal presentes na varredura. */
  videoCount: number;
  /** views recentes ÷ inscritos — o sinal de nicho aberto. */
  viewsPerSubscriber: number;
  /** Maioria dos vídeos amostrados do canal é de formato replicável. */
  isReplicable: boolean;
}

/** Uma categoria ranqueada por concentração de outliers. */
export interface RadarNiche {
  category: NicheCategory;
  outlierCount: number;
  /** Outliers que também são replicáveis (modo estrito usa este). */
  replicableOutlierCount: number;
  sampleCount: number;
  /** Exemplo: o outlier de maior VPH da categoria. */
  topOutlierTitle: string | null;
  topOutlierVideoId: string | null;
}

/** Resultado completo de uma varredura do Radar. */
export interface RadarSweep {
  language: LanguageCode;
  country: CountryCode;
  window: RadarWindow;
  format: RadarFormat;
  /** ISO 8601. */
  sweptAt: string;
  source: "real" | "mock";
  /** Unidades de quota gastas nesta varredura (0 = cache/mock). */
  quotaUnits: number;
  trendingVideos: RadarVideo[];
  risingChannels: RadarChannel[];
  heatingNiches: RadarNiche[];
  /**
   * Pool de sinal da varredura long-form (cap ~120): outliers primeiro
   * + topo replicável por VPH — matéria-prima das abas Nichos Nascendo
   * e Canais em Ascensão sem quota extra. Vazio no formato shorts.
   */
  outlierVideos: RadarVideo[];
}
