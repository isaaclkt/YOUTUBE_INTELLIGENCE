import type {
  Market,
  Opportunity,
  OpportunityPotential,
  Scores,
  SuggestedTitle,
  Topic,
} from "@/domain";
import { COUNTRY_LABELS } from "@/lib/constants";
import type {
  ComputedMetrics,
  NormalizedData,
  OpportunityEngine,
  RawCountrySignal,
} from "../contracts";
import { computeMarketScore } from "./formulas";
import { createRng, pickMany } from "./seeded-random";
import { seedFor, simulateLatency } from "./simulate";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function marketReason(signal: RawCountrySignal): string {
  const interest =
    signal.searchInterest >= 65
      ? "Interesse de busca alto"
      : signal.searchInterest >= 40
        ? "Interesse de busca moderado"
        : "Interesse de busca ainda pequeno";
  const competition =
    signal.competitionLevel <= 40
      ? "concorrência local baixa"
      : signal.competitionLevel <= 65
        ? "concorrência local média"
        : "concorrência local intensa";
  return `${interest} (${signal.searchInterest}/100) com ${competition} (${signal.competitionLevel}/100).`;
}

/**
 * Recortes genéricos que funcionam para qualquer tema (fase mock).
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

/**
 * MOCK da etapa de oportunidades. Mercados vêm dos sinais por país;
 * ângulos e títulos vêm de templates escolhidos deterministicamente.
 * A fase real pode usar LLM + dados de lacunas de conteúdo.
 */
export class MockOpportunityEngine implements OpportunityEngine {
  async rankMarkets(_topic: Topic, data: NormalizedData): Promise<Market[]> {
    return data.countrySignals
      .map((signal) => ({
        signal,
        score: computeMarketScore(signal.searchInterest, signal.competitionLevel),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ signal, score }) => ({
        country: signal.country,
        countryName: COUNTRY_LABELS[signal.country],
        score,
        reason: marketReason(signal),
      }));
  }

  async findAngles(
    topic: Topic,
    metrics: ComputedMetrics,
    scores: Scores
  ): Promise<Opportunity[]> {
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

  async suggestTitles(
    topic: Topic,
    _angles: Opportunity[]
  ): Promise<SuggestedTitle[]> {
    await simulateLatency(150, 350);
    const rng = createRng(seedFor(topic, "titles"));
    return pickMany(rng, compatible(TITLE_TEMPLATES, topic.query, 3), 3).map(({ make, why }) => ({
      title: make(topic.query),
      whyItWorks: why,
    }));
  }
}
