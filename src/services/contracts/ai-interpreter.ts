import type {
  Opportunity,
  Scores,
  SuggestedTitle,
  Topic,
  Verdict,
} from "@/domain";
import type { ComputedMetrics } from "./types";

/** Entrada da IA: SOMENTE dados já calculados pelas etapas anteriores. */
export interface AIInterpretationInput {
  topic: Topic;
  metrics: ComputedMetrics;
  scores: Scores;
  verdict: Verdict;
}

/**
 * Saída da IA: TODO o conteúdo em linguagem natural do resultado.
 * A camada de IA (mock ou real) é dona dos textos; os engines numéricos
 * são donos dos números.
 */
export interface AIInterpretation {
  /** Exatamente 3 pontos para o card "Por que esse score?". */
  whyPoints: string[];
  /** Exatamente 3 ângulos pouco explorados, específicos do tema. */
  angles: Opportunity[];
  /** Exatamente 3 títulos sugeridos, com o porquê de cada um. */
  titles: SuggestedTitle[];
  /** Texto da recomendação final (veredito e confiança vêm dos scores). */
  recommendationSummary: string;
}

/**
 * Etapa 6 do pipeline: INTERPRETAÇÃO IA.
 *
 * REGRA INEGOCIÁVEL: a IA recebe números prontos (demanda, crescimento,
 * concorrência, saturação, veredito) e devolve EXPLICAÇÃO e conteúdo
 * criativo. Ela nunca calcula nem inventa números — todo valor citado
 * nos textos vem de `metrics`/`scores`.
 *
 * Implementações: MockAIInterpreter (templates) e RealAIInterpreter
 * (Anthropic API, com fallback automático para o mock).
 */
export interface AIInterpreter {
  interpret(input: AIInterpretationInput): Promise<AIInterpretation>;
}
