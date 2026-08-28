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
      opportunityScore: result.scores.opportunity,
      resultJson: JSON.stringify(result),
    },
  });
  return row.id;
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
    opportunityScore: row.opportunityScore,
    createdAt: row.createdAt.toISOString(),
  }));
}
