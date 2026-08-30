import type { ServiceContainer } from "../contracts";
import { MockAIInterpreter } from "./mock-ai-interpreter";
import { MockDataCollector } from "./mock-data-collector";
import { MockMetricsEngine } from "./mock-metrics-engine";
import { MockOpportunityEngine } from "./mock-opportunity-engine";
import { MockRadarProvider } from "./mock-radar-provider";
import { MockRecommendationEngine } from "./mock-recommendation-engine";
import { MockScoringEngine } from "./mock-scoring-engine";

/** Monta o contêiner completo de serviços MOCK (fase 1). */
export function createMockServices(): ServiceContainer {
  return {
    dataCollector: new MockDataCollector(),
    metricsEngine: new MockMetricsEngine(),
    scoringEngine: new MockScoringEngine(),
    opportunityEngine: new MockOpportunityEngine(),
    aiInterpreter: new MockAIInterpreter(),
    recommendationEngine: new MockRecommendationEngine(),
    radarProvider: new MockRadarProvider(),
  };
}
