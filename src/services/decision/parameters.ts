/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — PARÂMETROS
 *
 * Todos os valores abaixo são LIMIARES OPERACIONAIS declarados,
 * não constantes empíricas. Eles existem para que o veredito seja
 * uma afirmação sobre uma régua que o operador escolheu, e não
 * sobre uma escala inventada pelo código.
 *
 * Ajustáveis por variável de ambiente para permitir calibração
 * futura contra o histórico real da operação. Valor inválido ou
 * ausente cai no padrão.
 * ============================================================
 */

function positiveEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Tier de coleta: "reduced" não mede pressão de oferta (poupa ~200u). */
export type DecisionTier = "reduced" | "full";

export function decisionTier(): DecisionTier {
  return process.env.DECISION_TIER === "full" ? "full" : "reduced";
}

/**
 * Piso e alvo de views do ENTRANTE — o par que define o veredito.
 * Piso: abaixo disto o vídeo não funcionou.
 * Alvo: com isto o operador ficaria satisfeito.
 */
export function viewsFloor(): number {
  return positiveEnv("DECISION_VIEWS_FLOOR", 5_000);
}
export function viewsTarget(): number {
  return positiveEnv("DECISION_VIEWS_TARGET", 100_000);
}

/** Teto de inscritos para o canal contar como "entrante". */
export function newcomerMaxSubscribers(): number {
  return positiveEnv("DECISION_NEWCOMER_MAX_SUBS", 50_000);
}

/** Âncoras da pressão de oferta, em vídeos por 30 dias. */
export function supplyLow(): number {
  return positiveEnv("DECISION_SUPPLY_LOW", 4);
}
export function supplyHigh(): number {
  return positiveEnv("DECISION_SUPPLY_HIGH", 60);
}

/**
 * Janela de amostragem, em dias.
 * Piso de 7 dias: antes disso o vídeo ainda acumula views no pico
 * inicial e a contagem não é comparável com a de um vídeo maduro.
 */
export const WINDOW_MIN_AGE_DAYS = 7;
export const WINDOW_MAX_AGE_DAYS = 90;

/** Pesos por tier. Somam 1 em ambos. */
export const WEIGHTS = {
  reduced: { reach: 0.6, concentration: 0.4 },
  full: { reach: 0.5, concentration: 0.3, supply: 0.2 },
} as const;

/** Limiares do veredito, na unidade de cada métrica. */
export const VERDICT_LIMITS = {
  /** Concentração a partir da qual o tema é considerado fechado. */
  concentrationSaturated: 65,
  /** Concentração máxima admitida para um SIM. */
  concentrationForYes: 50,
  /** Pressão de oferta máxima admitida para um SIM (só no tier full). */
  supplyForYes: 80,
} as const;

/** Amostra mínima para que o motor aceite emitir qualquer veredito. */
export const MIN_SAMPLE = {
  /** Vídeos long-form na janela, após todos os filtros. */
  videos: 20,
  /** Vídeos de canais entrantes — é o n por trás da mediana de M1. */
  newcomerVideos: 5,
  /** Canais distintos — abaixo disto a concentração não é interpretável. */
  distinctChannels: 4,
} as const;

/** Critérios objetivos de qualidade da evidência. */
export const EVIDENCE_CRITERIA = {
  high: {
    videos: 40,
    newcomerVideos: 12,
    maxUnclassifiableRatio: 0.15,
    maxDiscardRatio: 0.1,
    maxReachSpreadDecades: 1,
  },
  medium: {
    videos: 25,
    newcomerVideos: 8,
    maxUnclassifiableRatio: 0.3,
    maxDiscardRatio: 0.2,
  },
  low: {
    videos: MIN_SAMPLE.videos,
    newcomerVideos: MIN_SAMPLE.newcomerVideos,
    maxUnclassifiableRatio: 0.5,
    maxDiscardRatio: 0.5,
  },
} as const;

/** Faixas de exibição do score. O inteiro só ordena; a faixa comunica. */
export const SCORE_BANDS = [
  { min: 75, label: "Muito favorável" },
  { min: 60, label: "Favorável" },
  { min: 40, label: "Misto" },
  { min: 25, label: "Desfavorável" },
  { min: 0, label: "Muito desfavorável" },
] as const;

/**
 * Intervalo mínimo entre duas leituras para que a variação
 * longitudinal seja reportada. Abaixo disso o ruído domina.
 */
export const LONGITUDINAL_MIN_DAYS = 7;

/** Snapshot dos parâmetros em uso, para exibir junto do resultado. */
export interface DecisionParameters {
  viewsFloor: number;
  viewsTarget: number;
  newcomerMaxSubscribers: number;
  supplyLow: number;
  supplyHigh: number;
  windowMinAgeDays: number;
  windowMaxAgeDays: number;
  tier: DecisionTier;
}

export function currentParameters(
  tier: DecisionTier = decisionTier()
): DecisionParameters {
  return {
    viewsFloor: viewsFloor(),
    viewsTarget: viewsTarget(),
    newcomerMaxSubscribers: newcomerMaxSubscribers(),
    supplyLow: supplyLow(),
    supplyHigh: supplyHigh(),
    windowMinAgeDays: WINDOW_MIN_AGE_DAYS,
    windowMaxAgeDays: WINDOW_MAX_AGE_DAYS,
    tier,
  };
}
