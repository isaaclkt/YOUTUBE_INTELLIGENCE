import type { RadarNiche } from "@/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";

/** Bloco "Nichos em aquecimento": categorias ranqueadas por outliers. */
export function HeatingNichesCard({ niches }: { niches: RadarNiche[] }) {
  if (niches.length === 0) return null;
  const maxOutliers = Math.max(1, ...niches.map((n) => n.outlierCount));

  return (
    <Card title="Nichos em aquecimento">
      <p className="mb-4 text-xs text-zinc-500">
        Categorias ranqueadas por concentração de outliers nesta varredura —
        onde mais vídeos estão performando acima da média dos seus canais.
      </p>
      <ol className="space-y-4">
        {niches.map((niche, index) => (
          <li key={niche.category}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-200">
                {index + 1}º {CATEGORY_LABELS[niche.category]}
              </p>
              <p className="text-xs tabular-nums text-zinc-400">
                {niche.outlierCount} outliers / {niche.sampleCount} vídeos
              </p>
            </div>
            <div className="mt-1.5">
              <ScoreBar
                value={(niche.outlierCount / maxOutliers) * 100}
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
        ))}
      </ol>
    </Card>
  );
}
