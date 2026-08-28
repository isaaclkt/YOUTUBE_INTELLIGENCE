import type { Topic } from "@/domain";

/** Latência artificial para simular chamadas de rede (só nos mocks). */
export function simulateLatency(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Seed canônica de um tópico: mesma entrada → mesmos dados mock. */
export function seedFor(topic: Topic, salt = ""): string {
  return `${topic.query.trim().toLowerCase()}|${topic.language}|${topic.country}|${salt}`;
}

// Padrões que deixam o mock mais crível: temas "quentes" ganham mais
// demanda (e mais concorrência); recortes de nicho, menos volume.
const HOT_PATTERNS: readonly RegExp[] = [
  /intelig[êe]ncia artificial/i,
  /\b(ia|ai)\b/i,
  /chatgpt|gpt|claude|gemini/i,
  /finan|invest|renda extra/i,
  /cripto|crypto|bitcoin/i,
  /air ?fryer|receita/i,
  /emagre|dieta|fitness|treino/i,
  /minecraft|roblox|fortnite/i,
  /ingl[êe]s|espanhol|idioma/i,
  /concurso|enem/i,
  /viagem|travel/i,
];

const NICHE_PATTERNS: readonly RegExp[] = [
  /avan[çc]ad/i,
  /profissional|enterprise|b2b/i,
  /colecion|vintage|retr[ôo]/i,
];

/** "Calor" estimado do tema, 0.05–1. Influencia volume e demanda no mock. */
export function topicHeat(query: string): number {
  const q = query.toLowerCase();
  let heat = 0.35;
  for (const pattern of HOT_PATTERNS) {
    if (pattern.test(q)) heat += 0.16;
  }
  for (const pattern of NICHE_PATTERNS) {
    if (pattern.test(q)) heat -= 0.12;
  }
  // consultas muito longas costumam ser recortes específicos
  if (q.length > 60) heat -= 0.08;
  return Math.min(1, Math.max(0.05, heat));
}
