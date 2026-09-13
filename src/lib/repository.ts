import type {
  Analysis,
  AnalysisResult,
  AnalysisSummary,
  CountryCode,
  LanguageCode,
  Topic,
  Verdict,
} from "@/domain";
import { prisma } from "./prisma";

/**
 * Única porta de entrada/saída da persistência.
 * Se o banco mudar (SQLite → Postgres), só este arquivo e o
 * prisma/schema.prisma são afetados.
 */

export async function saveAnalysis(
  topic: Topic,
  result: AnalysisResult
): Promise<string> {
  const row = await prisma.analysis.create({
    data: {
      query: topic.query,
      language: topic.language,
      country: topic.country,
      verdict: result.verdict,
      // V2: null quando o veredito é INSUFFICIENT_DATA — sem evidência
      // não há score, e gravar 0 seria afirmar algo que não foi medido.
      opportunityScore: result.decision
        ? result.decision.opportunityScore
        : result.scores.opportunity,
      resultJson: JSON.stringify(result),
    },
  });
  return row.id;
}

// ============ Leituras de views (painel longitudinal) ============

/**
 * Grava a contagem de views observada agora para cada vídeo.
 * Reler ids já conhecidos custa 1 unidade por 50 vídeos — é o insumo
 * mais barato da API e a única fonte de velocidade real.
 */
export async function recordVideoReadings(
  readings: ReadonlyArray<{ videoId: string; views: number }>
): Promise<void> {
  if (readings.length === 0) return;
  await prisma.videoReading.createMany({
    data: readings.map((r) => ({ videoId: r.videoId, views: r.views })),
  });
}

/**
 * Leitura ANTERIOR de cada vídeo — a mais recente gravada antes de
 * `before`. Devolve só os vídeos que têm histórico; a ausência é
 * reportada pela omissão, nunca por um valor de preenchimento.
 */
export async function getPreviousReadings(
  videoIds: readonly string[],
  before: Date
): Promise<Map<string, { views: number; readAt: string }>> {
  const result = new Map<string, { views: number; readAt: string }>();
  if (videoIds.length === 0) return result;

  const rows = await prisma.videoReading.findMany({
    where: { videoId: { in: [...videoIds] }, readAt: { lt: before } },
    orderBy: { readAt: "desc" },
    select: { videoId: true, views: true, readAt: true },
  });
  for (const row of rows) {
    // orderBy desc: o primeiro de cada vídeo é o mais recente.
    if (!result.has(row.videoId)) {
      result.set(row.videoId, {
        views: row.views,
        readAt: row.readAt.toISOString(),
      });
    }
  }
  return result;
}

export async function getAnalysis(id: string): Promise<Analysis | null> {
  const row = await prisma.analysis.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    topic: {
      query: row.query,
      // Os casts abaixo são seguros: a API valida idioma/país na entrada.
      language: row.language as LanguageCode,
      country: row.country as CountryCode,
    },
    result: JSON.parse(row.resultJson) as AnalysisResult,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Cache de respostas de APIs externas (TTL controlado pelo chamador).
 * Devolve null quando não há entrada ou quando ela expirou.
 */
export async function getApiCache(key: string): Promise<string | null> {
  const row = await prisma.apiCache.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.apiCache.delete({ where: { key } }).catch(() => undefined);
    return null;
  }
  return row.payload;
}

// ============ Categorias do Radar (tela ⚙️) ============

import type { LanguageCode as Lang, RadarCategoryConfig } from "@/domain";
import { DEFAULT_RADAR_CATEGORIES } from "./default-radar-categories";

function toCategoryConfig(row: {
  id: string;
  slug: string;
  name: string;
  rpmTier: string;
  active: boolean;
  seedsJson: string;
}): RadarCategoryConfig {
  let seeds: Partial<Record<Lang, string>> = {};
  try {
    seeds = JSON.parse(row.seedsJson) as Partial<Record<Lang, string>>;
  } catch {
    seeds = {};
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    rpmTier:
      row.rpmTier === "high" || row.rpmTier === "low" ? row.rpmTier : "medium",
    active: row.active,
    seeds,
  };
}

/** Semeia os padrões na primeira leitura (tabela vazia). */
async function ensureDefaultRadarCategories(): Promise<void> {
  const count = await prisma.radarCategory.count();
  if (count > 0) return;
  await prisma.radarCategory.createMany({
    data: DEFAULT_RADAR_CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      rpmTier: c.rpmTier,
      active: true,
      seedsJson: JSON.stringify(c.seeds),
    })),
  });
}

export async function listRadarCategories(): Promise<RadarCategoryConfig[]> {
  await ensureDefaultRadarCategories();
  const rows = await prisma.radarCategory.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(toCategoryConfig);
}

export async function listActiveRadarCategories(): Promise<
  RadarCategoryConfig[]
> {
  return (await listRadarCategories()).filter((c) => c.active);
}

export async function createRadarCategory(input: {
  slug: string;
  name: string;
  rpmTier: string;
  seeds: Partial<Record<Lang, string>>;
}): Promise<void> {
  await prisma.radarCategory.create({
    data: {
      slug: input.slug,
      name: input.name,
      rpmTier: input.rpmTier,
      active: true,
      seedsJson: JSON.stringify(input.seeds),
    },
  });
}

export async function updateRadarCategory(
  id: string,
  input: {
    name: string;
    rpmTier: string;
    seeds: Partial<Record<Lang, string>>;
  }
): Promise<void> {
  await prisma.radarCategory.update({
    where: { id },
    data: {
      name: input.name,
      rpmTier: input.rpmTier,
      seedsJson: JSON.stringify(input.seeds),
    },
  });
}

export async function setRadarCategoryActive(
  id: string,
  active: boolean
): Promise<void> {
  await prisma.radarCategory.update({ where: { id }, data: { active } });
}

/** Entradas de cache não-expiradas por prefixo (leitura de painel). */
export async function listApiCacheByPrefix(
  prefix: string
): Promise<Array<{ key: string; payload: string; createdAt: Date }>> {
  return prisma.apiCache.findMany({
    where: { key: { startsWith: prefix }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { key: true, payload: true, createdAt: true },
  });
}

export async function putApiCache(
  key: string,
  payload: string,
  ttlMs: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.apiCache.upsert({
    where: { key },
    update: { payload, expiresAt },
    create: { key, payload, expiresAt },
  });
}

/** Contagem de análises: total e nas últimas 24h (painel). */
export async function countAnalyses(): Promise<{
  total: number;
  last24h: number;
}> {
  const [total, last24h] = await Promise.all([
    prisma.analysis.count(),
    prisma.analysis.count({
      where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    }),
  ]);
  return { total, last24h };
}

export async function listRecentAnalyses(
  limit: number
): Promise<AnalysisSummary[]> {
  const rows = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    query: row.query,
    language: row.language as LanguageCode,
    country: row.country as CountryCode,
    verdict: row.verdict as Verdict,
    // null quando o veredito é INSUFFICIENT_DATA.
    opportunityScore: row.opportunityScore,
    createdAt: row.createdAt.toISOString(),
  }));
}
