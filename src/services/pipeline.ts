import type { AnalysisResult, MetricSource, Topic } from "@/domain";
import {
  getPreviousReadings,
  recordVideoReadings,
} from "@/lib/repository";
import { isLongFormSample } from "@/lib/video-format";
import { decide, type DecisionResult } from "./decision/engine";
import {
  aggregateLongitudinal,
  computeDelta,
  type LongitudinalIndicator,
} from "./decision/longitudinal";
import { collectDecisionInput } from "./real/data-collector/decision-collector";
import { getServices } from "./index";

/**
 * Etapa do MOTOR DE DECISÃO V2.
 *
 * Roda sobre dados REAIS coletados à parte do pipeline legado —
 * nenhum insumo mock alcança o veredito. Também grava a leitura
 * de views do momento (1u por 50 vídeos) e, quando já existe
 * leitura anterior, devolve o indicador longitudinal.
 */
async function runDecisionEngine(topic: Topic): Promise<{
  decision: DecisionResult;
  longitudinal: LongitudinalIndicator | null;
}> {
  const input = await collectDecisionInput(topic);
  const decision = decide(input);

  if (input.videos.length === 0) {
    return { decision, longitudinal: null };
  }

  const now = new Date();
  const previous = await getPreviousReadings(
    input.videos.map((v) => v.videoId),
    now
  ).catch(() => new Map<string, { views: number; readAt: string }>());

  const deltas = input.videos
    .map((video) => {
      const before = previous.get(video.videoId);
      if (!before) return null;
      return computeDelta(video.videoId, before, {
        views: video.views,
        readAt: now.toISOString(),
      });
    })
    .filter((delta): delta is NonNullable<typeof delta> => delta !== null);

  // Grava a leitura atual DEPOIS de comparar, para não competir consigo mesma.
  await recordVideoReadings(
    input.videos.map((v) => ({ videoId: v.videoId, views: v.views }))
  ).catch((error) => {
    console.warn("[pipeline] Falha ao gravar leituras de views.", error);
  });

  return { decision, longitudinal: aggregateLongitudinal(deltas) };
}

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

  // 0. MOTOR DE DECISÃO V2 — roda em paralelo ao pipeline legado e é
  //    quem decide o veredito. O pipeline legado segue produzindo os
  //    textos e os cards informativos, sempre marcados quanto à origem.
  const decisionPromise = runDecisionEngine(topic);

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

  const { decision, longitudinal } = await decisionPromise;

  return {
    scores,
    // O veredito exibido e persistido é o do V2. O `verdict` legado
    // continua calculado porque alimenta os textos do interpretador,
    // mas não é mais a decisão do produto.
    verdict: decision.verdict,
    decision,
    longitudinal,
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
    // A recomendação carrega o veredito do V2. Sem evidência, o texto
    // do motor legado não pode ficar no lugar de uma conclusão.
    recommendation: {
      ...recommendation,
      verdict: decision.verdict,
      summary:
        decision.verdict === "INSUFFICIENT_DATA"
          ? "Não há evidência suficiente para recomendar ou desaconselhar este tema. Veja abaixo o que faltou na amostra."
          : recommendation.summary,
    },
  };
}
