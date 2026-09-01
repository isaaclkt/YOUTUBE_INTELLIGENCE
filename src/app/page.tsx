import Link from "next/link";
import { HistoryList } from "@/components/history-list";
import { StatCard } from "@/components/stat-card";
import { RADAR_WINDOWS } from "@/lib/constants";
import {
  formatCompact,
  formatDateTime,
  formatLongDate,
  greetingForNow,
} from "@/lib/format";
import { getDashboardSummary } from "@/services/dashboard";

// Painel muda com caches e análises — nunca servir de cache do Next.
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const summary = await getDashboardSummary();
  const windowLabel = summary.sweep
    ? RADAR_WINDOWS.find((w) => w.key === summary.sweep?.window)?.label ??
      summary.sweep.window
    : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          {greetingForNow()} 👋
        </h1>
        <p className="mt-1 text-sm capitalize text-zinc-500">
          {formatLongDate()} · resumo do dia
        </p>
      </header>

      {/* Próximo passo sugerido */}
      <section className="mb-8 rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-zinc-900/60 p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-red-300/80">
          Próximo passo sugerido
          <span className="rounded-full bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-medium lowercase text-zinc-500 ring-1 ring-zinc-700/60">
            {summary.nextStep.generatedBy === "ai" ? "ia" : "motor"}
          </span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-200 sm:text-base">
          {summary.nextStep.text}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {summary.nextStep.actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Métricas do dia */}
      <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Outliers na varredura"
          value={summary.sweep ? String(summary.sweep.outliers) : "—"}
          hint={
            summary.sweep
              ? `${summary.sweep.flag} ${summary.sweep.pairLabel} · ${windowLabel}`
              : "sem varredura em cache"
          }
          href="/radar"
        />
        <StatCard
          label="Nichos nascendo"
          value={
            summary.nichesCount !== null ? String(summary.nichesCount) : "—"
          }
          hint={
            summary.nichesCount !== null
              ? "ativos na última detecção"
              : "abra a aba para detectar"
          }
          href="/radar/nichos"
        />
        <StatCard
          label="Canais em ascensão"
          value={
            summary.ascendingCount !== null
              ? String(summary.ascendingCount)
              : "—"
          }
          hint={
            summary.ascendingCount !== null
              ? "consistentes monitorados"
              : "abra a aba para avaliar"
          }
          href="/radar/canais"
        />
        <StatCard
          label="Quota do dia"
          value={formatCompact(summary.quota.spent)}
          hint={`restam ${formatCompact(summary.quota.remaining)} de ${formatCompact(summary.quota.limit)}`}
        />
        <StatCard
          label="Análises"
          value={String(summary.analysesTotal)}
          hint={`${summary.analysesLast24h} nas últimas 24h`}
          href="/historico"
        />
      </section>

      {/* Últimas análises */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Últimas análises
          </h2>
          <Link
            href="/historico"
            className="text-xs text-zinc-400 transition hover:text-zinc-200"
          >
            ver histórico →
          </Link>
        </div>
        <HistoryList items={summary.recent} />
      </section>

      {summary.sweep ? (
        <p className="mt-8 text-center text-xs text-zinc-600">
          Última varredura: {formatDateTime(summary.sweep.sweptAt)} ·{" "}
          {summary.sweep.replicable} vídeos replicáveis no pool
        </p>
      ) : null}
    </main>
  );
}
