import type { Market, Opportunity, Scores, SuggestedTitle, Topic } from "@/domain";
import type { ComputedMetrics, NormalizedData } from "./types";

/**
 * Etapa 5 do pipeline: OPORTUNIDADES.
 * Ranqueia mercados, encontra ângulos pouco explorados e sugere títulos.
 */
export interface OpportunityEngine {
  /** Top 3 países mais atraentes para o tema. */
  rankMarkets(topic: Topic, data: NormalizedData): Promise<Market[]>;
  /** 3 ângulos pouco explorados, com potencial e motivo. */
  findAngles(
    topic: Topic,
    metrics: ComputedMetrics,
    scores: Scores
  ): Promise<Opportunity[]>;
  /** 3 títulos sugeridos, cada um com o porquê. */
  suggestTitles(topic: Topic, angles: Opportunity[]): Promise<SuggestedTitle[]>;
}
