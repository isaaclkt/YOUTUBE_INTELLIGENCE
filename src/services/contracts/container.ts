import type { AIInterpreter } from "./ai-interpreter";
import type { DataCollector } from "./data-collector";
import type { MetricsEngine } from "./metrics-engine";
import type { OpportunityEngine } from "./opportunity-engine";
import type { RecommendationEngine } from "./recommendation-engine";
import type { ScoringEngine } from "./scoring-engine";

/**
 * Conjunto completo de serviços do motor.
 * Implementado por src/services/mock (fase 1) e, futuramente,
 * por src/services/real. A escolha acontece em src/services/index.ts.
 */
export interface ServiceContainer {
  dataCollector: DataCollector;
  metricsEngine: MetricsEngine;
  scoringEngine: ScoringEngine;
  opportunityEngine: OpportunityEngine;
  aiInterpreter: AIInterpreter;
  recommendationEngine: RecommendationEngine;
}
