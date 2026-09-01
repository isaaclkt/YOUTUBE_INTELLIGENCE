import type { WindowVerdict } from "@/domain";

/**
 * ============================================================
 * ⚠️  VEREDITO DA JANELA — REGRAS CALIBRÁVEIS DO MOTOR
 *
 * O veredito por idioma vem DAQUI, nunca da IA. Limiares iniciais
 * plausíveis, a calibrar com resultados reais da operação.
 * Usado pelo verificador real E pelo mock (consistência garantida).
 * ============================================================
 */

/** Abaixo disso, quase ninguém produz long-form recente → janela. */
export const OPEN_MAX_RECENT_LONGFORM = 12;
/** Domínio de canais fortes que caracteriza saturação. */
export const SATURATED_MIN_STRONG_SHARE = 0.5;
/** Com até este nº de outliers ativos, o domínio dos fortes fecha a porta. */
export const SATURATED_MAX_ACTIVE_OUTLIERS = 2;
/** Sinal de janela: outliers ativos com fortes ainda minoritários. */
export const OPEN_MIN_ACTIVE_OUTLIERS = 3;
export const OPEN_MAX_STRONG_SHARE = 0.35;

export function computeWindowVerdict(metrics: {
  recentLongFormCount: number;
  strongChannelShare: number;
  activeOutliers: number;
}): WindowVerdict {
  if (metrics.recentLongFormCount < OPEN_MAX_RECENT_LONGFORM) {
    return "OPEN";
  }
  if (
    metrics.strongChannelShare >= SATURATED_MIN_STRONG_SHARE &&
    metrics.activeOutliers <= SATURATED_MAX_ACTIVE_OUTLIERS
  ) {
    return "SATURATED";
  }
  if (
    metrics.activeOutliers >= OPEN_MIN_ACTIVE_OUTLIERS &&
    metrics.strongChannelShare < OPEN_MAX_STRONG_SHARE
  ) {
    return "OPEN";
  }
  return "CONTESTED";
}
