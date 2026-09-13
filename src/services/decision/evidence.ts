/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — QUALIDADE DA EVIDÊNCIA
 *
 * Classificação ORDINAL, não percentual. Um percentual implicaria
 * modelo probabilístico, que exigiria amostragem aleatória — e a
 * amostra vem ordenada pela relevância do YouTube, um processo
 * desconhecido. Só estatística descritiva é defensável.
 *
 * Os critérios cobrem apenas o que sustenta a CONCENTRAÇÃO, a única
 * métrica decisiva. Contagem de entrantes e de inscritos ocultos
 * passaram a ser contadores descritivos: não decidem nada, logo não
 * podem impedir um veredito.
 * ============================================================
 */

import { EVIDENCE_CRITERIA, MIN_SAMPLE } from "./parameters";

export type EvidenceQuality = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

/** Contadores brutos exibidos junto da classificação. */
export interface EvidenceCounters {
  /** Vídeos na amostra após todos os filtros (n). */
  sampleSize: number;
  /** Canais distintos (k) — sustenta a concentração. */
  distinctChannels: number;
  /** Vídeos descartados pelo gate de validade. */
  discardedCount: number;
  /** Vídeos recebidos da API antes de qualquer filtro. */
  rawCount: number;
  /** Descritivo: vídeos de canais dentro do recorte de entrante. */
  newcomerCount: number;
  /** Descritivo: vídeos cujo canal não pôde ser classificado. */
  unclassifiableCount: number;
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
 * Classifica a evidência. INSUFFICIENT é avaliada primeiro e é
 * terminal — nenhum veredito é emitido a partir dela.
 */
export function assessEvidence(counters: EvidenceCounters): EvidenceAssessment {
  const reasons: string[] = [];
  const discardRatio = ratio(counters.discardedCount, counters.rawCount);

  // ---- INSUFFICIENT ----
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
  if (counters.distinctChannels < MIN_SAMPLE.distinctChannels) {
    reasons.push(
      `Apenas ${counters.distinctChannels} canal(is) distinto(s); mínimo ${MIN_SAMPLE.distinctChannels}.`
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
  if (
    counters.sampleSize >= high.videos &&
    counters.distinctChannels >= high.channels &&
    discardRatio <= high.maxDiscardRatio
  ) {
    return { quality: "HIGH", counters, reasons: [] };
  }

  // ---- MEDIUM ----
  const medium = EVIDENCE_CRITERIA.medium;
  if (
    counters.sampleSize >= medium.videos &&
    counters.distinctChannels >= medium.channels &&
    discardRatio <= medium.maxDiscardRatio
  ) {
    return { quality: "MEDIUM", counters, reasons };
  }

  // ---- LOW ----
  reasons.push(
    `Amostra no limite inferior (${counters.sampleSize} vídeos, ${counters.distinctChannels} canais) — insuficiente para afirmar oportunidade.`
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
