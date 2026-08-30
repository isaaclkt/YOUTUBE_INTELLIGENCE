import type { RadarFormat } from "@/domain";

/**
 * Filtros puros de formato (duração) da varredura do Radar.
 * Long-form = 4min+ E sem "#shorts" no título — cinto e suspensório
 * sobre o videoDuration da API, que às vezes deixa escapar.
 */

export const LONGFORM_MIN_SECONDS = 240;

const SHORTS_TAG = /#shorts?\b/i;

/** "PT1H2M30S" → segundos. 0 quando ausente/inválido. */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

/** O vídeo pertence ao formato varrido? */
export function matchesFormat(
  format: RadarFormat,
  durationSeconds: number,
  title: string
): boolean {
  const tagged = SHORTS_TAG.test(title);
  if (format === "longform") {
    return durationSeconds >= LONGFORM_MIN_SECONDS && !tagged;
  }
  // shorts: duração conhecida abaixo de 4min, ou marcado #shorts.
  return (
    (durationSeconds > 0 && durationSeconds < LONGFORM_MIN_SECONDS) ||
    (durationSeconds === 0 && tagged)
  );
}
