import type { RadarNiche, RpmTier } from "@/domain";
import { RPM_TIER_LABELS } from "@/lib/rpm";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";

/** Nome e tier de cada categoria (slug → meta), vindos do SQLite. */
export type CategoryMetaMap = Readonly<
  Record<string, { name: string; tier: RpmTier } | undefined>
>;

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
  categoryMeta = {},
}: {
  niches: RadarNiche[];
  strict?: boolean;
  categoryMeta?: CategoryMetaMap;
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
          const meta = categoryMeta[niche.category];
          const tier = meta?.tier ?? "medium";
          return (
            <li key={niche.category}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  {index + 1}º {meta?.name ?? niche.category}
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
