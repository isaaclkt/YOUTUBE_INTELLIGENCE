import type { Recommendation } from "@/domain";
import { formatPercent } from "@/lib/format";
import { VERDICT_META } from "@/lib/verdict";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";
import { VerdictBadge } from "../verdict-badge";

/** Card "Recomendação final" com confiança em %. */
export function RecommendationCard({
  recommendation,
  /**
   * V2: a confiança em percentual é suprimida quando o motor novo
   * está ativo — ela media tamanho de amostra, não confiabilidade, e
   * foi substituída pela qualidade da evidência no card de decisão.
   */
  showConfidence = true,
}: {
  recommendation: Recommendation;
  showConfidence?: boolean;
}) {
  const meta = VERDICT_META[recommendation.verdict];
  return (
    <Card title="Recomendação final">
      <div className="flex items-start gap-3">
        <VerdictBadge verdict={recommendation.verdict} />
        <p className="text-sm leading-relaxed text-zinc-300">
          {recommendation.summary}
        </p>
      </div>
      {showConfidence ? (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Confiança da análise
            </p>
            <p className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-300">
              {formatPercent(recommendation.confidence)}
            </p>
          </div>
          <div className="mt-2">
            <ScoreBar
              value={recommendation.confidence}
              colorClass={meta.barClass}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
