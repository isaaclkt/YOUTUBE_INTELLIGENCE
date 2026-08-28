import type {
  AIInterpretation,
  AIInterpretationInput,
  AIInterpreter,
  ComputedMetrics,
} from "../contracts";
import { simulateLatency } from "./simulate";

function formatGrowth(growthRate: number): string {
  const sign = growthRate > 0 ? "+" : "";
  return `${sign}${growthRate}%`;
}

function demandPoint(metrics: ComputedMetrics): string {
  const d = metrics.demandIndex;
  if (d >= 70) {
    return `Demanda em ${d}/100 — o público está buscando ativamente este tema agora.`;
  }
  if (d >= 40) {
    return `Demanda em ${d}/100 — existe público real, mas não é um tema de busca massiva.`;
  }
  return `Demanda em ${d}/100 — o público que procura este tema ainda é pequeno.`;
}

function competitionPoint(metrics: ComputedMetrics): string {
  const c = metrics.competitionIndex;
  const s = metrics.saturationIndex;
  if (c >= 65 && s >= 65) {
    return `Concorrência (${c}/100) e saturação (${s}/100) altas — entrar exige um ângulo claramente diferente do que já existe.`;
  }
  if (c >= 65) {
    return `A concorrência está em ${c}/100, mas a saturação de ${s}/100 indica que ainda há recortes em aberto.`;
  }
  if (s >= 65) {
    return `A saturação está em ${s}/100 (muito conteúdo repetido), porém a concorrência de ${c}/100 deixa espaço para canais menores.`;
  }
  return `Concorrência em ${c}/100 e saturação em ${s}/100 — barreira de entrada relativamente baixa.`;
}

function trendPoint(metrics: ComputedMetrics): string {
  const t = metrics.trendMomentum;
  const g = formatGrowth(metrics.growthRate);
  if (t >= 60) {
    return `Tendência em alta (${t}/100), com interesse crescendo ~${g} por semana nas últimas 12 semanas.`;
  }
  if (t >= 40) {
    return `Tendência estável (${t}/100) — sem explosão de interesse, mas também sem queda relevante.`;
  }
  return `Tendência em queda (${t}/100, ${g} por semana) — o interesse pelo tema vem diminuindo.`;
}

/**
 * MOCK da etapa de interpretação por IA.
 *
 * Simula o que um LLM fará na fase real: receber os números JÁ
 * CALCULADOS (demanda, crescimento, concorrência, saturação) e
 * devolver uma explicação em linguagem natural. Repare que TODO
 * número citado nos textos vem de `metrics`/`scores` — nada é
 * inventado aqui, e o contrato exige o mesmo da implementação real.
 */
export class MockAIInterpreter implements AIInterpreter {
  async interpret(input: AIInterpretationInput): Promise<AIInterpretation> {
    await simulateLatency(300, 600);
    const { metrics, scores, verdict, topic } = input;

    const whyPoints = [
      demandPoint(metrics),
      competitionPoint(metrics),
      trendPoint(metrics),
    ];

    const summary =
      verdict === "YES"
        ? `"${topic.query}" combina bons sinais: score de oportunidade ${scores.opportunity}/100. O momento favorece quem entrar com um recorte específico.`
        : verdict === "MAYBE"
          ? `"${topic.query}" tem sinais mistos: score de oportunidade ${scores.opportunity}/100. Dá para funcionar, mas a escolha do ângulo pesa mais que o tema em si.`
          : `"${topic.query}" enfrenta sinais desfavoráveis: score de oportunidade ${scores.opportunity}/100. O esforço tende a render pouco neste momento.`;

    return { whyPoints, summary };
  }
}
