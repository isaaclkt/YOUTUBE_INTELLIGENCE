import type { Market, Topic } from "@/domain";
import { COUNTRY_LABELS } from "@/lib/constants";
import type {
  NormalizedData,
  OpportunityEngine,
  RawCountrySignal,
} from "../contracts";
import { computeMarketScore } from "./formulas";

function marketReason(signal: RawCountrySignal): string {
  const interest =
    signal.searchInterest >= 65
      ? "Interesse de busca alto"
      : signal.searchInterest >= 40
        ? "Interesse de busca moderado"
        : "Interesse de busca ainda pequeno";
  const competition =
    signal.competitionLevel <= 40
      ? "concorrência local baixa"
      : signal.competitionLevel <= 65
        ? "concorrência local média"
        : "concorrência local intensa";
  return `${interest} (${signal.searchInterest}/100) com ${competition} (${signal.competitionLevel}/100).`;
}

/**
 * MOCK da etapa de oportunidades numéricas: ranking de mercados a partir
 * dos sinais por país. Ângulos e títulos vivem na camada de IA.
 */
export class MockOpportunityEngine implements OpportunityEngine {
  async rankMarkets(_topic: Topic, data: NormalizedData): Promise<Market[]> {
    return data.countrySignals
      .map((signal) => ({
        signal,
        score: computeMarketScore(signal.searchInterest, signal.competitionLevel),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ signal, score }) => ({
        country: signal.country,
        countryName: COUNTRY_LABELS[signal.country],
        score,
        reason: marketReason(signal),
      }));
  }
}
