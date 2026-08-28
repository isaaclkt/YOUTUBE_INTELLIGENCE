import type { Recommendation } from "@/domain";
import { VERDICT_META } from "@/lib/verdict";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";
import { VerdictBadge } from "../verdict-badge";

/** Card "Recomendação final" com confiança em %. */
export function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
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
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Confiança da análise
          </p>
          <p className="text-sm font-semibold tabular-nums text-zinc-300">
            {recommendation.confidence}%
          </p>
        </div>
        <div className="mt-2">
          <ScoreBar
            value={recommendation.confidence}
            colorClass={meta.barClass}
          />
        </div>
      </div>
    </Card>
  );
}
