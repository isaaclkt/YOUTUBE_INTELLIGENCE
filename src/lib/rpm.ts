import type { NicheCategory, RadarNiche } from "@/domain";

/**
 * ============================================================
 * ⚠️  TABELA CALIBRÁVEL — TIER DE RPM POR CATEGORIA
 *
 * Valores iniciais por conhecimento geral de mercado; AJUSTAR com os
 * números reais do AdSense da operação. Regra de bolso usada aqui:
 *   alto  = finanças, saúde (adulto), tecnologia/educação,
 *           história/documentário
 *   médio = curiosidades, automotivo, animais, comida
 *   baixo = entretenimento infantil, música, clipes virais sem nicho
 *           (os dois últimos já são EXCLUÍDOS na varredura pelos
 *           filtros de kids e de clipe musical — o tier "low" fica
 *           para categorias futuras que mereçam permanecer visíveis
 *           com peso reduzido)
 * Categorias novas do Radar devem ganhar uma linha aqui.
 * ============================================================
 */

export type RpmTier = "high" | "medium" | "low";

export const CATEGORY_RPM_TIER: Record<NicheCategory, RpmTier> = {
  financas: "high",
  saude: "high",
  historia: "high", // história/documentário
  religiao: "medium", // CALIBRÁVEL: nicho central da operação — medir RPM real
  curiosidades: "medium",
  automotivo: "medium",
  animais: "medium",
  comida: "medium",
};

/** CALIBRÁVEL: multiplicador de ordenação por tier. */
export const RPM_TIER_WEIGHT: Record<RpmTier, number> = {
  high: 1.5,
  medium: 1.0,
  low: 0.4,
};

export const RPM_TIER_LABELS: Record<RpmTier, string> = {
  high: "RPM alto",
  medium: "RPM médio",
  low: "RPM baixo",
};

export function rpmWeight(category: NicheCategory): number {
  return RPM_TIER_WEIGHT[CATEGORY_RPM_TIER[category]];
}

/**
 * Ranqueia "Nichos em aquecimento": concentração de outliers ×
 * multiplicador de RPM — nicho de RPM alto aquecendo vale mais que
 * viral de RPM baixo. No modo estrito contam só outliers replicáveis.
 */
export function rankNiches(
  niches: readonly RadarNiche[],
  options: { strictReplicable: boolean }
): RadarNiche[] {
  const count = (n: RadarNiche) =>
    options.strictReplicable ? n.replicableOutlierCount : n.outlierCount;
  return [...niches].sort(
    (a, b) =>
      count(b) * rpmWeight(b.category) - count(a) * rpmWeight(a.category) ||
      b.sampleCount - a.sampleCount
  );
}
