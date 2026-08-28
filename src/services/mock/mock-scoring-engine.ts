import type { Scores, Verdict } from "@/domain";
import type { ComputedMetrics, ScoringEngine } from "../contracts";
import {
  computeOpportunityScore,
  confidenceFromDataQuality,
  verdictFromOpportunity,
} from "./formulas";

/**
 * MOCK da etapa de scoring. Toda a matemática vive em formulas.ts —
 * esta classe só liga métricas → scores → veredito.
 */
export class MockScoringEngine implements ScoringEngine {
  score(metrics: ComputedMetrics): Scores {
    const demand = metrics.demandIndex;
    const competition = metrics.competitionIndex;
    const saturation = metrics.saturationIndex;
    const trend = metrics.trendMomentum;

    return {
      demand,
      competition,
      saturation,
      trend,
      opportunity: computeOpportunityScore({
        demand,
        trend,
        competition,
        saturation,
      }),
      confidence: confidenceFromDataQuality(metrics.dataQuality),
    };
  }

  verdictFor(scores: Scores): Verdict {
    return verdictFromOpportunity(scores.opportunity);
  }
}
