import { metricBarColorClass } from "@/lib/metrics";
import { ScoreBar } from "./score-bar";

/**
 * Card de uma métrica 0–100. Puramente apresentacional:
 * a classificação de cor vive em src/lib/metrics.ts.
 * `estimated` exibe o selo "estimado" (dado mock/demonstrativo).
 */
export function MetricCard({
  label,
  value,
  hint,
  invert = false,
  estimated = false,
}: {
  label: string;
  value: number;
  hint: string;
  invert?: boolean;
  estimated?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
          {label}
          {estimated ? (
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium lowercase tracking-wide text-zinc-500 ring-1 ring-zinc-700/60">
              estimado
            </span>
          ) : null}
        </p>
        <p className="text-2xl font-bold tabular-nums text-zinc-100">
          {value}
          <span className="text-xs font-normal text-zinc-500">/100</span>
        </p>
      </div>
      <div className="mt-3">
        <ScoreBar value={value} colorClass={metricBarColorClass(value, invert)} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}
