import { AnalyzeForm } from "@/components/analyze-form";
import { HistoryList } from "@/components/history-list";
import { NavCard } from "@/components/nav-card";
import { APP_DISCLAIMER, APP_NAME, HISTORY_LIMIT } from "@/lib/constants";
import { listRecentAnalyses } from "@/lib/repository";

// O histórico muda a cada análise — nunca servir esta página de cache.
export const dynamic = "force-dynamic";

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const rawQuery = Array.isArray(searchParams.q)
    ? searchParams.q[0]
    : searchParams.q;
  const history = await listRecentAnalyses(HISTORY_LIMIT);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {APP_NAME}
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          Inteligência para vídeos longos
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          Radar do que está bombando, análise de temas e histórico — sem
          promessas de viral.
        </p>
      </header>

      {/* Painel de navegação */}
      <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NavCard
          href="/radar"
          emoji="📡"
          title="Radar"
          description="O que está bombando agora em vídeos longos (4min+), por idioma e país — outliers, canais explodindo e nichos em aquecimento."
          highlight
          className="sm:col-span-3"
        />
        <NavCard
          href="#analisar"
          emoji="🔎"
          title="Analisar tema"
          description="Vale a pena criar conteúdo sobre esse tema? Demanda, concorrência e saturação."
        />
        <NavCard
          href="/radar/shorts"
          emoji="🎬"
          title="Shorts Radar"
          description="Fonte de ideias para adaptar em vídeos longos — temas e ganchos, não formato."
        />
        <NavCard
          href="#historico"
          emoji="🕘"
          title="Histórico"
          description="Suas últimas análises de tema, com veredito e score."
        />
      </section>

      {/* Análise de tema */}
      <section id="analisar" className="scroll-mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          🔎 Analisar tema
        </h2>
        <AnalyzeForm initialQuery={rawQuery?.slice(0, 120) ?? ""} />
      </section>

      {/* Histórico */}
      <section id="historico" className="mt-12 scroll-mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          🕘 Últimas análises
        </h2>
        <HistoryList items={history} />
      </section>

      <footer className="mt-16 text-center text-xs text-zinc-600">
        {APP_DISCLAIMER}
      </footer>
    </main>
  );
}
