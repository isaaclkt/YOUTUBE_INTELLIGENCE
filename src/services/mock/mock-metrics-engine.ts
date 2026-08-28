import type {
  ComputedMetrics,
  MetricsEngine,
  NormalizedData,
  RawTopicData,
} from "../contracts";
import { clamp, clamp01 } from "./formulas";

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Etapas de normalização e métricas. A matemática é a mesma para dados
 * mock e reais (o coletor real produz os mesmos campos de RawVideoStats),
 * mas os PESOS são demonstrativos — recalibrar quando houver histórico
 * de análises reais para validar (mesma ressalva de formulas.ts).
 */
export class MockMetricsEngine implements MetricsEngine {
  normalize(raw: RawTopicData): NormalizedData {
    const v = raw.video;
    const interests = raw.trendSeries.map((p) => p.interest);
    const firstQuarter = mean(interests.slice(0, 4));
    const lastQuarter = mean(interests.slice(-4));

    // Variação relativa entre o início e o fim da janela de 12 semanas.
    const growthSignal = clamp(
      (lastQuarter - firstQuarter) / Math.max(firstQuarter, 1),
      -1,
      1
    );

    // Demanda = engajamento recente: VPH mediano dos vídeos novos pesa
    // mais; engajamento e views médias completam o sinal.
    const demandSignal = clamp01(
      Math.min(1, Math.log10(v.recentMedianVph + 1) / 3) * 0.5 +
        Math.min(1, v.avgEngagementRate / 0.08) * 0.25 +
        Math.min(1, Math.log10(v.avgViews + 1) / 6) * 0.25
    );

    // Concorrência = quanto os fortes dominam: share de canais grandes,
    // concentração no dominante e porte mediano. Outliers frequentes
    // (canais pequenos estourando) ALIVIAM a pressão competitiva.
    const competitionSignal = clamp01(
      v.strongChannelShare * 0.35 +
        v.dominantChannelShare * 0.2 +
        Math.min(1, Math.log10(v.medianSubscribers + 1) / 6) * 0.2 +
        Math.min(1, Math.log10(v.channelCount + 1) / 2) * 0.1 +
        (1 - Math.min(1, v.outlierRatio / 0.15)) * 0.15
    );

    // Saturação = volume acumulado + cadência de novos uploads;
    // poucos outliers = conteúdo repetido sem espaço para furar.
    const saturationSignal = clamp01(
      Math.min(1, Math.log10(v.videoCount + 1) / 5.5) * 0.45 +
        Math.min(1, v.recentUploadsPerWeek / 250) * 0.35 +
        (1 - Math.min(1, v.outlierRatio / 0.15)) * 0.2
    );

    // Amostra maior, volume maior e série completa = mais confiança.
    const dataQuality = clamp01(
      Math.min(1, v.sampleSize / 60) * 0.4 +
        Math.min(1, Math.log10(v.videoCount + 1) / 4) * 0.3 +
        (raw.trendSeries.length / 12) * 0.3
    );

    return {
      topic: raw.topic,
      demandSignal,
      growthSignal,
      competitionSignal,
      saturationSignal,
      dataQuality,
      countrySignals: raw.countrySignals,
      sources: raw.sources,
    };
  }

  computeMetrics(data: NormalizedData): ComputedMetrics {
    return {
      demandIndex: Math.round(data.demandSignal * 100),
      // growthSignal cobre ~8 semanas; convertemos para % por semana.
      growthRate: Math.round((data.growthSignal / 8) * 100 * 10) / 10,
      competitionIndex: Math.round(data.competitionSignal * 100),
      saturationIndex: Math.round(data.saturationSignal * 100),
      trendMomentum: Math.round(clamp(50 + data.growthSignal * 50, 0, 100)),
      dataQuality: data.dataQuality,
    };
  }
}
