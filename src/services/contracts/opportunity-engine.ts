import type { Market, Topic } from "@/domain";
import type { NormalizedData } from "./types";

/**
 * Etapa 5 do pipeline: OPORTUNIDADES (numéricas).
 * Ranqueia mercados a partir dos sinais por país. O conteúdo criativo
 * (ângulos e títulos) pertence à camada de IA — ver AIInterpreter.
 */
export interface OpportunityEngine {
  /** Top 3 países mais atraentes para o tema. */
  rankMarkets(topic: Topic, data: NormalizedData): Promise<Market[]>;
}
