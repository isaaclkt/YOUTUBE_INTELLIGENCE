import type { RadarFormat } from "@/domain";
import { LONGFORM_MIN_SECONDS, SHORTS_TITLE_TAG } from "@/lib/video-format";

/**
 * Filtros puros de formato (duração) da varredura do Radar.
 * Long-form = 4min+ E sem "#shorts" no título — cinto e suspensório
 * sobre o videoDuration da API, que às vezes deixa escapar.
 * Constantes compartilhadas em src/lib/video-format.ts.
 */

const SHORTS_TAG = SHORTS_TITLE_TAG;

/**
 * "PT1H2M30S" → segundos. 0 quando ausente/inválido.
 *
 * Aceita o componente de DIAS ("P1DT2H30M"): a API usa esse formato
 * para vídeos acima de 24h (lives longas, compilações estendidas), e
 * sem ele o parser devolvia 0 e o vídeo era silenciosamente descartado
 * do long-form.
 */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  // O separador "T" só existe quando há componentes de tempo: uma
  // duração de dias inteiros é "P1D", sem T. Por isso o bloco de
  // tempo inteiro é opcional.
  const match =
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match) return 0;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Conteúdo infantil (RPM baixo): madeForKids da API OU heurística de
 * título multi-idioma (nursery rhymes, desenhos, cocomelon-like).
 * O Radar reflete o que ADULTOS assistem — nichos monetizáveis.
 */
const KIDS_PATTERNS: readonly RegExp[] = [
  /nursery rhym|kids? songs?|kids? videos?|for kids|for children|for toddlers/i,
  /cocomelon|baby ?shark|chu ?chu ?tv|little angel|peppa|paw patrol|blippi/i,
  /desenho infantil|para crian[çc]as|m[úu]sica infantil|can[çc][ãa]o infantil/i,
  /galinha pintadinha|mundo bita|bolofofos|patati patat[áa]/i,
  /canciones infantiles|para ni[ñn]os|dibujos animados|videos? infantiles/i,
  /per bambini|cartoni animati|canzoni per bambini/i,
  /pour enfants|comptines?|dessins? anim[ée]s?/i,
  /f[üu]r kinder|kinderlieder|zeichentrick|kinderfilm/i,
  /learn colors|abc song|123 song|finger family/i,
];

export function isKidsContent(
  title: string,
  madeForKids: boolean | undefined
): boolean {
  if (madeForKids === true) return true;
  return KIDS_PATTERNS.some((pattern) => pattern.test(title));
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
