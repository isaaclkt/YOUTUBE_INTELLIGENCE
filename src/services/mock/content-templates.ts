import type {
  Opportunity,
  OpportunityPotential,
  Scores,
  SuggestedTitle,
  Topic,
  Verdict,
} from "@/domain";
import type { ComputedMetrics } from "../contracts";
import { createRng, pickMany } from "./seeded-random";
import { seedFor } from "./simulate";

/**
 * Templates de conteúdo do interpretador MOCK — também usados como
 * fallback quando a chamada real à IA falha. A versão real (Anthropic)
 * gera conteúdo específico do tema; estes são genéricos por natureza.
 */

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * `avoidIf` pula o template quando a consulta já contém a ideia
 * (evita saídas redundantes como "X para iniciantes para iniciantes").
 */
const ANGLE_TEMPLATES: ReadonlyArray<{
  make: (query: string) => string;
  avoidIf?: RegExp;
}> = [
  {
    make: (q) => `${capitalize(q)} para iniciantes absolutos`,
    avoidIf: /iniciante|começ|básic/i,
  },
  { make: (q) => `Erros comuns em ${q} (e como evitar)`, avoidIf: /erro/i },
  { make: (q) => `${capitalize(q)} na prática: resultados reais em 30 dias` },
  {
    make: (q) => `${capitalize(q)} gastando quase nada`,
    avoidIf: /barat|grátis|gratuito|sem gastar/i,
  },
  { make: (q) => `O que ninguém conta sobre ${q}` },
  { make: (q) => `${capitalize(q)} em 2026: o que mudou e o que ainda funciona` },
];

const TITLE_TEMPLATES: ReadonlyArray<{
  make: (query: string) => string;
  why: string;
  avoidIf?: RegExp;
}> = [
  {
    make: (q) => `Eu testei ${q} por 30 dias — olha o que aconteceu`,
    why: "Formato de experimento pessoal gera curiosidade e credibilidade sem prometer resultado.",
  },
  {
    make: (q) => `${capitalize(q)}: o guia que eu queria ter visto antes de começar`,
    why: "Fala direto com iniciantes e sinaliza aprendizado condensado, o público mais numeroso.",
  },
  {
    make: (q) => `5 erros que iniciantes cometem em ${q}`,
    why: "Número concreto + medo de errar elevam o CTR sem cair em clickbait vazio.",
    avoidIf: /iniciante|erro/i,
  },
  {
    make: (q) =>
      `Por que todo mundo está falando de ${q} (e o que estão ignorando)`,
    why: "Surfa a conversa do momento e promete um ângulo contrário, pouco explorado.",
  },
  {
    make: (q) => `${capitalize(q)} explicado em 10 minutos`,
    why: "Promessa clara de tempo reduz fricção e captura buscas informacionais.",
  },
];

/** Mantém só templates compatíveis com a consulta, sem redundância. */
function compatible<T extends { avoidIf?: RegExp }>(
  templates: readonly T[],
  query: string,
  minimum: number
): T[] {
  const filtered = templates.filter((t) => !t.avoidIf || !t.avoidIf.test(query));
  // Se o filtro for agressivo demais, volta para a lista completa.
  return filtered.length >= minimum ? filtered : [...templates];
}

/** 3 ângulos com potencial ancorado nos scores e motivos citando métricas. */
export function buildAngles(
  topic: Topic,
  metrics: ComputedMetrics,
  scores: Scores
): Opportunity[] {
  const rng = createRng(seedFor(topic, "angles"));
  const templates = pickMany(rng, compatible(ANGLE_TEMPLATES, topic.query, 3), 3);

  // Potencial decresce do 1º para o 3º ângulo, ancorado no score geral.
  const ladder: OpportunityPotential[] =
    scores.opportunity >= 60
      ? ["HIGH", "HIGH", "MEDIUM"]
      : scores.opportunity >= 40
        ? ["HIGH", "MEDIUM", "MEDIUM"]
        : ["MEDIUM", "MEDIUM", "LOW"];

  const reasons = [
    `A demanda geral está em ${metrics.demandIndex}/100, mas este recorte aparece pouco nos resultados — espaço para se posicionar.`,
    `Com saturação de ${metrics.saturationIndex}/100 no tema amplo, recortes específicos como este competem bem menos.`,
    `Um formato mais pessoal se diferencia do conteúdo genérico que domina temas com concorrência ${metrics.competitionIndex}/100.`,
  ];

  return templates.map((template, index) => ({
    angle: template.make(topic.query),
    potential: ladder[index] ?? "MEDIUM",
    reason: reasons[index % reasons.length] ?? reasons[0]!,
  }));
}

/** 3 títulos de template com o porquê de cada um. */
export function buildTitles(topic: Topic): SuggestedTitle[] {
  const rng = createRng(seedFor(topic, "titles"));
  return pickMany(rng, compatible(TITLE_TEMPLATES, topic.query, 3), 3).map(
    ({ make, why }) => ({ title: make(topic.query), whyItWorks: why })
  );
}

/** Texto da recomendação final por veredito, citando scores reais. */
export function buildRecommendationSummary(
  topic: Topic,
  scores: Scores,
  verdict: Verdict
): string {
  if (verdict === "YES") {
    return `Vale a pena investir em "${topic.query}". A demanda (${scores.demand}/100) sustenta novos vídeos e ainda há espaço para entrar. Comece por um dos ângulos sugeridos, publique com consistência por algumas semanas e só então avalie os resultados.`;
  }
  if (verdict === "MAYBE") {
    return `"${topic.query}" pode funcionar, mas com ressalvas. Evite o tema amplo: escolha um dos ângulos pouco explorados e valide com 2–3 vídeos antes de apostar mais tempo. Acompanhe a tendência (${scores.trend}/100) para decidir se acelera.`;
  }
  return `Neste momento, "${topic.query}" não parece um bom investimento de tempo: a combinação de concorrência (${scores.competition}/100) e saturação (${scores.saturation}/100) joga contra canais entrando agora. Considere um recorte mais específico ou outro tema.`;
}
