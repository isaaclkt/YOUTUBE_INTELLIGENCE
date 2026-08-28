import type { Scores, Topic, Verdict } from "@/domain";
import type { ComputedMetrics } from "./types";

/** Entrada da IA: SOMENTE dados já calculados pelas etapas anteriores. */
export interface AIInterpretationInput {
  topic: Topic;
  metrics: ComputedMetrics;
  scores: Scores;
  verdict: Verdict;
}

/** Saída da IA: explicação em linguagem natural dos números recebidos. */
export interface AIInterpretation {
  /** Exatamente 3 pontos para o card "Por que esse score?". */
  whyPoints: string[];
  /** Resumo narrativo da situação do tema. */
  summary: string;
}

/**
 * Etapa 6 do pipeline: INTERPRETAÇÃO IA.
 *
 * REGRA INEGOCIÁVEL: a IA recebe números prontos (demanda, crescimento,
 * concorrência, saturação) e devolve EXPLICAÇÃO. Ela nunca calcula nem
 * inventa números — todo valor citado no texto vem de `metrics`/`scores`.
 * Fase real: LLM (ex.: Claude) recebendo estes mesmos dados estruturados.
 */
export interface AIInterpreter {
  interpret(input: AIInterpretationInput): Promise<AIInterpretation>;
}
