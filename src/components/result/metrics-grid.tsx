import type { Scores } from "@/domain";
import { METRIC_META } from "@/lib/metrics";
import { MetricCard } from "../metric-card";

/** Grid das 4 métricas, dirigido pela configuração de src/lib/metrics.ts. */
export function MetricsGrid({ scores }: { scores: Scores }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {METRIC_META.map((metric) => (
        <MetricCard
          key={metric.key}
          label={metric.label}
          value={scores[metric.key]}
          hint={metric.hint}
          invert={metric.invert}
        />
      ))}
    </div>
  );
}
