import type { Market } from "./market";
import type { Opportunity } from "./opportunity";
import type { Recommendation } from "./recommendation";
import type { Scores, Verdict } from "./scores";
import type { SuggestedTitle } from "./title";
import type { CountryCode, LanguageCode, Topic } from "./topic";

/** Origem de um número exibido na UI: dado real ou estimativa (mock). */
export type MetricSource = "real" | "estimated";

/** Origem de cada uma das 4 métricas da tela de resultado. */
export interface MetricSourceMap {
  demand: MetricSource;
  competition: MetricSource;
  saturation: MetricSource;
  trend: MetricSource;
}

/** Resultado completo produzido pelo pipeline de análise. */
export interface AnalysisResult {
  scores: Scores;
  verdict: Verdict;
  /**
   * Origem das métricas (selo "estimado" na UI). Opcional para
   * compatibilidade com análises persistidas antes deste campo.
   */
  metricSources?: MetricSourceMap;
  /** 3 pontos que explicam o score ("Por que esse score?"). */
  whyPoints: string[];
  /** Ranking dos 3 melhores mercados para o tema. */
  markets: Market[];
  /** 3 ângulos pouco explorados. */
  opportunities: Opportunity[];
  /** 3 títulos sugeridos. */
  titles: SuggestedTitle[];
  recommendation: Recommendation;
}

/** Uma análise persistida, com identidade e data. */
export interface Analysis {
  id: string;
  topic: Topic;
  result: AnalysisResult;
  /** ISO 8601. */
  createdAt: string;
}

/** Versão enxuta para listagens (histórico na Home). */
export interface AnalysisSummary {
  id: string;
  query: string;
  language: LanguageCode;
  country: CountryCode;
  verdict: Verdict;
  opportunityScore: number;
  createdAt: string;
}
