import type { Market } from "./market";
import type { Opportunity } from "./opportunity";
import type { Recommendation } from "./recommendation";
import type { Scores, Verdict } from "./scores";
import type { SuggestedTitle } from "./title";
import type { CountryCode, LanguageCode, Topic } from "./topic";

/** Resultado completo produzido pelo pipeline de análise. */
export interface AnalysisResult {
  scores: Scores;
  verdict: Verdict;
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
