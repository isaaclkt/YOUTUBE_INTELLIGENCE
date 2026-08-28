/** Potencial estimado de um ângulo de conteúdo. */
export type OpportunityPotential = "HIGH" | "MEDIUM" | "LOW";

/** Um ângulo pouco explorado dentro do tema analisado. */
export interface Opportunity {
  /** O ângulo em si (ex.: "erros comuns para iniciantes"). */
  angle: string;
  potential: OpportunityPotential;
  /** Por que este ângulo tem espaço. */
  reason: string;
}
