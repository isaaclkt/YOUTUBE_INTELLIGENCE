import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  CountryCode,
  EmergingNiche,
  LanguageCode,
  NicheReport,
  RadarWindow,
} from "@/domain";
import { LANGUAGE_LABELS, RADAR_WINDOWS } from "@/lib/constants";
import { getApiCache, putApiCache } from "@/lib/repository";
import { extractEmergingNiches } from "./niche-clustering";
import type { RadarOutcome } from "./radar";
import { runRadarSweep } from "./radar";

/**
 * Aba "Nichos Nascendo": reaproveita a varredura long-form do Radar
 * (cache de 12h — custo extra ZERO de YouTube), extrai clusters de
 * temas nos outliers replicáveis (motor puro) e usa 1 chamada barata
 * de IA só para NOMEAR os clusters. Relatório cacheado por 12h.
 */

const REPORT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const namingSchema = z.object({
  niches: z
    .array(z.object({ term: z.string(), displayName: z.string().min(1) }))
    .min(1),
});

export type NicheOutcome =
  | { status: "ok"; report: NicheReport }
  | { status: "budget_exceeded"; spentToday: number; budget: number };

export async function runNicheDetection(params: {
  language: LanguageCode;
  country: CountryCode;
  window: RadarWindow;
}): Promise<NicheOutcome> {
  const cacheKey = `nichos:v1:${params.language}:${params.country}:${params.window}`;
  const cached = await getApiCache(cacheKey);
  if (cached !== null) {
    return { status: "ok", report: JSON.parse(cached) as NicheReport };
  }

  // Varredura base (cache/orçamento tratados pelo RadarProvider).
  const outcome: RadarOutcome = await runRadarSweep({
    ...params,
    format: "longform",
  });
  if (outcome.status !== "ok") return outcome;
  const sweep = outcome.sweep;

  const windowHours =
    RADAR_WINDOWS.find((w) => w.key === params.window)?.hours ?? 168;

  // Motor: clusters a partir do pool de sinal. Outliers puros quando há
  // volume; senão o pool replicável inteiro (canais estabelecidos quase
  // nunca disparam a régua de outlier, mas mapeiam os temas quentes).
  // (?? []: proteção contra varredura de versão anterior em memória.)
  const pool = sweep.outlierVideos ?? [];
  const pureOutliers = pool.filter((v) => v.isOutlier && v.isReplicable);
  const replicable = pool.filter((v) => v.isReplicable);
  const base =
    pureOutliers.length >= 15
      ? pureOutliers
      : replicable.length >= 10
        ? replicable
        : pool;
  const niches = extractEmergingNiches(base, {
    language: params.language,
    windowHours,
  });

  // IA nomeia os clusters (números intocados). Fallback: termo bruto.
  const { named, namedBy } = await nameNiches(niches, params.language);

  const report: NicheReport = {
    language: params.language,
    country: params.country,
    window: params.window,
    source: sweep.source,
    sweptAt: sweep.sweptAt,
    niches: named,
    namedBy,
  };
  if (sweep.source === "real") {
    await putApiCache(cacheKey, JSON.stringify(report), REPORT_CACHE_TTL_MS);
  }
  return { status: "ok", report };
}

async function nameNiches(
  niches: EmergingNiche[],
  language: LanguageCode
): Promise<{ named: EmergingNiche[]; namedBy: "ai" | "template" }> {
  if (niches.length === 0 || !process.env.ANTHROPIC_API_KEY) {
    return { named: niches, namedBy: "template" };
  }
  try {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: `Dê um nome curto e legível de nicho (2–5 palavras, em ${LANGUAGE_LABELS[language]}) para cada termo extraído de títulos do YouTube, usando os exemplos como contexto. Apenas nomeie o tema — não invente além do que os exemplos mostram, não adicione números.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify(
            niches.map((n) => ({
              term: n.term,
              exemplos: n.examples.map((e) => e.title),
            }))
          ),
        },
      ],
      output_config: { format: zodOutputFormat(namingSchema), effort: "low" },
    });
    const byTerm = new Map(
      (response.parsed_output?.niches ?? []).map((n) => [n.term, n.displayName])
    );
    return {
      named: niches.map((n) => ({
        ...n,
        displayName: byTerm.get(n.term) ?? n.displayName,
      })),
      namedBy: "ai",
    };
  } catch (error) {
    console.warn("[Nichos] Nomeação por IA falhou — usando termos brutos.", error);
    return { named: niches, namedBy: "template" };
  }
}
