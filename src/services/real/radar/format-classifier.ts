/**
 * Classificação heurística "replicável" (dark/faceless): a operação
 * replica FORMATOS, não personalidades. Só sinais textuais estão
 * disponíveis — título, descrição, tags (quando vêm no videos.list) e
 * nome do canal; thumbs/rostos ficam de fora.
 *
 * Pontuação (listas CALIBRÁVEIS):
 *   replicável   = nº de sinais de formato replicável (peso 1)
 *   personalidade = sinais fracos (peso 1) + sinais FORTES (peso 2:
 *                   podcast/cortes, entrevista, highlights de esporte,
 *                   trailer, clipe musical) + canal com nome de pessoa
 * É replicável quando: replicável > 0 E replicável > personalidade.
 * Um único sinal forte já derruba títulos com 1–2 sinais replicáveis.
 */

export interface ClassifierInput {
  title: string;
  channelTitle: string;
  description?: string;
  tags?: readonly string[];
}

/** Sinais de formato replicável (documentário, ranking, narração...). */
const REPLICABLE_PATTERNS: readonly RegExp[] = [
  /document[áa]rio|documentary|documental|documentaire|\bdoku\b/i,
  /top ?\d+|top ten|ranking/i,
  /hist[óo]ria d[eao]|history of|story of|historia de|storia di|histoire de|geschichte (von|der|des)/i,
  /compila[çc][ãa]o|compilation|compilaci[óo]n/i,
  /narrad[oa]|narrated|narraci[óo]n|narrazione/i,
  /explicad[oa]|explained|explicaci[óo]n|expliqu[ée]e?|erkl[äa]rt|spiegat[oa]/i,
  /\bfatos\b|\bfacts\b|\bdatos\b|\bfatti\b|\bfaits\b|\bfakten\b/i,
  /o que aconteceu|what happened|qu[ée] pas[óo]|cosa [èe] successo|qu'est-il arriv[ée]|was (geschah|passierte)/i,
  /como funciona|how .{0,14}works?|c[óo]mo funciona|come funziona|comment fonctionne|wie .{0,14}funktioniert/i,
  /mist[ée]rios?|mystery|mysteries|misterios?|misteri\b|myst[èe]res?|geheimnis|mysterien/i,
  /a verdade sobre|the truth about|la verdad de|la verit[àa] su|la v[ée]rit[ée] sur|die wahrheit [üu]ber/i,
  /evolu[çc][ãa]o|evolution|evoluci[óo]n|evoluzione/i,
  /curiosidades|curiosit[àa]|curiosit[ée]s|kurioses/i,
  /\basmr\b/i,
  /por ?qu[eê]\b|\bwhy\b|pourquoi|warum|perch[ée]/i,
  /ascens[ãa]o e queda|rise and fall|auge y ca[íi]da|ascesa e caduta|aufstieg und fall/i,
  /como [ée] feito|how it'?s made|c[óo]mo se hace|come si fa|comment c'est fait|wie es gemacht wird/i,
];

/** Sinais fracos de personalidade (peso 1). */
const PERSONALITY_PATTERNS: readonly RegExp[] = [
  /\bvlogs?\b/i,
  /rea[çc][ãa]o|\breact\b|reaction|reacciono|r[ée]action/i,
  /challenge|desafio|desaf[íi]o|\breto\b|sfida|d[ée]fi\b/i,
  /\bdaily\b|di[áa]rio d[aeo]|rotina|routine|rutina|\bgrwm\b/i,
  /minha vida|meu dia|my life|a day in my life|mi vida|un d[íi]a en mi|la mia giornata|ma vie|mein (tag|leben)/i,
  /eu testei|i (tried|tested)|prob[ée] |j'ai test[ée]|ich habe .{0,12}getestet|ho provato/i,
  /story ?time/i,
];

/**
 * Sinais FORTES de autoridade/personalidade (peso 2): conteúdo preso
 * a uma pessoa, marca ou direito — não replicável por definição.
 */
const STRONG_PERSONALITY_PATTERNS: readonly RegExp[] = [
  /podcast|videocast|\bcortes\b|podpah|flow ?podcast/i,
  /entrevista|interview|intervista|entretien/i,
  /highlights?|melhores momentos|\bgols\b|\bgoals\b|resumen del partido|full match|melhores jogadas|post[- ]?match|bastidores do jogo/i,
  /\btrailer\b|\bteaser\b/i,
  /official (music )?video|official audio|video ?clipe|clipe oficial|videoclip|lyric video|\bmv\b|letra oficial|[áa]udio oficial|ao vivo no palco/i,
];

/** Palavras que indicam canal de marca/nicho (NÃO nome de pessoa). */
const CHANNEL_BRAND_HINTS =
  /\btv\b|channel|canal|oficial|official|docs?\b|hist[óo]ria|motors?|studio|st[úu]dio|media|news|team|club|prod|filmes?|gaming|music|mundo|planet|fatos|facts|docu/i;

/**
 * Canal cujo nome é claramente nome de pessoa (2–3 palavras
 * capitalizadas, sem dígitos/símbolos, sem termos de marca).
 * Conta como sinal de personalidade (peso 1) — heurística.
 */
export function looksLikePersonName(channelTitle: string): boolean {
  const trimmed = channelTitle.trim();
  if (/[0-9@|._&+-]/.test(trimmed)) return false;
  if (CHANNEL_BRAND_HINTS.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 3) return false;
  return words.every((word) => /^[A-ZÀ-Ý][a-zà-ÿ']{2,}$/.test(word));
}

function countHits(patterns: readonly RegExp[], text: string): number {
  let hits = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) hits += 1;
  }
  return hits;
}

/** O vídeo tem formato replicável (dark-friendly)? */
export function classifyReplicable(input: ClassifierInput): boolean {
  const text = [
    input.title,
    (input.tags ?? []).join(" "),
    input.description?.slice(0, 200) ?? "",
  ].join(" ");

  const replicable = countHits(REPLICABLE_PATTERNS, text);
  let personality =
    countHits(PERSONALITY_PATTERNS, text) +
    2 * countHits(STRONG_PERSONALITY_PATTERNS, text);
  if (/\bvlogs?\b|\bdaily\b/i.test(input.channelTitle)) personality += 1;
  if (looksLikePersonName(input.channelTitle)) personality += 1;

  return replicable > 0 && replicable > personality;
}
