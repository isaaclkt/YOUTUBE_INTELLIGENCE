import { formatCompact } from "@/lib/format";
import { EVIDENCE_META, METRIC_KIND_META } from "@/lib/verdict";
import type { DecisionResult } from "@/services/decision/engine";
import type { LongitudinalIndicator } from "@/services/decision/longitudinal";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";

/**
 * Card do MOTOR DE DECISÃO V2.
 *
 * Separa visualmente o que decide do que apenas contextualiza:
 * a concentração é a métrica decisiva; o alcance do entrante é
 * reportado como contagem verificável, sem ser chamado de demanda
 * nem de potencial.
 */
export function DecisionCard({
  decision,
  longitudinal,
}: {
  decision: DecisionResult;
  longitudinal?: LongitudinalIndicator | null;
}) {
  const evidence = EVIDENCE_META[decision.quality];
  const c = decision.counters;
  const conc = decision.concentration;
  const ctx = decision.newcomerContext;
  const derived = METRIC_KIND_META.derived;

  const favorable = conc.value === null ? 0 : 100 - conc.value;
  const colorClass =
    favorable >= 60
      ? "bg-emerald-500"
      : favorable >= 35
        ? "bg-amber-500"
        : "bg-red-500";

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

      {/* ---------- Métrica decisiva ---------- */}
      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
            Concentração
            <span
              title={derived.title}
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium lowercase ring-1 ${derived.badgeClass}`}
            >
              {derived.label}
            </span>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-700/60">
              decide o veredito
            </span>
          </p>
          {conc.value === null ? (
            <span className="text-xs text-zinc-500">não medida</span>
          ) : (
            <p className="text-sm font-semibold tabular-nums text-zinc-100">
              {conc.value}
              <span className="ml-1 text-xs font-normal text-zinc-500">
                /100
                {conc.band ? ` · intervalo ${conc.band.p5}–${conc.band.p95}` : ""}
              </span>
            </p>
          )}
        </div>
        {conc.value === null ? (
          <p className="mt-1 text-xs text-zinc-600">{conc.unavailableReason}</p>
        ) : (
          <>
            <div className="mt-2">
              <ScoreBar value={conc.value} colorClass={colorClass} />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              Os três maiores canais reúnem{" "}
              {Math.round((conc.topThreeShare ?? 0) * 100)}% das views da
              amostra, entre {conc.distinctChannels} canais distintos.
            </p>
          </>
        )}
      </div>

      {/* ---------- Evidência contextual ---------- */}
      <div className="mt-5 border-t border-zinc-800/60 pt-4">
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-zinc-400">
          Contexto: canais pequenos neste tema
          <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-zinc-700/60">
            não entra no veredito
          </span>
        </p>
        {ctx.sharePercent === null ? (
          <p className="mt-1.5 text-xs text-zinc-600">
            Apenas {ctx.videos} vídeo(s) de canais com até{" "}
            {formatCompact(decision.parameters.newcomerMaxSubscribers)}{" "}
            inscritos — poucos para relatar.
          </p>
        ) : (
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            <span className="font-semibold text-zinc-300">
              {ctx.aboveFloor} de {ctx.videos}
            </span>{" "}
            vídeos de canais com até{" "}
            {formatCompact(decision.parameters.newcomerMaxSubscribers)}{" "}
            inscritos ultrapassaram {formatCompact(ctx.floor)} views (
            {ctx.sharePercent}%). Mediana desses vídeos:{" "}
            {formatCompact(ctx.medianViews ?? 0)} views.
          </p>
        )}
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
          É uma contagem do que foi observado na amostra. Não mede demanda do
          tema nem potencial de um canal novo: o porte do canal explica a
          maior parte da variação desse número.
        </p>
      </div>

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
          Amostra: {c.sampleSize} vídeos long-form · {c.distinctChannels} canais
          distintos · {c.newcomerCount} de canais pequenos ·{" "}
          {c.unclassifiableCount} sem inscritos visíveis
          {c.discardedCount > 0
            ? ` · ${c.discardedCount} descartados de ${c.rawCount} recebidos`
            : ""}
        </p>
        <p className="mt-1">
          Régua: NÃO a partir de {decision.parameters.concentrationSaturated} ·
          SIM abaixo de {decision.parameters.concentrationForYes} com o
          intervalo inteiro abaixo do limiar
          {decision.lambda !== null
            ? ` · score encolhido por λ = ${decision.lambda.toFixed(2)}`
            : ""}
        </p>
      </div>
    </Card>
  );
}
