import type { LanguageCode } from "./topic";

/** Tier de RPM de uma categoria (calibrável na tela ⚙️ Categorias). */
export type RpmTier = "high" | "medium" | "low";

/**
 * Uma categoria de varredura do Radar, gerenciável pela interface e
 * persistida no SQLite. A varredura usa apenas as ativas; cada semente
 * é UMA consulta por idioma com 2–4 termos separados por "|" (OR),
 * no fraseado dark da operação.
 */
export interface RadarCategoryConfig {
  id: string;
  slug: string;
  name: string;
  rpmTier: RpmTier;
  active: boolean;
  /** Consulta-semente por idioma (ausente = categoria não varre o idioma). */
  seeds: Partial<Record<LanguageCode, string>>;
}
