/**
 * Todos os scores usam a escala 0–100.
 * As fórmulas que produzem estes valores vivem em
 * src/services/mock/formulas.ts (fase 1: demonstrativas).
 */
export interface Scores {
  /** Score principal — responde "vale a pena criar conteúdo sobre isso?". */
  opportunity: number;
  /** Interesse do público pelo tema. Maior = mais procura. */
  demand: number;
  /** Força dos concorrentes. Maior = mais difícil competir. */
  competition: number;
  /** Quanto o tema já foi repetido. Maior = mais saturado. */
  saturation: number;
  /** Momento da tendência. >50 em alta, <50 em queda. */
  trend: number;
  /** Confiança da análise (qualidade/volume dos dados). */
  confidence: number;
}

/**
 * Veredito do motor.
 *
 * V2: deixa de derivar do Opportunity Score — sai de condições
 * interpretáveis sobre as métricas brutas (ver services/decision).
 * `INSUFFICIENT_DATA` é um desfecho de primeira classe, não um erro:
 * sem evidência, o motor não recomenda.
 */
export type Verdict = "YES" | "MAYBE" | "NO" | "INSUFFICIENT_DATA";
