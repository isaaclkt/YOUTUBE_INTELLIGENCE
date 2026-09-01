import type { Metadata } from "next";
import Link from "next/link";
import { HeatingNichesCard } from "@/components/radar/heating-niches-card";
import { RadarFilters } from "@/components/radar/radar-filters";
import { RisingChannelsCard } from "@/components/radar/rising-channels-card";
import { TrendingVideosCard } from "@/components/radar/trending-videos-card";
import { APP_DISCLAIMER } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { parseRadarParams } from "@/lib/radar-params";
import { rankNiches } from "@/lib/rpm";
import { runRadarSweep } from "@/services/radar";

export const metadata: Metadata = { title: "Radar" };

// Varredura e cache mudam ao longo do dia — nunca servir de cache do Next.
export const dynamic = "force-dynamic";

export default async function RadarPage(props: PageProps<"/radar">) {
  const searchParams = await props.searchParams;
  const params = parseRadarParams(searchParams);
  const outcome = await runRadarSweep({ ...params, format: "longform" });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          Radar
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          O que está bombando agora em vídeos longos (4min+), sem precisar
          informar um tema.
        </p>
      </header>

      <div className="mb-8">
        <RadarFilters params={params} />
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
            novamente amanhã — o teto protege a quota das análises de tema.
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

          {(() => {
            // Modo estrito (padrão): só itens replicáveis (dark-friendly).
            const { showAll } = params;
            const trending = outcome.sweep.trendingVideos.filter(
              (v) => showAll || v.isReplicable
            );
            const rising = outcome.sweep.risingChannels.filter(
              (c) => showAll || c.isReplicable
            );
            const niches = rankNiches(outcome.sweep.heatingNiches, {
              strictReplicable: !showAll,
            });
            const hiddenCount =
              outcome.sweep.trendingVideos.length - trending.length;
            return (
              <>
                {!showAll && hiddenCount > 0 && trending.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-xs text-zinc-400">
                    Nenhum vídeo replicável nesta varredura — use{" "}
                    <span className="text-zinc-300">“mostrar todos”</span> para
                    ver os {hiddenCount} itens não replicáveis.
                  </div>
                ) : null}
                <TrendingVideosCard
                  videos={trending}
                  windowFromLanguage={params.language}
                />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <RisingChannelsCard channels={rising} />
                  <HeatingNichesCard niches={niches} strict={!showAll} />
                </div>
              </>
            );
          })()}

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
