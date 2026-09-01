import type { Metadata } from "next";
import Link from "next/link";
import { HeatingNichesCard } from "@/components/radar/heating-niches-card";
import { RadarFilters } from "@/components/radar/radar-filters";
import { TrendingVideosCard } from "@/components/radar/trending-videos-card";
import { APP_DISCLAIMER } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { parseRadarParams } from "@/lib/radar-params";
import { rankNiches } from "@/lib/rpm";
import { runRadarSweep } from "@/services/radar";

export const metadata: Metadata = { title: "Shorts Radar" };

export const dynamic = "force-dynamic";

export default async function ShortsRadarPage(
  props: PageProps<"/radar/shorts">
) {
  const searchParams = await props.searchParams;
  const params = parseRadarParams(searchParams);
  const outcome = await runRadarSweep({ ...params, format: "shorts" });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <nav className="mb-6 flex items-center justify-between">
        <Link
          href="/radar"
          className="text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ← Radar (vídeos longos)
        </Link>
        <Link
          href="/"
          className="text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          Analisar um tema
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          Shorts Radar
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Fonte de ideias para adaptar em vídeos longos — radar de{" "}
          <span className="font-medium text-zinc-300">temas e ganchos</span>,
          não de formato.
        </p>
      </header>

      <div className="mb-8">
        <RadarFilters params={params} basePath="/radar/shorts" />
      </div>

      {outcome.status === "budget_exceeded" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-6 text-sm text-amber-200">
          <p className="font-semibold">
            Orçamento diário de quota do Radar atingido
          </p>
          <p className="mt-1.5 text-amber-200/80">
            Esta varredura ainda não está em cache e rodá-la agora passaria do
            teto diário ({outcome.spentToday}/{outcome.budget} unidades já
            usadas pelo Radar hoje). Volte a uma combinação já varrida ou tente
            novamente amanhã.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {outcome.sweep.source === "mock" ? (
            <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 px-5 py-4 text-xs text-zinc-400">
              ⚠︎ Dados demonstrativos (mock). Configure YOUTUBE_API_KEY no
              .env.local para varreduras reais.
            </div>
          ) : null}

          <TrendingVideosCard
            videos={outcome.sweep.trendingVideos.filter(
              (v) => params.showAll || v.isReplicable
            )}
            title="Shorts estourando"
          />

          <HeatingNichesCard
            niches={rankNiches(outcome.sweep.heatingNiches, {
              strictReplicable: !params.showAll,
            })}
            strict={!params.showAll}
          />

          <p className="text-center text-xs text-zinc-600">
            Varredura de {formatDateTime(outcome.sweep.sweptAt)} ·{" "}
            {outcome.sweep.quotaUnits > 0
              ? `${outcome.sweep.quotaUnits} unidades de quota`
              : outcome.sweep.source === "real"
                ? "servida do cache (0 unidades)"
                : "dados demonstrativos"}{" "}
            · cache de 12h por idioma+país+janela
          </p>
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-zinc-600">
        {APP_DISCLAIMER}
      </footer>
    </main>
  );
}
