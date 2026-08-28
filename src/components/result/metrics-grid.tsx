import type { MetricSourceMap, Scores } from "@/domain";
import { METRIC_META } from "@/lib/metrics";
import { MetricCard } from "../metric-card";

/**
 * Grid das 4 métricas, dirigido pela configuração de src/lib/metrics.ts.
 * `sources` liga o selo "estimado" por métrica (ausente em análises
 * antigas — nesse caso nenhum selo é exibido).
 */
export function MetricsGrid({
  scores,
  sources,
}: {
  scores: Scores;
  sources?: MetricSourceMap;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {METRIC_META.map((metric) => (
        <MetricCard
          key={metric.key}
          label={metric.label}
          value={scores[metric.key]}
          hint={metric.hint}
          invert={metric.invert}
          estimated={sources?.[metric.key] === "estimated"}
        />
      ))}
    </div>
  );
}
