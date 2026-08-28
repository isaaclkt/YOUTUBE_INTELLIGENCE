import type { Recommendation, Scores, Topic, Verdict } from "@/domain";
import type { AIInterpretation } from "./ai-interpreter";

export interface RecommendationInput {
  topic: Topic;
  scores: Scores;
  verdict: Verdict;
  interpretation: AIInterpretation;
}

/**
 * Etapa 7 (final) do pipeline: RECOMENDAÇÃO.
 * Consolida veredito + confiança + próximo passo em um texto acionável.
 * Nunca promete viralização — a decisão final é sempre do usuário.
 */
export interface RecommendationEngine {
  recommend(input: RecommendationInput): Promise<Recommendation>;
}
