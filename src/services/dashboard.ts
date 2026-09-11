import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  AnalysisSummary,
  AscendingReport,
  LanguageWindowCheck,
  NicheReport,
  RadarSweep,
} from "@/domain";
import { COUNTRY_LABELS, RADAR_PAIRS } from "@/lib/constants";
import {
  countAnalyses,
  getApiCache,
  listApiCacheByPrefix,
  listRecentAnalyses,
  putApiCache,
} from "@/lib/repository";
import { getYouTubeQuotaStatus } from "./window";

/**
 * Resumo diário do painel (Visão Geral).
 * REGRA DE OURO: só lê caches e banco — NUNCA dispara varredura,
 * análise ou chamada ao YouTube. A única chamada externa possível é a
 * IA redigindo a frase do "Próximo passo" (cacheada por 12h e sempre
 * em cima de números do motor; fallback: frase de template).
 */

const TIP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export interface NextStep {
  text: string;
  generatedBy: "ai" | "template";
  actions: Array<{ label: string; href: string }>;
}

export interface DashboardSummary {
  sweep: {
    pairLabel: string;
    flag: string;
    window: string;
    outliers: number;
    replicable: number;
    sweptAt: string;
  } | null;
  nichesCount: number | null;
  ascendingCount: number | null;
  quota: { spent: number; limit: number; remaining: number };
  analysesTotal: number;
  analysesLast24h: number;
  nextStep: NextStep;
  recent: AnalysisSummary[];
}

