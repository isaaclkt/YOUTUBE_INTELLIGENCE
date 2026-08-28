import type { AnalysisResult, Topic } from "@/domain";
import { getServices } from "./index";

/**
 * O pipeline do motor — a espinha dorsal do produto.
 *
 *   coleta → normalização → métricas → scoring → oportunidades
 *          → interpretação IA → recomendação
 *
 * Este arquivo NÃO sabe se os serviços são mock ou reais; ele só
 * conhece os contratos. A divisão de responsabilidades é fixa:
 * os engines produzem TODOS os números; a camada de IA (etapa 6)
 * produz TODOS os textos — explicando os números, nunca os alterando.
 */
export async function runAnalysisPipeline(topic: Topic): Promise<AnalysisResult> {
  const services = getServices();

  // 1. Coleta
  const raw = await services.dataCollector.collect(topic);

  // 2. Normalização
  const normalized = services.metricsEngine.normalize(raw);

  // 3. Métricas
  const metrics = services.metricsEngine.computeMetrics(normalized);

  // 4. Scoring (fórmulas isoladas em mock/formulas.ts)
  const scores = services.scoringEngine.score(metrics);
  const verdict = services.scoringEngine.verdictFor(scores);

  // 5. Oportunidades numéricas (ranking de mercados)
  const markets = await services.opportunityEngine.rankMarkets(topic, normalized);

  // 6. Interpretação IA: todo o conteúdo em linguagem natural
  //    (por quê, ângulos, títulos, texto da recomendação)
  const interpretation = await services.aiInterpreter.interpret({
    topic,
    metrics,
    scores,
    verdict,
  });

  // 7. Recomendação final (montagem: números + texto da IA)
  const recommendation = await services.recommendationEngine.recommend({
    topic,
    scores,
    verdict,
    interpretation,
  });

  return {
    scores,
    verdict,
    whyPoints: interpretation.whyPoints,
    markets,
    opportunities: interpretation.angles,
    titles: interpretation.titles,
    recommendation,
  };
}
