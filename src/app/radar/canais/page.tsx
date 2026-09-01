import type { Metadata } from "next";
import Link from "next/link";
import { RadarFilters } from "@/components/radar/radar-filters";
import { RadarTabs } from "@/components/radar/radar-tabs";
import { APP_DISCLAIMER, CATEGORY_LABELS } from "@/lib/constants";
import { formatCompact, formatDateTime, formatVideoAge } from "@/lib/format";
import { parseRadarParams } from "@/lib/radar-params";
import { runAscendingChannels } from "@/services/ascending";
import { ASC_MIN_VIEWS_HIT } from "@/services/ascending";

export const metadata: Metadata = { title: "Canais em Ascensão" };

export const dynamic = "force-dynamic";

const SIZE_FILTERS = [
  { key: "all", label: "Todos os portes", max: Number.POSITIVE_INFINITY, min: 0 },
  { key: "small", label: "Até 50k", max: 50_000, min: 0 },
  { key: "mid", label: "50k–300k", max: 300_000, min: 50_000 },
] as const;

export default async function CanaisPage(props: PageProps<"/radar/canais">) {
  const searchParams = await props.searchParams;
  const params = parseRadarParams(searchParams);
  const rawSize = Array.isArray(searchParams.size)
    ? searchParams.size[0]
    : searchParams.size;
  const size =
    SIZE_FILTERS.find((s) => s.key === rawSize) ?? SIZE_FILTERS[0];

  const outcome = await runAscendingChannels(params);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <nav className="mb-6">
        <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-200">
          ← Início
        </Link>
      </nav>
      <RadarTabs active="/radar/canais" />

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          🚀 Canais em Ascensão
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Canais dark novos ou de médio porte com desempenho CONSISTENTE —
          múltiplos long-form recentes acima de{" "}
          {formatCompact(ASC_MIN_VIEWS_HIT)} views, não um viral isolado.
        </p>
      </header>

      <div className="mb-4">
        <RadarFilters
          params={params}
          basePath="/radar/canais"
          showReplicableToggle={false}
        />
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        {SIZE_FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={`/radar/canais?pair=${params.language}~${params.country}&window=${params.window}&size=${filter.key}`}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              filter.key === size.key
                ? "border-red-500/50 bg-red-500/10 text-red-300"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {outcome.status === "budget_exceeded" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-6 text-sm text-amber-200">
          <p className="font-semibold">Orçamento diário de quota do Radar atingido</p>
          <p className="mt-1.5 text-amber-200/80">
            ({outcome.spentToday}/{outcome.budget} unidades usadas hoje.)
            Volte a uma combinação já em cache ou tente amanhã.
          </p>
        </div>
      ) : (
        (() => {
          const channels = outcome.report.channels.filter(
            (c) => c.subscribers >= size.min && c.subscribers <= size.max
          );
          return (
            <div className="space-y-4">
              {outcome.report.source === "mock" ? (
                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 px-5 py-4 text-xs text-zinc-400">
                  ⚠︎ Dados demonstrativos (mock). Configure YOUTUBE_API_KEY
                  para avaliação real.
                </div>
              ) : null}

              {channels.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-6 text-sm text-zinc-400">
                  Nenhum canal consistente neste recorte — tente outro porte,
                  janela ou par idioma/país.
                </div>
              ) : (
                channels.map((channel) => (
                  <div
                    key={channel.channelId}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                        <a
                          href={`https://www.youtube.com/channel/${channel.channelId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white hover:underline"
                        >
                          {channel.channelTitle}
                        </a>
                        {channel.isReplicable ? (
                          <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/30">
                            replicável
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs font-semibold tabular-nums text-emerald-400">
                        {channel.hitCount}/{channel.evaluatedVideos} vídeos
                        acima de {formatCompact(ASC_MIN_VIEWS_HIT)} views
                      </p>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {formatCompact(channel.subscribers)} inscritos ·{" "}
                      {channel.totalVideos} vídeos no canal
                      {channel.channelPublishedAt
                        ? ` · canal há ${formatVideoAge(channel.channelPublishedAt)}`
                        : ""}{" "}
                      · {formatCompact(channel.avgRecentViews)} views médias
                      recentes · {channel.uploadsPerWeek} uploads/semana ·{" "}
                      <span className="text-zinc-600">
                        {CATEGORY_LABELS[channel.category]}
                      </span>
                      {channel.lastUploadAt
                        ? ` · último vídeo há ${formatVideoAge(channel.lastUploadAt)}`
                        : ""}
                    </p>
                  </div>
                ))
              )}

              <p className="text-center text-xs text-zinc-600">
                Avaliação de {formatDateTime(outcome.report.checkedAt)} ·{" "}
                {outcome.report.quotaUnits > 0
                  ? `${outcome.report.quotaUnits} unidades (≈1u por canal avaliado)`
                  : outcome.report.source === "real"
                    ? "servida do cache (0 unidades)"
                    : "dados demonstrativos"}{" "}
                · cache de 12h · dentro do teto do Radar
              </p>
            </div>
          );
        })()
      )}

      <footer className="mt-12 text-center text-xs text-zinc-600">
        {APP_DISCLAIMER}
      </footer>
    </main>
  );
}
