import Link from "next/link";
import type { AnalysisSummary } from "@/domain";
import { COUNTRY_FLAGS, LANGUAGE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { VerdictBadge } from "./verdict-badge";

/** Lista do histórico na Home. Puramente apresentacional. */
export function HistoryList({ items }: { items: AnalysisSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-10 text-center">
        <p className="text-sm text-zinc-400">Nenhuma análise ainda.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Digite um tema acima ou experimente um dos exemplos.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/analysis/${item.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">
                {item.query}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {COUNTRY_FLAGS[item.country]} {LANGUAGE_LABELS[item.language]} ·{" "}
                {formatDateTime(item.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {/* Score ausente = veredito DADOS INSUFICIENTES: sem
                  evidência não há número, e "0/100" seria uma afirmação. */}
              {item.opportunityScore === null ? (
                <span className="text-sm font-semibold text-zinc-600">—</span>
              ) : (
                <span className="text-sm font-semibold tabular-nums text-zinc-300">
                  {item.opportunityScore}
                  <span className="text-xs font-normal text-zinc-600">/100</span>
                </span>
              )}
              <VerdictBadge verdict={item.verdict} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
