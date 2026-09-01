import type { InterpretationSource } from "./analysis";
import type { CountryCode, LanguageCode } from "./topic";

/**
 * Verificador de Janela entre Idiomas: validar um tema num idioma e
 * caçar janela aberta nos outros mercados. Veredito vem do MOTOR;
 * a IA apenas interpreta o quadro.
 */

export type WindowVerdict = "OPEN" | "CONTESTED" | "SATURATED";

/** Resultado da mini-análise de UM idioma/mercado. */
export interface LanguageWindowCheck {
  language: LanguageCode;
  country: CountryCode;
  /** Consulta usada na busca (tema traduzido pela IA quando preciso). */
  translatedQuery: string;
  /** Veredito do motor (nunca da IA). */
  verdict: WindowVerdict;
  /** Vídeos long-form recentes (90d) no tema, após filtros. */
  recentLongFormCount: number;
  /** Fração da amostra long-form vinda de canais fortes, 0–1. */
  strongChannelShare: number;
  /** Outliers long-form ativos (últimos 30d), sem canais "grinder". */
  activeOutliers: number;
  /** VPH médio dos 10 tops long-form. */
  avgTopVph: number;
  sampleSize: number;
  /** Unidades de quota desta checagem (0 = veio do cache de 24h). */
  quotaUnits: number;
  fromCache: boolean;
}

/** Leitura da IA sobre o quadro completo (não decide vereditos). */
export interface WindowInterpretation {
  /** Onde entrar primeiro e por quê (citando os vereditos/números). */
  enterFirst: string;
  /** Adaptação cultural que o tema pede em cada mercado. */
  culturalNotes: Array<{ language: LanguageCode; note: string }>;
  /** O que validar antes de produzir. */
  validateBefore: string[];
  generatedBy: InterpretationSource;
}

/** Relatório completo de uma verificação de janela. */
export interface WindowReport {
  query: string;
  sourceLanguage: LanguageCode;
  checks: LanguageWindowCheck[];
  interpretation: WindowInterpretation;
  /** ISO 8601. */
  checkedAt: string;
  totalQuotaUnits: number;
}
