import type { Verdict } from "@/domain";

/**
 * ============================================================
 * ⚠️  FÓRMULAS MOCK / DEMONSTRATIVAS
 *
 * Tudo neste arquivo é uma aproximação para a fase 1. Os pesos e
 * limiares foram escolhidos para produzir resultados plausíveis,
 * NÃO foram calibrados com dados reais. Quando a coleta real
 * existir, recalibre (ou substitua) livremente — nenhum outro
 * arquivo depende de COMO estes números são calculados, apenas
 * das assinaturas exportadas aqui.
 * ============================================================
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Pesos do Opportunity Score (somam 1):
 * demanda alta e tendência em alta puxam para cima;
 * concorrência e saturação baixas também contam a favor.
 */
export const SCORE_WEIGHTS = {
  demand: 0.35,
  trend: 0.25,
  lowCompetition: 0.25,
  lowSaturation: 0.15,
} as const;

/** Média ponderada simples — o coração (MOCK) do score principal. */
export function computeOpportunityScore(input: {
  demand: number;
  trend: number;
  competition: number;
  saturation: number;
}): number {
  const raw =
    input.demand * SCORE_WEIGHTS.demand +
    input.trend * SCORE_WEIGHTS.trend +
    (100 - input.competition) * SCORE_WEIGHTS.lowCompetition +
    (100 - input.saturation) * SCORE_WEIGHTS.lowSaturation;
  return Math.round(clamp(raw, 0, 100));
}

/** Limiares do veredito (MOCK): >=70 SIM, >=45 TALVEZ, senão NÃO. */
export const VERDICT_THRESHOLDS = { yes: 70, maybe: 45 } as const;

export function verdictFromOpportunity(opportunity: number): Verdict {
  if (opportunity >= VERDICT_THRESHOLDS.yes) return "YES";
  if (opportunity >= VERDICT_THRESHOLDS.maybe) return "MAYBE";
  return "NO";
}

/** Confiança (MOCK): qualidade dos dados 0–1 vira 50–95%. */
export function confidenceFromDataQuality(dataQuality: number): number {
  return Math.round(clamp(50 + dataQuality * 45, 0, 100));
}

/** Atratividade de um mercado (MOCK): interesse pesa mais que concorrência. */
export function computeMarketScore(
  searchInterest: number,
  competitionLevel: number
): number {
  return Math.round(
    clamp(searchInterest * 0.65 + (100 - competitionLevel) * 0.35, 0, 100)
  );
}
