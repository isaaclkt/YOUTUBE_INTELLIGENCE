import type { CountryCode, LanguageCode, Topic } from "@/domain";
import { COUNTRIES } from "@/lib/constants";
import type {
  DataCollector,
  RawCountrySignal,
  RawTopicData,
  RawTrendPoint,
} from "../contracts";
import { clamp } from "./formulas";
import { between, createRng } from "./seeded-random";
import { seedFor, simulateLatency, topicHeat } from "./simulate";

/** Países onde cada idioma tem afinidade natural (aumenta o interesse). */
const LANGUAGE_AFFINITY: Record<LanguageCode, readonly CountryCode[]> = {
  "pt-BR": ["BR"],
  en: ["US"],
  es: ["MX", "ES"],
  it: ["IT"],
  fr: ["FR"],
  de: ["DE"],
};

/**
 * MOCK da etapa de coleta. Gera dados plausíveis e DETERMINÍSTICOS
 * (mesma consulta → mesmos números) a partir de um PRNG semeado.
 * A implementação real usará YouTube Data API + fonte de tendências
 * (ver src/services/real/).
 */
export class MockDataCollector implements DataCollector {
  async collect(topic: Topic): Promise<RawTopicData> {
    await simulateLatency(600, 1100);

    const rng = createRng(seedFor(topic, "collect"));
    const heat = topicHeat(topic.query);

    // Volume cresce de forma aproximadamente exponencial com o calor do tema.
    const videoCount = Math.round(
      10 ** between(rng, 2.6, 4.4) * (0.4 + heat * 1.8)
    );
    const sampleSize = Math.round(between(rng, 45, 100));
    const avgViews = Math.round(10 ** between(rng, 3.0, 4.8) * (0.5 + heat));
    const medianViews = Math.round(avgViews * between(rng, 0.18, 0.45));
    const avgEngagementRate = between(rng, 0.015, 0.09);
    // VPH (views/hora): temas quentes acumulam views mais rápido.
    const medianVph =
      Math.round(10 ** between(rng, -0.5, 2.3) * (0.5 + heat * 1.5) * 10) / 10;
    const recentMedianVph =
      Math.round(medianVph * between(rng, 0.6, 1.8) * 10) / 10;
    const outlierRatio = clamp(between(rng, 0.02, 0.2) + heat * 0.05, 0, 0.35);
    // Canais distintos na amostra de topo (mesma semântica do coletor real).
    const channelCount = Math.round(
      clamp(sampleSize * between(rng, 0.3, 0.8), 5, 100)
    );
    const dominantChannelShare = between(rng, 0.08, 0.55);
    const strongChannelShare = clamp(
      between(rng, 0.1, 0.6) + heat * 0.25,
      0,
      0.95
    );
    const medianSubscribers = Math.round(10 ** between(rng, 3.2, 5.8));
    const recentUploadsPerWeek = Math.max(
      2,
      Math.round(videoCount * between(rng, 0.001, 0.006))
    );

    // Série de 12 semanas: base + deriva (pode ser negativa) + ruído.
    const base = between(rng, 25, 65) + heat * 25;
    const drift = between(rng, -2.2, 3.2) + heat * 0.8;
    const trendSeries: RawTrendPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const noise = between(rng, -6, 6);
      trendSeries.push({
        weeksAgo: 11 - i,
        interest: Math.round(clamp(base + drift * i + noise, 3, 100)),
      });
    }

    const affinity = LANGUAGE_AFFINITY[topic.language];
    const countrySignals: RawCountrySignal[] = COUNTRIES.map(({ code }) => {
      const affinityBoost = affinity.includes(code) ? between(rng, 8, 22) : 0;
      const homeBoost = code === topic.country ? between(rng, 5, 15) : 0;
      const searchInterest = Math.round(
        clamp(between(rng, 15, 70) + heat * 15 + affinityBoost + homeBoost, 5, 100)
      );
      const competitionLevel = Math.round(
        clamp(
          searchInterest * between(rng, 0.55, 0.95) + between(rng, -10, 15),
          5,
          98
        )
      );
      return { country: code, searchInterest, competitionLevel };
    });

    return {
      topic,
      video: {
        videoCount,
        sampleSize,
        avgViews,
        medianViews,
        avgEngagementRate,
        medianVph,
        recentMedianVph,
        outlierRatio,
        channelCount,
        dominantChannelShare,
        strongChannelShare,
        medianSubscribers,
        recentUploadsPerWeek,
      },
      trendSeries,
      countrySignals,
      sources: { videoStats: "mock", trends: "mock" },
      collectedAt: new Date().toISOString(),
    };
  }
}
