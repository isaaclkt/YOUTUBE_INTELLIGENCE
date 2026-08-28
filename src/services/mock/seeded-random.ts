/**
 * PRNG determinístico (mulberry32) semeado por string.
 * Garante que a MESMA consulta (tema + idioma + país) sempre produza
 * os MESMOS dados mock — a demo fica coerente entre execuções.
 */

export type Rng = () => number;

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: string): Rng {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número real em [min, max). */
export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Inteiro em [min, max]. */
export function intBetween(rng: Rng, min: number, max: number): number {
  return Math.floor(between(rng, min, max + 1));
}

/** Escolhe `count` itens distintos do array, em ordem embaralhada. */
export function pickMany<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(count, copy.length));
}
