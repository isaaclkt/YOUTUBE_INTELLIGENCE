/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — QUALIDADE DA EVIDÊNCIA
 *
 * Classificação ORDINAL, não percentual. Um percentual implicaria
 * um modelo probabilístico, que exigiria amostragem aleatória —
 * e a amostra vem ordenada pela relevância do YouTube, que é um
 * processo desconhecido. Só estatística descritiva é defensável.
 * ============================================================
 */

import { EVIDENCE_CRITERIA, MIN_SAMPLE } from "./parameters";

export type EvidenceQuality = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

/** Contadores brutos que sustentam a classificação — sempre exibidos junto. */
export interface EvidenceCounters {
  /** Vídeos na amostra após todos os filtros (n). */
  sampleSize: number;
  /** Vídeos de canais entrantes (n_E) — o n por trás de M1. */
  newcomerCount: number;
  /** Vídeos cujo canal não pôde ser classificado (n_U). */
  unclassifiableCount: number;
  /** Canais distintos na amostra (k). */
  distinctChannels: number;
  /** Vídeos descartados pelo gate de validade. */
  discardedCount: number;
  /** Vídeos recebidos da API antes de qualquer filtro. */
  rawCount: number;
  /** Dispersão das views dos entrantes, em ordens de grandeza. */
  reachSpreadDecades: number | null;
  /** true quando qualquer insumo veio de fallback demonstrativo. */
  usedFallback: boolean;
}

export interface EvidenceAssessment {
  quality: EvidenceQuality;
  counters: EvidenceCounters;
  /** Motivos legíveis quando a qualidade não é HIGH. */
  reasons: string[];
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

/**
 * Classifica a evidência. A ordem importa: INSUFFICIENT é avaliada
 * primeiro e é terminal — nenhum veredito é emitido a partir dela.
 */
export function assessEvidence(counters: EvidenceCounters): EvidenceAssessment {
  const reasons: string[] = [];
  const unclassifiableRatio = ratio(counters.unclassifiableCount, counters.sampleSize);
  const discardRatio = ratio(counters.discardedCount, counters.rawCount);

  // ---- INSUFFICIENT: qualquer uma destas impede recomendação ----
  if (counters.usedFallback) {
    reasons.push(
      "Algum insumo veio de dados demonstrativos — o motor não emite veredito sobre dado simulado."
    );
  }
  if (counters.sampleSize < MIN_SAMPLE.videos) {
    reasons.push(
      `Amostra de ${counters.sampleSize} vídeo(s) long-form na janela; mínimo ${MIN_SAMPLE.videos}.`
    );
  }
  if (counters.newcomerCount < MIN_SAMPLE.newcomerVideos) {
    reasons.push(
      `Apenas ${counters.newcomerCount} vídeo(s) de canais entrantes; mínimo ${MIN_SAMPLE.newcomerVideos}.`
    );
  }
  if (counters.distinctChannels < MIN_SAMPLE.distinctChannels) {
    reasons.push(
      `Apenas ${counters.distinctChannels} canal(is) distinto(s); mínimo ${MIN_SAMPLE.distinctChannels}.`
    );
  }
  if (unclassifiableRatio > EVIDENCE_CRITERIA.low.maxUnclassifiableRatio) {
    reasons.push(
      `${Math.round(unclassifiableRatio * 100)}% dos canais sem contagem de inscritos visível; limite ${Math.round(EVIDENCE_CRITERIA.low.maxUnclassifiableRatio * 100)}%.`
    );
  }
  if (discardRatio > EVIDENCE_CRITERIA.low.maxDiscardRatio) {
    reasons.push(
      `${Math.round(discardRatio * 100)}% da amostra bruta descartada por inconsistência; limite ${Math.round(EVIDENCE_CRITERIA.low.maxDiscardRatio * 100)}%.`
    );
  }
  if (reasons.length > 0) {
    return { quality: "INSUFFICIENT", counters, reasons };
  }

  // ---- HIGH ----
  const high = EVIDENCE_CRITERIA.high;
  const spreadOk =
    counters.reachSpreadDecades === null ||
    counters.reachSpreadDecades <= high.maxReachSpreadDecades;
  if (
    counters.sampleSize >= high.videos &&
    counters.newcomerCount >= high.newcomerVideos &&
    unclassifiableRatio <= high.maxUnclassifiableRatio &&
    discardRatio <= high.maxDiscardRatio &&
    spreadOk
  ) {
    return { quality: "HIGH", counters, reasons: [] };
  }

  // ---- MEDIUM ----
  const medium = EVIDENCE_CRITERIA.medium;
  if (
    counters.sampleSize >= medium.videos &&
    counters.newcomerCount >= medium.newcomerVideos &&
    unclassifiableRatio <= medium.maxUnclassifiableRatio &&
    discardRatio <= medium.maxDiscardRatio
  ) {
    if (!spreadOk) {
      reasons.push(
        `Views dos entrantes dispersas em ${counters.reachSpreadDecades} ordens de grandeza — a mediana descreve mal a amostra.`
      );
    }
    return { quality: "MEDIUM", counters, reasons };
  }

  // ---- LOW ----
  reasons.push(
    `Amostra no limite inferior (${counters.sampleSize} vídeos, ${counters.newcomerCount} de entrantes) — insuficiente para afirmar oportunidade.`
  );
  return { quality: "LOW", counters, reasons };
}

/** Ordem para comparações do tipo "pelo menos Média". */
const RANK: Record<EvidenceQuality, number> = {
  INSUFFICIENT: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export function isAtLeast(
  quality: EvidenceQuality,
  minimum: EvidenceQuality
): boolean {
  return RANK[quality] >= RANK[minimum];
}
