import type { RadarNiche, RpmTier } from "@/domain";

/**
 * ============================================================
 * ⚠️  PESOS CALIBRÁVEIS — RPM POR TIER
 *
 * O tier de cada categoria agora é editável na tela ⚙️ Categorias
 * (persistido no SQLite). Aqui ficam apenas os PESOS por tier e os
 * rótulos — AJUSTAR com os números reais do AdSense da operação.
 * Regra de bolso dos tiers: alto = finanças, saúde adulto,
 * tecnologia/educação, história/documentário, marcas & consumo,
 * casa & manutenção; médio = curiosidades, automotivo, animais,
 * comida; baixo = temas visíveis mas de RPM fraco (infantil/música/
 * clipes virais já são EXCLUÍDOS na varredura pelos filtros).
 * ============================================================
 */

export type { RpmTier } from "@/domain";

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

/** Mapas de apresentação a partir das categorias persistidas. */
export function buildCategoryMaps(
  categories: ReadonlyArray<{ slug: string; name: string; rpmTier: RpmTier }>
): {
  labels: Record<string, string>;
  meta: Record<string, { name: string; tier: RpmTier }>;
  tiers: Record<string, RpmTier>;
} {
  const labels: Record<string, string> = {};
  const meta: Record<string, { name: string; tier: RpmTier }> = {};
  const tiers: Record<string, RpmTier> = {};
  for (const category of categories) {
    labels[category.slug] = category.name;
    meta[category.slug] = { name: category.name, tier: category.rpmTier };
    tiers[category.slug] = category.rpmTier;
  }
  return { labels, meta, tiers };
}

/**
 * Ranqueia "Nichos em aquecimento": concentração de outliers ×
 * multiplicador de RPM — nicho de RPM alto aquecendo vale mais que
 * viral de RPM baixo. `tiers` vem das categorias persistidas
 * (slug → tier); categoria desconhecida conta como "medium".
 */
export function rankNiches(
  niches: readonly RadarNiche[],
  options: {
    strictReplicable: boolean;
    tiers: Readonly<Record<string, RpmTier | undefined>>;
  }
): RadarNiche[] {
  const count = (n: RadarNiche) =>
    options.strictReplicable ? n.replicableOutlierCount : n.outlierCount;
  const weight = (n: RadarNiche) =>
    RPM_TIER_WEIGHT[options.tiers[n.category] ?? "medium"];
  return [...niches].sort(
    (a, b) =>
      count(b) * weight(b) - count(a) * weight(a) ||
      b.sampleCount - a.sampleCount
  );
}
