import type { Recommendation } from "@/domain";
import type {
  RecommendationEngine,
  RecommendationInput,
} from "../contracts";

/**
 * MOCK da etapa final. Consolida veredito + confiança em uma
 * recomendação acionável. Nunca promete viralização.
 */
export class MockRecommendationEngine implements RecommendationEngine {
  async recommend(input: RecommendationInput): Promise<Recommendation> {
    const { topic, scores, verdict } = input;

    const summary =
      verdict === "YES"
        ? `Vale a pena investir em "${topic.query}". A demanda (${scores.demand}/100) sustenta novos vídeos e ainda há espaço para entrar. Comece por um dos ângulos sugeridos, publique com consistência por algumas semanas e só então avalie os resultados.`
        : verdict === "MAYBE"
          ? `"${topic.query}" pode funcionar, mas com ressalvas. Evite o tema amplo: escolha um dos ângulos pouco explorados e valide com 2–3 vídeos antes de apostar mais tempo. Acompanhe a tendência (${scores.trend}/100) para decidir se acelera.`
          : `Neste momento, "${topic.query}" não parece um bom investimento de tempo: a combinação de concorrência (${scores.competition}/100) e saturação (${scores.saturation}/100) joga contra canais entrando agora. Considere um recorte mais específico ou outro tema.`;

    return {
      verdict,
      summary,
      confidence: scores.confidence,
    };
  }
}
