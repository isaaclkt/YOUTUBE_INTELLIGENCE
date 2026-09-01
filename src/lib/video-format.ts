import type { SampleVideo } from "@/domain";

/** Long-form = 4min+ — o formato da operação. */
export const LONGFORM_MIN_SECONDS = 240;

/** Marcação de Shorts no título. */
export const SHORTS_TITLE_TAG = /#shorts?\b/i;

/**
 * O vídeo da amostra é long-form? Título de Short não serve de fórmula
 * para vídeo longo. Análises antigas sem `durationSeconds` passam pelo
 * critério do título apenas (não dá para julgar a duração).
 */
export function isLongFormSample(video: SampleVideo): boolean {
  if (SHORTS_TITLE_TAG.test(video.title)) return false;
  if (video.durationSeconds === undefined) return true;
  return video.durationSeconds >= LONGFORM_MIN_SECONDS;
}
