/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — SCORE E VEREDITO
 *
 * Função pura: mesma entrada → mesma saída, sempre. Sem gerador
 * pseudoaleatório em nenhum ponto do caminho decisório.
 *
 * Três propriedades estruturais:
 *
 *  1. O VEREDITO NÃO DERIVA DO SCORE. O score ordena temas entre si;
 *     o veredito sai de condições interpretáveis sobre a concentração.
 *
 *  2. A CONCENTRAÇÃO É A ÚNICA MÉTRICA DECISIVA. O alcance do entrante
 *     é evidência contextual — a validação com dados reais mostrou que
 *     ele mede sobretudo o porte dos canais devolvidos pela busca.
 *
 *  3. O SCORE ENCOLHE PARA O NEUTRO QUANDO A EVIDÊNCIA É FRACA. λ vem
 *     da largura do intervalo de reamostragem da própria amostra, de
 *     modo que score extremo exige sinal forte E intervalo estreito.
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
  describeNewcomers,
  distinctChannelCount,
  newcomerVideos,
  unclassifiableVideos,
  type ConcentrationMetric,
  type DecisionVideo,
  type NewcomerContext,
} from "./metrics";
import {
  currentParameters,
  SCORE_BANDS,
  VERDICT_LIMITS,
  type DecisionParameters,
} from "./parameters";

export interface DecisionInput {
  /** Vídeos aprovados pelos filtros de formato, idioma e infantil. */
  videos: readonly DecisionVideo[];
  /** Vídeos recebidos da API antes de qualquer filtro. */
  rawCount: number;
  /** Vídeos descartados pelo gate de validade. */
  discardedCount: number;
  /** true quando qualquer insumo veio de fallback demonstrativo. */
  usedFallback: boolean;
}

export interface DecisionResult {
  verdict: Verdict;
  /** null quando não há evidência para pontuar. */
  opportunityScore: number | null;
  /** Rótulo ordinal — é assim que o score deve ser exibido. */
  scoreBand: string | null;
  /** Fator de encolhimento aplicado ao score, 0–1. */
  lambda: number | null;
  quality: EvidenceQuality;
  counters: EvidenceCounters;
  /** Métrica DECISIVA. */
  concentration: ConcentrationMetric;
  /** Evidência CONTEXTUAL — não participa do score nem do veredito. */
  newcomerContext: NewcomerContext;
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
 * λ = 1 − largura do intervalo ÷ escala.
 * Intervalo largo → λ baixo → score puxado para 50 (neutro).
 */
function shrinkFactor(band: { p5: number; p95: number } | null): number | null {
  if (band === null) return null;
  return Math.min(1, Math.max(0, 1 - (band.p95 - band.p5) / 100));
}

/**
 * Score = sinal estrutural encolhido pela própria incerteza.
 * Sinal bruto = 100 − concentração.
 */
function computeScore(
  concentration: ConcentrationMetric,
  lambda: number | null
): number | null {
  if (concentration.value === null || lambda === null) return null;
  const rawSignal = 100 - concentration.value;
  return Math.round(50 + (rawSignal - 50) * lambda);
}

/**
 * Veredito por condições interpretáveis, avaliadas nesta ordem.
 * A primeira que casar decide.
 */
function computeVerdict(
  concentration: ConcentrationMetric,
  evidence: EvidenceAssessment
): { verdict: Verdict; reasons: string[] } {
  // 1. Sem evidência não há recomendação.
  if (evidence.quality === "INSUFFICIENT") {
    return { verdict: "INSUFFICIENT_DATA", reasons: evidence.reasons };
  }
  if (concentration.value === null) {
    return {
      verdict: "INSUFFICIENT_DATA",
      reasons: [
        concentration.unavailableReason ??
          "Concentração não computável para esta amostra.",
      ],
    };
  }

  const C = concentration.value;
  const k = concentration.distinctChannels;

  // 2. NÃO — os três maiores capturam a audiência do tema.
  if (C >= VERDICT_LIMITS.concentrationSaturated) {
    return {
      verdict: "NO",
      reasons: [
        `Concentração de ${C}/100: os três maiores canais capturam a audiência deste tema.`,
      ],
    };
  }

  // 3. SIM — exige que TODO o intervalo de incerteza fique abaixo do
  //    limiar, não apenas a estimativa pontual, e evidência ≥ Média.
  const band = concentration.band;
  if (C < VERDICT_LIMITS.concentrationForYes) {
    if (band !== null && band.p95 >= VERDICT_LIMITS.concentrationForYes) {
      return {
        verdict: "MAYBE",
        reasons: [
          `Concentração de ${C}/100 permitiria SIM, mas o intervalo da medição vai até ${band.p95} e cruza o limiar de ${VERDICT_LIMITS.concentrationForYes}.`,
        ],
      };
    }
    if (!isAtLeast(evidence.quality, "MEDIUM")) {
      return {
        verdict: "MAYBE",
        reasons: [
          `Concentração de ${C}/100 permitiria SIM, mas a evidência é baixa — o motor não afirma oportunidade sobre amostra fraca.`,
          ...evidence.reasons,
        ],
      };
    }
    return {
      verdict: "YES",
      reasons: [
        `Concentração de ${C}/100 entre ${k} canais${band ? ` (intervalo ${band.p5}–${band.p95})` : ""}: a audiência do tema não está capturada por poucos canais.`,
      ],
    };
  }

  // 4. TALVEZ
  return {
    verdict: "MAYBE",
    reasons: [
      `Concentração de ${C}/100: o tema tem donos, ainda que não o dominem por completo.`,
    ],
  };
}

/** Ponto de entrada do motor. Puro e determinístico. */
export function decide(input: DecisionInput): DecisionResult {
  const videos = input.videos;

  const counters: EvidenceCounters = {
    sampleSize: videos.length,
    distinctChannels: distinctChannelCount(videos),
    discardedCount: input.discardedCount,
    rawCount: input.rawCount,
    newcomerCount: newcomerVideos(videos).length,
    unclassifiableCount: unclassifiableVideos(videos).length,
    usedFallback: input.usedFallback,
  };

  const concentration = computeConcentration(videos);
  const newcomerContext = describeNewcomers(videos);
  const evidence = assessEvidence(counters);
  const { verdict, reasons } = computeVerdict(concentration, evidence);

  const lambda = shrinkFactor(concentration.band);
  // Score só existe quando há veredito — número sem evidência por trás
  // é exatamente o que o V2 existe para não produzir.
  const score =
    verdict === "INSUFFICIENT_DATA" ? null : computeScore(concentration, lambda);

  return {
    verdict,
    opportunityScore: score,
    scoreBand: score === null ? null : bandFor(score),
    lambda: verdict === "INSUFFICIENT_DATA" ? null : lambda,
    quality: evidence.quality,
    counters,
    concentration,
    newcomerContext,
    reasons: [
      ...reasons,
      ...(verdict === "INSUFFICIENT_DATA" ? [] : evidence.reasons),
    ],
    parameters: currentParameters(),
  };
}
