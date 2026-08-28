import type { Scores, Verdict } from "@/domain";
import type { ComputedMetrics } from "./types";

/**
 * Etapa 4 do pipeline: SCORING.
 * Converte métricas em Scores (0–100) e deriva o veredito
 * exclusivamente do Opportunity Score.
 * As fórmulas ficam isoladas em src/services/mock/formulas.ts.
 */
export interface ScoringEngine {
  score(metrics: ComputedMetrics): Scores;
  verdictFor(scores: Scores): Verdict;
}
