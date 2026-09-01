import type { InterpretationSource } from "./analysis";
import type { NicheCategory, RadarWindow } from "./radar";
import type { CountryCode, LanguageCode } from "./topic";

/** Tendência de um nicho emergente dentro da janela da varredura. */
export type NicheTrend = "NEW" | "GROWING" | "STEADY";

/** Um nicho/subnicho emergente detectado nos outliers long-form. */
export interface EmergingNiche {
  /** Termo bruto (n-grama) extraído dos títulos. */
  term: string;
  /** Nome legível (IA quando disponível; senão o termo capitalizado). */
  displayName: string;
  /** Subnicho de qual categoria varrida. */
  parentCategory: NicheCategory;
  /** Canais DISTINTOS com outlier no tema (3+ = aquecendo de verdade). */
  channelCount: number;
  videoCount: number;
  avgVph: number;
  trend: NicheTrend;
  examples: Array<{
    videoId: string;
    title: string;
    channelTitle: string;
    vph: number;
  }>;
}

/** Relatório da aba "Nichos Nascendo". */
export interface NicheReport {
  language: LanguageCode;
  country: CountryCode;
  window: RadarWindow;
  source: "real" | "mock";
  /** ISO da varredura base (reaproveitada do cache do Radar). */
  sweptAt: string;
  niches: EmergingNiche[];
  namedBy: InterpretationSource;
}
