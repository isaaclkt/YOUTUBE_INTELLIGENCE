import type { Scores, Verdict } from "@/domain";
import { VERDICT_QUESTION } from "@/lib/constants";
import { VERDICT_META } from "@/lib/verdict";
import { ScoreBar } from "../score-bar";
import { VerdictBadge } from "../verdict-badge";

/** Card principal do resultado: veredito + Opportunity Score + barra. */
export function VerdictCard({
  verdict,
  scores,
  /** Score do V2 e sua faixa. Quando ausentes, o card não exibe número. */
  score,
  scoreBand,
}: {
  verdict: Verdict;
  scores: Scores;
  score?: number | null;
  scoreBand?: string | null;
}) {
  const meta = VERDICT_META[verdict];
  // V2: o score só aparece quando houve evidência para calculá-lo.
  // Exibido em FAIXA, porque a resolução dos insumos não sustenta
  // a precisão de um inteiro de 0 a 100.
  const usesV2 = score !== undefined;
  const showScore = usesV2 ? score !== null : true;
  const legacyScore = scores.opportunity;
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
        {showScore ? (
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Oportunidade
            </p>
            {usesV2 ? (
              <p className={`mt-1 text-3xl font-bold ${meta.textClass}`}>
                {scoreBand}
              </p>
            ) : (
              <p
                className={`mt-1 text-6xl font-bold tabular-nums ${meta.textClass}`}
              >
                {legacyScore}
                <span className="text-xl font-normal text-zinc-600">/100</span>
              </p>
            )}
          </div>
        ) : null}
      </div>
      {showScore ? (
        <div className="mt-6">
          <ScoreBar
            value={usesV2 ? score! : legacyScore}
            colorClass={meta.barClass}
            heightClass="h-3"
          />
        </div>
      ) : null}
    </section>
  );
}
