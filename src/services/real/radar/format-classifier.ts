/**
 * Classificação heurística "replicável" (dark/faceless): a operação
 * replica FORMATOS, não personalidades. Só sinais textuais estão
 * disponíveis (título + nome do canal) — thumbs/rostos ficam de fora.
 *
 * Regra: precisa ter ao menos 1 sinal de formato replicável E mais
 * sinais replicáveis do que de personalidade. Listas CALIBRÁVEIS.
 */

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

/** Sinais de conteúdo de personalidade (vlog, reação, rotina...). */
const PERSONALITY_PATTERNS: readonly RegExp[] = [
  /\bvlogs?\b/i,
  /rea[çc][ãa]o|\breact\b|reaction|reacciono|r[ée]action/i,
  /challenge|desafio|desaf[íi]o|\breto\b|sfida|d[ée]fi\b/i,
  /\bdaily\b|di[áa]rio d[aeo]|rotina|routine|rutina|\bgrwm\b/i,
  /minha vida|meu dia|my life|a day in my life|mi vida|un d[íi]a en mi|la mia giornata|ma vie|mein (tag|leben)/i,
  /eu testei|i (tried|tested)|prob[ée] |j'ai test[ée]|ich habe .{0,12}getestet|ho provato/i,
  /story ?time/i,
];

function countHits(patterns: readonly RegExp[], text: string): number {
  let hits = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) hits += 1;
  }
  return hits;
}

/** O vídeo tem formato replicável (dark-friendly)? */
export function classifyReplicable(
  title: string,
  channelTitle: string
): boolean {
  const replicable = countHits(REPLICABLE_PATTERNS, title);
  let personality = countHits(PERSONALITY_PATTERNS, title);
  if (/\bvlogs?\b|\bdaily\b/i.test(channelTitle)) personality += 1;
  return replicable > 0 && replicable > personality;
}
