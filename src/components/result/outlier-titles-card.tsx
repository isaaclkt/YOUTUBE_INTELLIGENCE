import type { SampleVideo } from "@/domain";
import { formatCompact, formatVideoAge } from "@/lib/format";
import { Card } from "../card";

/** Quantos outliers exibir no card (a tabela completa fica nos dados brutos). */
const MAX_ITEMS = 10;

/**
 * Card "Títulos que estão performando agora": os outliers reais do
 * nicho, ordenados por VPH — referência de padrão que funciona hoje.
 * Só renderiza quando a análise tem outliers reais.
 */
export function OutlierTitlesCard({ videos }: { videos: SampleVideo[] }) {
  const outliers = videos
    .filter((video) => video.isOutlier)
    .sort((a, b) => b.vph - a.vph)
    .slice(0, MAX_ITEMS);
  if (outliers.length === 0) return null;

  return (
    <Card title="Títulos que estão performando agora">
      <p className="mb-4 text-xs text-zinc-500">
        Vídeos reais performando muito acima da média dos próprios canais —
        referência do padrão de título que funciona neste nicho hoje.
      </p>
      <ol className="space-y-3">
        {outliers.map((video) => (
          <li key={video.videoId} className="flex items-baseline gap-3">
            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
              {formatCompact(video.vph)}/h
            </span>
            <div className="min-w-0">
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium leading-snug text-zinc-200 hover:text-white hover:underline"
              >
                {video.title}
              </a>
              <p className="mt-0.5 text-xs text-zinc-500">
                {video.channelTitle} · {formatCompact(video.views)} views ·{" "}
                {formatVideoAge(video.publishedAt)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
