import Link from "next/link";
import { AnalyzeForm } from "@/components/analyze-form";
import { HistoryList } from "@/components/history-list";
import {
  APP_DISCLAIMER,
  APP_NAME,
  APP_TAGLINE,
  HISTORY_LIMIT,
} from "@/lib/constants";
import { listRecentAnalyses } from "@/lib/repository";

// O histórico muda a cada análise — nunca servir esta página de cache.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const history = await listRecentAnalyses(HISTORY_LIMIT);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <nav className="mb-8 flex items-center justify-end">
        <Link
          href="/radar"
          className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
        >
          📡 Radar — o que está bombando agora →
        </Link>
      </nav>

      <header className="mb-10 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {APP_NAME}
        </p>
        <h1 className="mx-auto mt-5 max-w-md text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
          {APP_TAGLINE}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Demanda, concorrência, saturação e tendência analisadas antes de você
          gravar. Sem promessas de viral.
        </p>
      </header>

      <AnalyzeForm />

      <section className="mt-12">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Últimas análises
        </h2>
        <HistoryList items={history} />
      </section>

      <footer className="mt-16 text-center text-xs text-zinc-600">
        {APP_DISCLAIMER} · Fase 1 com dados demonstrativos (mock).
      </footer>
    </main>
  );
}
