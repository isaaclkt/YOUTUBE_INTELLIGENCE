import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnglesCard } from "@/components/result/angles-card";
import { MarketsCard } from "@/components/result/markets-card";
import { MetricsGrid } from "@/components/result/metrics-grid";
import { OutlierTitlesCard } from "@/components/result/outlier-titles-card";
import { RawDataCard } from "@/components/result/raw-data-card";
import { RecommendationCard } from "@/components/result/recommendation-card";
import { TitlesCard } from "@/components/result/titles-card";
import { VerdictCard } from "@/components/result/verdict-card";
import { WhyCard } from "@/components/result/why-card";
import {
  APP_DISCLAIMER,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  LANGUAGE_LABELS,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { usesRealVideoData } from "@/lib/metrics";
import { getAnalysis } from "@/lib/repository";

export async function generateMetadata(
  props: PageProps<"/analysis/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const analysis = await getAnalysis(id);
  return { title: analysis ? `Análise: ${analysis.topic.query}` : "Análise" };
}

export default async function AnalysisPage(props: PageProps<"/analysis/[id]">) {
  const { id } = await props.params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const { topic, result } = analysis;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <nav className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ← Nova análise
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          {topic.query}
        </h1>
        <p className="mt-1.5 text-xs text-zinc-500">
          {COUNTRY_FLAGS[topic.country]} {COUNTRY_LABELS[topic.country]} ·{" "}
          {LANGUAGE_LABELS[topic.language]} · {formatDateTime(analysis.createdAt)}
        </p>
      </header>

      <div className="space-y-6">
        <VerdictCard verdict={result.verdict} scores={result.scores} />

        <MetricsGrid scores={result.scores} sources={result.metricSources} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WhyCard points={result.whyPoints} />
          <MarketsCard markets={result.markets} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AnglesCard opportunities={result.opportunities} />
          <TitlesCard
            titles={result.titles}
            formulas={result.titleFormulas}
            placeholder={result.interpretationSource === "template"}
          />
        </div>

        <OutlierTitlesCard videos={result.sampleVideos ?? []} />

        <RecommendationCard recommendation={result.recommendation} />

        <RawDataCard videos={result.sampleVideos ?? []} />
      </div>

      <footer className="mt-10 border-t border-zinc-900 pt-6 text-center text-xs text-zinc-600">
        {APP_DISCLAIMER} ·{" "}
        {usesRealVideoData(result.metricSources)
          ? "Métricas com dados públicos do YouTube; itens marcados “estimado” usam dados demonstrativos."
          : "Fase 1 com dados demonstrativos (mock)."}
      </footer>
    </main>
  );
}
