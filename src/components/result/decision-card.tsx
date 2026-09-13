import { formatCompact } from "@/lib/format";
import { EVIDENCE_META, METRIC_KIND_META } from "@/lib/verdict";
import type { DecisionResult } from "@/services/decision/engine";
import type { DecisionMetric } from "@/services/decision/metrics";
import type { LongitudinalIndicator } from "@/services/decision/longitudinal";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";

/**
 * Card do MOTOR DE DECISÃO V2.
 *
 * Cada número traz a própria origem (real / derivado / proxy), e
 * métrica não medida aparece como "não medido" — nunca como zero.
 */

function MetricRow({
  label,
  hint,
  metric,
  format,
  invert,
}: {
  label: string;
  hint: string;
  metric: DecisionMetric;
  format: (raw: number) => string;
  invert: boolean;
}) {
  const kind = METRIC_KIND_META[metric.kind];
  const unavailable = metric.value === null;
  const favorable = unavailable
    ? 0
    : invert
      ? 100 - metric.value!
      : metric.value!;
  const colorClass =
    favorable >= 60 ? "bg-emerald-500" : favorable >= 35 ? "bg-amber-500" : "bg-red-500";

  return (
    <li className="border-t border-zinc-800/60 pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
          {label}
          <span
            title={kind.title}
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium lowercase ring-1 ${kind.badgeClass}`}
          >
            {kind.label}
          </span>
        </p>
        {unavailable ? (
          <span className="text-xs text-zinc-500">não medido</span>
        ) : (
          <p className="text-sm font-semibold tabular-nums text-zinc-100">
            {format(metric.raw!)}
            <span className="ml-1.5 text-xs font-normal text-zinc-500">
              {metric.value}/100
            </span>
          </p>
        )}
      </div>
      {unavailable ? (
        <p className="mt-1 text-xs text-zinc-600">{metric.unavailableReason}</p>
      ) : (
        <>
          <div className="mt-2">
            <ScoreBar value={metric.value!} colorClass={colorClass} />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
        </>
      )}
    </li>
  );
}

export function DecisionCard({
  decision,
  longitudinal,
}: {
  decision: DecisionResult;
  longitudinal?: LongitudinalIndicator | null;
}) {
  const evidence = EVIDENCE_META[decision.quality];
  const c = decision.counters;

  return (
    <Card title="Como o motor decidiu">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${evidence.badgeClass}`}
        >
          {evidence.label}
        </span>
        {decision.scoreBand ? (
          <p className="text-xs text-zinc-400">
            Oportunidade:{" "}
            <span className="font-semibold text-zinc-200">
              {decision.scoreBand}
            </span>
          </p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-3">
        <MetricRow
          label="Alcance do entrante"
          hint="Views do vídeo mediano de canais pequenos neste tema, na janela de 7–90 dias."
          metric={decision.metrics.reach}
          format={(raw) => `${formatCompact(raw)} views`}
          invert={false}
        />
        <MetricRow
          label="Concentração"
          hint="Quanto da audiência do tema está com os três maiores canais."
          metric={decision.metrics.concentration}
          format={(raw) => `${Math.round(raw * 100)}% no top 3`}
          invert
        />
        <MetricRow
          label="Pressão de oferta"
          hint="Densidade de publicação long-form no tema."
          metric={decision.metrics.supplyPressure}
          format={(raw) => `${raw}/mês`}
          invert
        />
      </ul>

      {decision.reasons.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-zinc-800/60 pt-3">
          {decision.reasons.map((reason) => (
            <li key={reason} className="text-xs leading-relaxed text-zinc-400">
              · {reason}
            </li>
          ))}
        </ul>
      ) : null}

      {longitudinal ? (
        <p className="mt-4 border-t border-zinc-800/60 pt-3 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Velocidade real:</span>{" "}
          {formatCompact(longitudinal.medianViewsPerDay)} views/dia na mediana,
          medidos em {longitudinal.comparedVideos} vídeos ao longo de{" "}
          {longitudinal.spanDays} dias. Não entra no score.
        </p>
      ) : null}

      <div className="mt-4 border-t border-zinc-800/60 pt-3 text-xs text-zinc-600">
        <p>
          Amostra: {c.sampleSize} vídeos long-form · {c.newcomerCount} de canais
          pequenos · {c.unclassifiableCount} sem inscritos visíveis ·{" "}
          {c.distinctChannels} canais distintos
          {c.discardedCount > 0
            ? ` · ${c.discardedCount} descartados de ${c.rawCount} recebidos`
            : ""}
        </p>
        <p className="mt-1">
          Régua: piso {formatCompact(decision.parameters.viewsFloor)} · alvo{" "}
          {formatCompact(decision.parameters.viewsTarget)} · entrante até{" "}
          {formatCompact(decision.parameters.newcomerMaxSubscribers)} inscritos ·
          tier {decision.parameters.tier === "full" ? "completo" : "reduzido"}
        </p>
      </div>
    </Card>
  );
}
