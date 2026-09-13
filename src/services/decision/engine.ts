/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — SCORE E VEREDITO
 *
 * Função pura: mesma entrada → mesma saída, sempre.
 *
 * Duas propriedades estruturais que diferenciam do motor anterior:
 *  1. O VEREDITO NÃO DERIVA DO SCORE. O score ordena temas entre si;
 *     o veredito sai de condições interpretáveis sobre as métricas
 *     brutas, e o piso de views tem poder de veto sobre a média
 *     ponderada.
 *  2. Métrica ausente é `null` do início ao fim. Nada vira zero por
 *     conveniência, porque zero é uma afirmação e ausência não é.
 * ============================================================
 */

import type { Verdict } from "@/domain";
import {
  assessEvidence,
  isAtLeast,
  type EvidenceAssessment,
  type EvidenceCounters,
  type EvidenceQuality,
} from "./evidence";
import {
  computeConcentration,
  computeReach,
  computeSupplyPressure,
  distinctChannelCount,
  newcomerVideos,
  reachSpreadDecades,
  unclassifiableVideos,
  type DecisionMetric,
  type DecisionVideo,
} from "./metrics";
import {
  currentParameters,
  decisionTier,
  SCORE_BANDS,
  VERDICT_LIMITS,
  viewsFloor,
  viewsTarget,
  WEIGHTS,
  type DecisionParameters,
  type DecisionTier,
} from "./parameters";

export interface DecisionInput {
  /** Vídeos aprovados pelos filtros de formato, idioma e infantil. */
  videos: readonly DecisionVideo[];
  /** Vídeos recebidos da API antes de qualquer filtro. */
  rawCount: number;
  /** Vídeos descartados pelo gate de validade. */
  discardedCount: number;
  /** Vídeos por 30 dias; null quando o tier não mede. */
  supplyPerMonth: number | null;
  /** true quando qualquer insumo veio de fallback demonstrativo. */
  usedFallback: boolean;
  tier?: DecisionTier;
}

export interface DecisionMetrics {
  reach: DecisionMetric;
  concentration: DecisionMetric;
  supplyPressure: DecisionMetric;
}

export interface DecisionResult {
  verdict: Verdict;
  /** null quando não há evidência para pontuar. */
  opportunityScore: number | null;
  /** Rótulo ordinal — é assim que o score deve ser exibido. */
  scoreBand: string | null;
  quality: EvidenceQuality;
  counters: EvidenceCounters;
  metrics: DecisionMetrics;
  /** Por que este veredito, em linguagem natural. */
  reasons: string[];
  parameters: DecisionParameters;
}

function bandFor(score: number): string {
  for (const band of SCORE_BANDS) {
    if (score >= band.min) return band.label;
  }
  return SCORE_BANDS[SCORE_BANDS.length - 1]!.label;
}

/**
 * Média ponderada das métricas disponíveis, com os pesos
 * renormalizados sobre o que existe. Devolve null se faltar
 * qualquer métrica obrigatória do tier.
 */
function computeScore(
  metrics: DecisionMetrics,
  tier: DecisionTier
): number | null {
  const reach = metrics.reach.value;
  const concentration = metrics.concentration.value;
  if (reach === null || concentration === null) return null;

  if (tier === "full") {
    const supply = metrics.supplyPressure.value;
    if (supply === null) return null;
    const w = WEIGHTS.full;
    return Math.round(
      w.reach * reach +
        w.concentration * (100 - concentration) +
        w.supply * (100 - supply)
    );
  }

  const w = WEIGHTS.reduced;
  return Math.round(w.reach * reach + w.concentration * (100 - concentration));
}

/**
 * Veredito por condições interpretáveis, avaliadas nesta ordem.
 * A primeira que casar decide.
 */
