import type { Metadata } from "next";
import { HistoryList } from "@/components/history-list";
import { listRecentAnalyses } from "@/lib/repository";

export const metadata: Metadata = { title: "Histórico" };

export const dynamic = "force-dynamic";

const HISTORY_PAGE_LIMIT = 30;

export default async function HistoricoPage() {
  const items = await listRecentAnalyses(HISTORY_PAGE_LIMIT);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          🕘 Histórico
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Suas últimas {HISTORY_PAGE_LIMIT} análises de tema.
        </p>
      </header>
      <HistoryList items={items} />
    </main>
  );
}
