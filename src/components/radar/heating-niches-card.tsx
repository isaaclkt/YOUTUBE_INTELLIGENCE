import type { RadarNiche } from "@/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_RPM_TIER, RPM_TIER_LABELS } from "@/lib/rpm";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";

const TIER_BADGE_CLASSES = {
  high: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  medium: "bg-zinc-500/15 text-zinc-400 ring-zinc-600/40",
  low: "bg-red-500/15 text-red-400 ring-red-500/30",
} as const;

/**
 * Bloco "Nichos em aquecimento": categorias já ranqueadas (lib/rpm.ts:
 * outliers × peso de RPM). `strict` exibe a contagem de replicáveis.
 */
export function HeatingNichesCard({
  niches,
  strict = false,
}: {
  niches: RadarNiche[];
  strict?: boolean;
}) {
  if (niches.length === 0) return null;
  const count = (n: RadarNiche) =>
    strict ? n.replicableOutlierCount : n.outlierCount;
  const maxCount = Math.max(1, ...niches.map(count));

  return (
    <Card title="Nichos em aquecimento">
      <p className="mb-4 text-xs text-zinc-500">
        Categorias ranqueadas por concentração de outliers
        {strict ? " replicáveis" : ""} × peso de RPM — nicho de RPM alto
        aquecendo vale mais que viral de RPM baixo.
      </p>
      <ol className="space-y-4">
        {niches.map((niche, index) => {
          const tier = CATEGORY_RPM_TIER[niche.category];
          return (
            <li key={niche.category}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  {index + 1}º {CATEGORY_LABELS[niche.category]}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${TIER_BADGE_CLASSES[tier]}`}
                  >
                    {RPM_TIER_LABELS[tier]}
                  </span>
                </p>
                <p className="text-xs tabular-nums text-zinc-400">
                  {count(niche)} outliers{strict ? " replicáveis" : ""} /{" "}
                  {niche.sampleCount} vídeos
                </p>
              </div>
              <div className="mt-1.5">
                <ScoreBar
                  value={(count(niche) / maxCount) * 100}
                  colorClass="bg-red-500"
                />
              </div>
              {niche.topOutlierTitle ? (
                <p className="mt-1.5 truncate text-xs text-zinc-500">
                  ex.:{" "}
                  {niche.topOutlierVideoId &&
                  !niche.topOutlierVideoId.startsWith("demo-") ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${niche.topOutlierVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-zinc-300 hover:underline"
                    >
                      {niche.topOutlierTitle}
                    </a>
                  ) : (
                    niche.topOutlierTitle
                  )}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
