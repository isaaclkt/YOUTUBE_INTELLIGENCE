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
 * MOCK das etapas de normalização e métricas.
 * Os cálculos são plausíveis (escalas logarítmicas para volumes,
 * comparação início/fim da série para crescimento), mas os pesos
 * são demonstrativos — mesma ressalva de formulas.ts.
 */
export class MockMetricsEngine implements MetricsEngine {
  normalize(raw: RawTopicData): NormalizedData {
    const interests = raw.trendSeries.map((p) => p.interest);
    const meanInterest = mean(interests);
    const firstQuarter = mean(interests.slice(0, 4));
    const lastQuarter = mean(interests.slice(-4));

    // Variação relativa entre o início e o fim da janela de 12 semanas.
    const growthSignal = clamp(
      (lastQuarter - firstQuarter) / Math.max(firstQuarter, 1),
      -1,
      1
    );

    const demandSignal = clamp01(
      (meanInterest / 100) * 0.6 +
        Math.min(1, Math.log10(raw.video.avgViews + 1) / 6) * 0.4
    );

    const competitionSignal = clamp01(
      Math.min(1, Math.log10(raw.video.channelCount + 1) / 4.5) * 0.5 +
        raw.video.dominantChannelShare * 0.3 +
        Math.min(1, raw.video.recentUploadsPerWeek / 250) * 0.2
    );

    const saturationSignal = clamp01(
      Math.min(1, Math.log10(raw.video.videoCount + 1) / 5.5) * 0.6 +
        Math.min(1, raw.video.recentUploadsPerWeek / 250) * 0.4
    );

    // Mais vídeos e série completa = mais base para confiar na análise.
    const dataQuality = clamp01(
      Math.min(1, Math.log10(raw.video.videoCount + 1) / 4) * 0.5 +
        (raw.trendSeries.length / 12) * 0.5
    );

    return {
      topic: raw.topic,
      demandSignal,
      growthSignal,
      competitionSignal,
      saturationSignal,
      dataQuality,
      countrySignals: raw.countrySignals,
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
