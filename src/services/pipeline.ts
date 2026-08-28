import type { AnalysisResult, Topic } from "@/domain";
import { getServices } from "./index";

/**
 * O pipeline do motor — a espinha dorsal do produto.
 *
 *   coleta → normalização → métricas → scoring → oportunidades
 *          → interpretação IA → recomendação
 *
 * Este arquivo NÃO sabe se os serviços são mock ou reais; ele só
 * conhece os contratos. A IA (etapa 6) recebe números prontos das
 * etapas 3–4 e devolve explicação — nunca calcula nada.
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

  // 5. Oportunidades (mercados, ângulos, títulos)
  const markets = await services.opportunityEngine.rankMarkets(topic, normalized);
  const opportunities = await services.opportunityEngine.findAngles(
    topic,
    metrics,
    scores
  );
  const titles = await services.opportunityEngine.suggestTitles(
    topic,
    opportunities
  );

  // 6. Interpretação IA (explica os números; não os inventa)
  const interpretation = await services.aiInterpreter.interpret({
    topic,
    metrics,
    scores,
    verdict,
  });

  // 7. Recomendação final
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
    opportunities,
    titles,
    recommendation,
  };
}