function computeVerdict(
  metrics: DecisionMetrics,
  evidence: EvidenceAssessment,
  tier: DecisionTier
): { verdict: Verdict; reasons: string[] } {
  // 1. Sem evidência não há recomendação.
  if (evidence.quality === "INSUFFICIENT") {
    return { verdict: "INSUFFICIENT_DATA", reasons: evidence.reasons };
  }

  const reachRaw = metrics.reach.raw;
  const concentration = metrics.concentration.value;
  const supply = metrics.supplyPressure.value;

  if (reachRaw === null || concentration === null) {
    return {
      verdict: "INSUFFICIENT_DATA",
      reasons: [
        metrics.reach.unavailableReason,
        metrics.concentration.unavailableReason,
      ].filter((r): r is string => Boolean(r)),
    };
  }

  const floor = viewsFloor();
  const target = viewsTarget();
  const reasons: string[] = [];

  // 2. NÃO — o piso tem veto sobre a média ponderada.
  if (reachRaw < floor) {
    reasons.push(
      `O vídeo mediano de canal entrante fez ${reachRaw.toLocaleString("pt-BR")} views, abaixo do piso de ${floor.toLocaleString("pt-BR")}.`
    );
    return { verdict: "NO", reasons };
  }
  if (concentration >= VERDICT_LIMITS.concentrationSaturated) {
    reasons.push(
      `Concentração de ${concentration}/100: os três maiores canais capturam a audiência do tema.`
    );
    return { verdict: "NO", reasons };
  }

  // 3. SIM — exige atingir o alvo, concorrência contida e evidência ≥ Média.
  const meetsTarget = reachRaw >= target;
  const lowConcentration = concentration < VERDICT_LIMITS.concentrationForYes;
  const supplyOk =
    tier !== "full" || supply === null || supply < VERDICT_LIMITS.supplyForYes;

  if (meetsTarget && lowConcentration && supplyOk) {
    if (!isAtLeast(evidence.quality, "MEDIUM")) {
      reasons.push(
        `Os números atingiriam o alvo, mas a evidência é ${evidence.quality === "LOW" ? "baixa" : "insuficiente"} — o motor não afirma oportunidade sobre amostra fraca.`
      );
      return { verdict: "MAYBE", reasons };
    }
    reasons.push(
      `O vídeo mediano de canal entrante fez ${reachRaw.toLocaleString("pt-BR")} views, no alvo de ${target.toLocaleString("pt-BR")}, com concentração de ${concentration}/100.`
    );
    return { verdict: "YES", reasons };
  }

  // 4. TALVEZ
  if (!meetsTarget) {
    reasons.push(
      `O vídeo mediano de canal entrante fez ${reachRaw.toLocaleString("pt-BR")} views: acima do piso de ${floor.toLocaleString("pt-BR")}, abaixo do alvo de ${target.toLocaleString("pt-BR")}.`
    );
  }
  if (!lowConcentration) {
    reasons.push(
      `Concentração de ${concentration}/100 — o tema tem donos, ainda que não o dominem por completo.`
    );
  }
  if (tier === "full" && supply !== null && supply >= VERDICT_LIMITS.supplyForYes) {
    reasons.push(`Pressão de oferta de ${supply}/100: publica-se muito neste tema.`);
  }
  return { verdict: "MAYBE", reasons };
}

/** Ponto de entrada do motor. Puro e determinístico. */
export function decide(input: DecisionInput): DecisionResult {
  const tier = input.tier ?? decisionTier();
  const videos = input.videos;

  const counters: EvidenceCounters = {
    sampleSize: videos.length,
    newcomerCount: newcomerVideos(videos).length,
    unclassifiableCount: unclassifiableVideos(videos).length,
    distinctChannels: distinctChannelCount(videos),
    discardedCount: input.discardedCount,
    rawCount: input.rawCount,
    reachSpreadDecades: reachSpreadDecades(videos),
    usedFallback: input.usedFallback,
  };

  const metrics: DecisionMetrics = {
    reach: computeReach(videos),
    concentration: computeConcentration(videos),
    supplyPressure: computeSupplyPressure(
      tier === "full" ? input.supplyPerMonth : null
    ),
  };

  const evidence = assessEvidence(counters);
  const { verdict, reasons } = computeVerdict(metrics, evidence, tier);

  // Score só existe quando há veredito — um número sem evidência
  // por trás é exatamente o que o V2 existe para não produzir.
  const score =
    verdict === "INSUFFICIENT_DATA" ? null : computeScore(metrics, tier);

  return {
    verdict,
    opportunityScore: score,
    scoreBand: score === null ? null : bandFor(score),
    quality: evidence.quality,
    counters,
    metrics,
    reasons: [...reasons, ...(verdict === "INSUFFICIENT_DATA" ? [] : evidence.reasons)],
    parameters: currentParameters(tier),
  };
}