function safeParse<T>(payload: string): T | null {
  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

function pairMeta(language: string, country: string) {
  return RADAR_PAIRS.find(
    (p) => p.language === language && p.country === country
  );
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [sweepRows, nicheRows, ascRows, windowRows, quota, counts, recent] =
    await Promise.all([
      listApiCacheByPrefix("radar:v9:longform:"),
      listApiCacheByPrefix("nichos:v1:"),
      listApiCacheByPrefix("canais:v1:"),
      listApiCacheByPrefix("window:v1:"),
      getYouTubeQuotaStatus(),
      countAnalyses(),
      listRecentAnalyses(3),
    ]);

  const sweep = sweepRows[0]
    ? safeParse<RadarSweep>(sweepRows[0].payload)
    : null;
  const niches = nicheRows[0]
    ? safeParse<NicheReport>(nicheRows[0].payload)
    : null;
  const ascending = ascRows[0]
    ? safeParse<AscendingReport>(ascRows[0].payload)
    : null;
  const windowChecks = windowRows
    .map((row) => {
      const check = safeParse<LanguageWindowCheck>(row.payload);
      // A consulta original vive na chave: window:v1:{query}|{lang}|{country}
      const query = row.key.slice("window:v1:".length).split("|")[0] ?? "";
      return check ? { check, query } : null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const sweepPair = sweep ? pairMeta(sweep.language, sweep.country) : null;
  const pool = sweep?.outlierVideos ?? [];

  const nextStep = await buildNextStep({ sweep, niches, windowChecks });

  return {
    sweep:
      sweep && sweepPair
        ? {
            pairLabel: sweepPair.label,
            flag: sweepPair.flag,
            window: sweep.window,
            outliers: pool.filter((v) => v.isOutlier).length,
            replicable: pool.filter((v) => v.isReplicable).length,
            sweptAt: sweep.sweptAt,
          }
        : null,
    nichesCount: niches ? niches.niches.length : null,
    ascendingCount: ascending ? ascending.channels.length : null,
    quota,
    analysesTotal: counts.total,
    analysesLast24h: counts.last24h,
    nextStep,
    recent,
  };
}

// ---------- Próximo passo: fatos do motor → frase (IA opcional) ----------

interface StepFacts {
  kind: "window_open" | "top_niche" | "sweep" | "empty";
  data: Record<string, string | number>;
  actions: Array<{ label: string; href: string }>;
  fallbackText: string;
}

function buildFacts(input: {
  sweep: RadarSweep | null;
  niches: NicheReport | null;
  windowChecks: Array<{ check: LanguageWindowCheck; query: string }>;
}): StepFacts {
  const open = input.windowChecks.find((w) => w.check.verdict === "OPEN");
  if (open) {
    const country = COUNTRY_LABELS[open.check.country];
    return {
      kind: "window_open",
      data: {
        tema: open.query,
        pais: country,
        longFormRecentes: open.check.recentLongFormCount,
        outliersAtivos: open.check.activeOutliers,
      },
      actions: [
        {
          label: "🌍 Ver relatório da janela",
          href: `/window?q=${encodeURIComponent(open.query)}&from=${open.check.language}`,
        },
        {
          label: "🔎 Analisar o tema",
          href: `/analisar?q=${encodeURIComponent(open.query)}`,
        },
      ],
      fallbackText: `“${open.query}” está com JANELA ABERTA em ${country} (${open.check.recentLongFormCount} long-form recentes, ${open.check.activeOutliers} outliers ativos) — vale olhar antes do mercado fechar.`,
    };
  }

  const topNiche = input.niches?.niches[0];
  if (topNiche && input.niches) {
    return {
      kind: "top_niche",
      data: {
        nicho: topNiche.displayName,
        canais: topNiche.channelCount,
        videos: topNiche.videoCount,
        categoria: topNiche.parentCategory,
      },
      actions: [
        {
          label: "🔎 Analisar o tema",
          href: `/analisar?q=${encodeURIComponent(topNiche.term)}`,
        },
        {
          label: "🌍 Verificar janela",
          href: `/window?q=${encodeURIComponent(topNiche.term)}&from=${input.niches.language}`,
        },
      ],
      fallbackText: `“${topNiche.displayName}” aparece em ${topNiche.channelCount} canais distintos (${topNiche.videoCount} vídeos fortes) — candidato a próximo tema.`,
    };
  }

  if (input.sweep) {
    const pair = pairMeta(input.sweep.language, input.sweep.country);
    const replicable = (input.sweep.outlierVideos ?? []).filter(
      (v) => v.isReplicable
    ).length;
    return {
      kind: "sweep",
      data: { par: pair?.label ?? "", replicaveis: replicable },
      actions: [{ label: "📡 Abrir o Radar", href: "/radar" }],
      fallbackText: `A última varredura (${pair?.label}) tem ${replicable} vídeos replicáveis no ar — vale garimpar o Radar.`,
    };
  }

  return {
    kind: "empty",
    data: {},
    actions: [{ label: "📡 Rodar a primeira varredura", href: "/radar" }],
    fallbackText:
      "Nenhuma varredura em cache hoje — comece pelo Radar para mapear o que está bombando.",
  };
}

const tipSchema = z.object({ frase: z.string().min(10).max(300) });

async function buildNextStep(input: {
  sweep: RadarSweep | null;
  niches: NicheReport | null;
  windowChecks: Array<{ check: LanguageWindowCheck; query: string }>;
}): Promise<NextStep> {
  const facts = buildFacts(input);
  const template: NextStep = {
    text: facts.fallbackText,
    generatedBy: "template",
    actions: facts.actions,
  };
  if (facts.kind === "empty" || !process.env.ANTHROPIC_API_KEY) {
    return template;
  }

  const hash = createHash("sha256")
    .update(JSON.stringify({ kind: facts.kind, data: facts.data }))
    .digest("hex")
    .slice(0, 24);
  const cacheKey = `dash-tip:v1:${hash}`;
  const cached = await getApiCache(cacheKey);
  if (cached !== null) {
    return { text: cached, generatedBy: "ai", actions: facts.actions };
  }

  try {
    const client = new Anthropic({ timeout: 20_000, maxRetries: 0 });
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system:
        "Redija UMA frase curta de 'próximo passo do dia' para um criador de vídeos longos dark, em português do Brasil, usando SOMENTE os números/fatos fornecidos (não invente nada, não prometa viral). Tom direto e acionável.",
      messages: [{ role: "user", content: JSON.stringify(facts.data) }],
      output_config: { format: zodOutputFormat(tipSchema), effort: "low" },
    });
    const text = response.parsed_output?.frase;
    if (!text) return template;
    await putApiCache(cacheKey, text, TIP_CACHE_TTL_MS);
    return { text, generatedBy: "ai", actions: facts.actions };
  } catch {
    return template;
  }
}
