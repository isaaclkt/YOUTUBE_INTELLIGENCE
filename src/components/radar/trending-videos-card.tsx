import type { RadarVideo } from "@/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCompact, formatVideoAge } from "@/lib/format";
import { Card } from "../card";

/** Bloco "Vídeos estourando": top vídeos por VPH na janela. */
export function TrendingVideosCard({ videos }: { videos: RadarVideo[] }) {
  if (videos.length === 0) return null;
  return (
    <Card title="Vídeos estourando">
      <p className="mb-4 text-xs text-zinc-500">
        Maior velocidade de views (VPH) entre os vídeos publicados na janela —
        o VPH já desconta a idade do vídeo.
      </p>
      <ol className="space-y-3">
        {videos.map((video) => (
          <li key={video.videoId} className="flex items-baseline gap-3">
            <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-300">
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
                {video.channelTitle}
                {video.subscribers !== null
                  ? ` (${formatCompact(video.subscribers)} inscritos)`
                  : ""}{" "}
                · {formatCompact(video.views)} views ·{" "}
                {formatVideoAge(video.publishedAt)} ·{" "}
                <span className="text-zinc-600">
                  {CATEGORY_LABELS[video.category]}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
