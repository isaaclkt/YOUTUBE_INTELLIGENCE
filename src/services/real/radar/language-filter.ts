import type { LanguageCode } from "@/domain";

/**
 * Heurística de detecção de idioma em título+descrição, para o filtro
 * RÍGIDO do Radar: um vídeo em hindi/urdu não pode aparecer na
 * varredura PT-BR nem na EN/EUA.
 *
 * Duas camadas:
 * 1. Script: todos os idiomas-alvo usam alfabeto latino — texto
 *    dominado por Devanagari/árabe/CJK/cirílico etc. é descartado.
 * 2. Stopwords: pontua palavras funcionais de cada idioma-alvo e só
 *    descarta quando OUTRO idioma vence com folga (curto demais para
 *    julgar → aceita; na dúvida → aceita; falso descarte é pior).
 */

// Faixas de scripts não-latinos mais comuns no YouTube.
const NON_LATIN =
  /[Ѐ-ӿ԰-֏֐-׿؀-ۿ܀-ݏݐ-ݿऀ-ॿঀ-৿਀-੿઀-૿଀-୿஀-௿ఀ-౿ಀ-೿ഀ-ൿ฀-๿຀-໿က-႟Ⴀ-ჿក-៿぀-ヿ㐀-䶿一-鿿가-힯]/g;

const LATIN = /[a-zA-ZÀ-ɏ]/g;

/** Palavras funcionais frequentes por idioma (minúsculas, sem acento removido). */
export const STOPWORDS: Record<LanguageCode, readonly string[]> = {
  "pt-BR": ["de", "que", "não", "nao", "para", "com", "uma", "você", "voce", "mais", "por", "isso", "como", "dos", "das", "é", "está", "esta", "tem", "também", "sua", "seu", "fazer", "muito", "quando", "depois", "anos", "dias"],
  en: ["the", "and", "you", "how", "this", "that", "what", "with", "for", "why", "your", "are", "was", "have", "from", "will", "not", "but", "they", "his", "her", "when", "about", "into", "than"],
  es: ["el", "los", "las", "una", "con", "por", "para", "que", "del", "más", "mas", "este", "esta", "pero", "cómo", "como", "qué", "hay", "muy", "años", "cuando", "sobre", "hasta", "tiene", "hacer"],
  it: ["di", "che", "il", "la", "per", "con", "una", "del", "della", "più", "piu", "come", "sono", "questo", "questa", "anni", "quando", "dopo", "cosa", "fare", "gli", "nel", "alla", "dal"],
  fr: ["le", "la", "les", "des", "du", "et", "en", "une", "pour", "avec", "est", "plus", "comment", "vous", "dans", "qui", "que", "pas", "sur", "mais", "tout", "cette", "après", "ans"],
  de: ["der", "die", "das", "und", "ist", "nicht", "mit", "ein", "eine", "für", "fur", "auf", "wie", "man", "ich", "sie", "von", "dem", "den", "aus", "bei", "nach", "wenn", "aber", "jahre"],
};

/** Sinais fortes de diacríticos/ortografia por idioma. */
const DIACRITIC_HINTS: Partial<Record<LanguageCode, RegExp>> = {
  "pt-BR": /[ãõ]|ção|ções|lh[ao]/i,
  es: /[ñ¿¡]|ción|cómo/i,
  de: /ß|sch[a-z]|[äöü]/i,
  fr: /[œ]|ç[ao]|'est|qu'/i,
  it: /perch[éè]|gli\b|zione/i,
};

const LANGUAGES = Object.keys(STOPWORDS) as LanguageCode[];

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .match(/[a-zÀ-ɏ]+/g) ?? []
  );
}

function stopwordScore(tokens: readonly string[], language: LanguageCode): number {
  const set = new Set(STOPWORDS[language]);
  let score = 0;
  for (const token of tokens) {
    if (set.has(token)) score += 1;
  }
  return score;
}

/**
 * O texto (título + início da descrição) é compatível com o idioma-alvo?
 * Retorna false apenas com evidência clara de OUTRO idioma.
 */
export function matchesLanguage(
  title: string,
  description: string | undefined,
  target: LanguageCode
): boolean {
  const text = `${title} ${description?.slice(0, 300) ?? ""}`;

  // Camada 1 — script: dominância não-latina descarta para qualquer alvo.
  const nonLatin = (text.match(NON_LATIN) ?? []).length;
  const latin = (text.match(LATIN) ?? []).length;
  const totalLetters = nonLatin + latin;
  if (totalLetters >= 6 && nonLatin / totalLetters > 0.3) return false;

  // Camada 2 — stopwords (texto curto demais → aceita).
  const tokens = tokenize(text);
  if (tokens.length < 3) return true;

  let targetScore = stopwordScore(tokens, target);
  const hint = DIACRITIC_HINTS[target];
  if (hint?.test(text)) targetScore += 2;

  let bestOther = 0;
  for (const language of LANGUAGES) {
    if (language === target) continue;
    let score = stopwordScore(tokens, language);
    const otherHint = DIACRITIC_HINTS[language];
    if (otherHint?.test(text)) score += 2;
    bestOther = Math.max(bestOther, score);
  }

  // Descarta só quando outro idioma vence com folga E o alvo é fraco.
  if (bestOther >= 3 && bestOther > targetScore * 2 && targetScore <= 1) {
    return false;
  }
  return true;
}
