import type { AnalysisResult, MetricSource, Topic } from "@/domain";
import { isLongFormSample } from "@/lib/video-format";
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

  // Títulos reais dos outliers LONG-FORM (ordenados por VPH) — a IA
  // extrai os padrões do nicho a partir deles. Shorts ficam de fora:
  // título de Short não serve de fórmula para vídeo longo (nosso
  // formato). Cap de 15 no prompt.
  const outlierTitles = raw.sampleVideos
    .filter((video) => video.isOutlier && isLongFormSample(video))
    .sort((a, b) => b.vph - a.vph)
    .map((video) => video.title)
    .slice(0, 15);

  // 6. Interpretação IA: todo o conteúdo em linguagem natural
  //    (por quê, ângulos, títulos, texto da recomendação)
  const interpretation = await services.aiInterpreter.interpret({
    topic,
    metrics,
    scores,
    verdict,
    outlierTitles,
  });

  // 7. Recomendação final (montagem: números + texto da IA)
  const recommendation = await services.recommendationEngine.recommend({
    topic,
    scores,
    verdict,
    interpretation,
  });

  // Origem das métricas → selos "estimado" na UI. Demanda, concorrência
  // e saturação derivam das estatísticas de vídeo; tendência, da série.
  const videoSource: MetricSource =
    normalized.sources.videoStats === "real" ? "real" : "estimated";
  const trendSource: MetricSource =
    normalized.sources.trends === "real" ? "real" : "estimated";

  return {
    scores,
    verdict,
    metricSources: {
      demand: videoSource,
      competition: videoSource,
      saturation: videoSource,
      trend: trendSource,
    },
    sampleVideos: raw.sampleVideos,
    interpretationSource: interpretation.generatedBy,
    whyPoints: interpretation.whyPoints,
    markets,
    opportunities: interpretation.angles,
    titles: interpretation.titles,
    titleFormulas: interpretation.titleFormulas,
    recommendation,
  };
}
