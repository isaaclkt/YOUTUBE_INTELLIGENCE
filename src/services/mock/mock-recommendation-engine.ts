import type { Recommendation } from "@/domain";
import type {
  RecommendationEngine,
  RecommendationInput,
} from "../contracts";

/**
 * Montagem final da recomendação: veredito e confiança vêm dos números
 * (ScoringEngine); o texto vem da camada de IA (mock ou real).
 * Serve aos dois modos — não há nada para "mockar" além da composição.
 */
export class MockRecommendationEngine implements RecommendationEngine {
  async recommend(input: RecommendationInput): Promise<Recommendation> {
    const { scores, verdict, interpretation } = input;
    return {
      verdict,
      summary: interpretation.recommendationSummary,
      confidence: scores.confidence,
    };
  }
}
