import type { Metadata } from "next";
import Link from "next/link";
import { RadarFilters } from "@/components/radar/radar-filters";
import {
  APP_DISCLAIMER,
  CATEGORY_LABELS,
} from "@/lib/constants";
import { formatCompact, formatDateTime } from "@/lib/format";
import { parseRadarParams } from "@/lib/radar-params";
import { runNicheDetection } from "@/services/niches";

export const metadata: Metadata = { title: "Nichos Nascendo" };

export const dynamic = "force-dynamic";

const TREND_META = {
  NEW: { label: "novo", className: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
  GROWING: { label: "crescendo", className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30" },
  STEADY: { label: "estável", className: "bg-zinc-500/15 text-zinc-400 ring-zinc-600/40" },
} as const;

export default async function NichosPage(props: PageProps<"/radar/nichos">) {
  const searchParams = await props.searchParams;
  const params = parseRadarParams(searchParams);
  const outcome = await runNicheDetection(params);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          🌱 Nichos Nascendo
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Temas específicos ganhando tração AGORA nos outliers long-form —
          um nicho só conta quando 3+ canais distintos estouram nele.
        </p>
      </header>

      <div className="mb-8">
        <RadarFilters
          params={params}
          basePath="/radar/nichos"
          showReplicableToggle={false}
        />
      </div>

      {outcome.status === "budget_exceeded" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-6 text-sm text-amber-200">
          <p className="font-semibold">Orçamento diário de quota do Radar atingido</p>
          <p className="mt-1.5 text-amber-200/80">
            A varredura base ainda não está em cache ({outcome.spentToday}/
            {outcome.budget} unidades usadas hoje). Volte a uma combinação já
            varrida ou tente amanhã.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {outcome.report.source === "mock" ? (
            <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 px-5 py-4 text-xs text-zinc-400">
              ⚠︎ Dados demonstrativos (mock). Configure YOUTUBE_API_KEY para
              detecção real.
            </div>
          ) : null}

          {outcome.report.niches.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-6 text-sm text-zinc-400">
              Nenhum tema com 3+ canais distintos estourando nesta varredura —
              tente outra janela ou outro par idioma/país.
            </div>
          ) : (
            outcome.report.niches.map((niche) => {
              const trend = TREND_META[niche.trend];
              return (
                <div
                  key={niche.term}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                      {niche.displayName}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${trend.className}`}
                      >
                        {trend.label}
                      </span>
                    </p>
                    <p className="text-xs tabular-nums text-zinc-400">
                      {niche.channelCount} canais · {niche.videoCount} outliers
                      · {formatCompact(niche.avgVph)}/h médio
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    subnicho de{" "}
                    <span className="text-zinc-400">
                      {CATEGORY_LABELS[niche.parentCategory]}
                    </span>{" "}
                    · termo: “{niche.term}”
                  </p>
                  <ul className="mt-3 space-y-1">
                    {niche.examples.map((example) => (
                      <li key={example.videoId} className="truncate text-xs text-zinc-500">
                        <span className="tabular-nums text-zinc-600">
                          {formatCompact(example.vph)}/h
                        </span>{" "}
                        <a
                          href={`https://www.youtube.com/watch?v=${example.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-400 hover:text-zinc-200 hover:underline"
                        >
                          {example.title}
                        </a>{" "}
                        <span className="text-zinc-600">— {example.channelTitle}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-3 border-t border-zinc-800/60 pt-3 text-xs">
                    <Link
                      href={`/analisar?q=${encodeURIComponent(niche.term)}`}
                      className="text-zinc-300 hover:text-white hover:underline"
                    >
                      🔎 Analisar tema
                    </Link>
                    <Link
                      href={`/window?q=${encodeURIComponent(niche.term)}&from=${params.language}`}
                      className="text-zinc-300 hover:text-white hover:underline"
                    >
                      🌍 Verificar janela
                    </Link>
                  </div>
                </div>
              );
            })
          )}

          {outcome.status === "ok" ? (
            <p className="text-center text-xs text-zinc-600">
              Base: varredura de {formatDateTime(outcome.report.sweptAt)}{" "}
              (reaproveitada do cache do Radar — custo extra 0) · nomes{" "}
              {outcome.report.namedBy === "ai" ? "pela IA" : "brutos (IA indisponível)"}
            </p>
          ) : null}
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-zinc-600">
        {APP_DISCLAIMER}
      </footer>
    </main>
  );
}
