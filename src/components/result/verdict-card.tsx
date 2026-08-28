import type { Scores, Verdict } from "@/domain";
import { VERDICT_QUESTION } from "@/lib/constants";
import { VERDICT_META } from "@/lib/verdict";
import { ScoreBar } from "../score-bar";
import { VerdictBadge } from "../verdict-badge";

/** Card principal do resultado: veredito + Opportunity Score + barra. */
export function VerdictCard({
  verdict,
  scores,
}: {
  verdict: Verdict;
  scores: Scores;
}) {
  const meta = VERDICT_META[verdict];
  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl ${meta.glowClass}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {VERDICT_QUESTION}
          </p>
          <div className="mt-2">
            <VerdictBadge verdict={verdict} size="lg" />
          </div>
          <p className="mt-3 max-w-md text-sm text-zinc-400">
            {meta.description}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Opportunity Score
          </p>
          <p className={`mt-1 text-6xl font-bold tabular-nums ${meta.textClass}`}>
            {scores.opportunity}
            <span className="text-xl font-normal text-zinc-600">/100</span>
          </p>
        </div>
      </div>
      <div className="mt-6">
        <ScoreBar
          value={scores.opportunity}
          colorClass={meta.barClass}
          heightClass="h-3"
        />
      </div>
    </section>
  );
}
