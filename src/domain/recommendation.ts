import type { Verdict } from "./scores";

/** Recomendação final do motor. A decisão final é sempre do usuário. */
export interface Recommendation {
  verdict: Verdict;
  /** Texto da recomendação em linguagem natural. */
  summary: string;
  /** Confiança na recomendação, 0–100 (%). */
  confidence: number;
}
