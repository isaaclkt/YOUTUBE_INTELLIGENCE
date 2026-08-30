import type {
  NicheCategory,
  RadarChannel,
  RadarNiche,
  RadarSweep,
  RadarVideo,
} from "@/domain";
import { CATEGORY_LABELS, RADAR_WINDOWS } from "@/lib/constants";
import type { RadarProvider, RadarSweepInput } from "../contracts";
import { between, createRng, intBetween, type Rng } from "./seeded-random";
import { simulateLatency } from "./simulate";

/**
 * Radar MOCK: varredura demonstrativa e determinística (mesmo par
 * idioma+país+janela → mesmos dados). Títulos são placeholders "[demo]"
 * — a UI exibe o aviso de dados demonstrativos quando source = "mock".
 */

const TITLE_TEMPLATES: Record<NicheCategory, readonly string[]> = {
  historia: [
    "A batalha que mudou tudo (e ninguém estudou)",
    "O império que sumiu em uma geração",
  ],
  financas: [
    "Onde o dinheiro rende mais em 2026",
    "O erro que corrói o seu salário todo mês",
  ],
  saude: [
    "O hábito de 10 minutos que mudou meu sono",
    "Treino em casa sem equipamento: resultado real",
  ],
  curiosidades: [
    "O mistério que a ciência não explica até hoje",
    "7 fatos que parecem mentira (mas são reais)",
  ],
  automotivo: [
    "O carro usado que ninguém deveria comprar",
    "Mecânico revela o que as oficinas escondem",
  ],
  animais: [
    "O resgate que emocionou a internet",
    "Por que seu cachorro faz isso todo dia",
  ],
  comida: [
    "A receita de 3 ingredientes que viralizou",
    "Testei a comida mais famosa da cidade",
  ],
  religiao: [
    "O salmo mais poderoso para começar o dia",
    "A história bíblica que quase ninguém conta",
  ],
};

const CHANNEL_WORDS = [
  "Prisma",
  "Vertente",
  "Farol",
  "Bússola",
  "Órbita",
  "Raiz",
  "Trilha",
  "Ponte",
];

function mockVideo(
  rng: Rng,
  category: NicheCategory,
  index: number,
  windowHours: number
): RadarVideo {
  const templates = TITLE_TEMPLATES[category];
  const title = `[demo] ${templates[index % templates.length]}`;
  const ageHours = Math.max(2, between(rng, 0.05, 1) * windowHours);
  const views = Math.round(10 ** between(rng, 3.2, 5.8));
  const subscribers = Math.round(10 ** between(rng, 2.8, 5.5));
  return {
    videoId: `demo-${category}-${index}`,
    title,
    channelId: `demo-ch-${category}-${index % 4}`,
    channelTitle: `Canal ${CHANNEL_WORDS[intBetween(rng, 0, CHANNEL_WORDS.length - 1)]} (demo)`,
    subscribers,
    views,
    publishedAt: new Date(Date.now() - ageHours * 3_600_000).toISOString(),
    vph: Math.round((views / ageHours) * 10) / 10,
    isOutlier: rng() < 0.3,
    category,
  };
}

export class MockRadarProvider implements RadarProvider {
  async sweep(input: RadarSweepInput): Promise<RadarSweep> {
    await simulateLatency(500, 900);
    const rng = createRng(
      `radar|${input.format}|${input.language}|${input.country}|${input.window}|v2`
    );
    const windowHours =
      RADAR_WINDOWS.find((w) => w.key === input.window)?.hours ?? 168;

    const categories = Object.keys(CATEGORY_LABELS) as NicheCategory[];
    const videos: RadarVideo[] = categories.flatMap((category) => {
      const count = intBetween(rng, 4, 7);
      return Array.from({ length: count }, (_, i) =>
        mockVideo(rng, category, i, windowHours)
      );
    });

    const risingChannels: RadarChannel[] = videos
      .filter((v) => v.isOutlier && v.subscribers !== null)
      .slice(0, 8)
      .map((v) => ({
        channelId: v.channelId,
        channelTitle: v.channelTitle,
        subscribers: v.subscribers ?? 1,
        channelPublishedAt: new Date(
          Date.now() - intBetween(rng, 60, 700) * 86_400_000
        ).toISOString(),
        recentViews: v.views,
        bestVph: v.vph,
        videoCount: 1,
        viewsPerSubscriber:
          Math.round((v.views / Math.max(1, v.subscribers ?? 1)) * 10) / 10,
      }))
      .sort((a, b) => b.viewsPerSubscriber - a.viewsPerSubscriber)
      .slice(0, 6);

    const heatingNiches: RadarNiche[] = categories
      .map((category) => {
        const inCategory = videos.filter((v) => v.category === category);
        const outliers = inCategory
          .filter((v) => v.isOutlier)
          .sort((a, b) => b.vph - a.vph);
        return {
          category,
          outlierCount: outliers.length,
          sampleCount: inCategory.length,
          topOutlierTitle: outliers[0]?.title ?? null,
          topOutlierVideoId: outliers[0]?.videoId ?? null,
        };
      })
      .sort((a, b) => b.outlierCount - a.outlierCount);

    return {
      language: input.language,
      country: input.country,
      window: input.window,
      format: input.format,
      sweptAt: new Date().toISOString(),
      source: "mock",
      quotaUnits: 0,
      trendingVideos: [...videos].sort((a, b) => b.vph - a.vph).slice(0, 15),
      // Canais em ascensão só no Radar long-form (espelha o real).
      risingChannels: input.format === "longform" ? risingChannels : [],
      heatingNiches,
    };
  }
}
