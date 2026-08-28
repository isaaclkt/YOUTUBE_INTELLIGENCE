import { metricBarColorClass } from "@/lib/metrics";
import { ScoreBar } from "./score-bar";

/**
 * Card de uma métrica 0–100. Puramente apresentacional:
 * a classificação de cor vive em src/lib/metrics.ts.
 */
export function MetricCard({
  label,
  value,
  hint,
  invert = false,
}: {
  label: string;
  value: number;
  hint: string;
  invert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-300">{label}</p>
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
