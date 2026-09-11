import Link from "next/link";
import type { LanguageCode, RadarVideo } from "@/domain";
import { formatCompact, formatVideoAge } from "@/lib/format";
import { Card } from "../card";

/** Bloco "Vídeos estourando": top vídeos por VPH na janela. */
export function TrendingVideosCard({
  videos,
  title = "Vídeos estourando",
  windowFromLanguage,
  categoryLabels = {},
}: {
  videos: RadarVideo[];
  title?: string;
  /** Habilita o link "🌍 janela" nos itens (idioma de origem). */
  windowFromLanguage?: LanguageCode;
  /** slug → nome da categoria (vindo do SQLite). */
  categoryLabels?: Readonly<Record<string, string | undefined>>;
}) {
  if (videos.length === 0) return null;
  return (
    <Card title={title}>
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
              {video.isReplicable ? (
                <span className="ml-2 inline-flex rounded-full bg-violet-500/15 px-1.5 py-0.5 align-middle text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/30">
                  replicável
                </span>
              ) : null}
              <p className="mt-0.5 text-xs text-zinc-500">
                {video.channelTitle}
                {video.subscribers !== null
                  ? ` (${formatCompact(video.subscribers)} inscritos)`
                  : ""}{" "}
                · {formatCompact(video.views)} views ·{" "}
                {formatVideoAge(video.publishedAt)} ·{" "}
                <span className="text-zinc-600">
                  {categoryLabels[video.category] ?? video.category}
                </span>
                {windowFromLanguage ? (
                  <>
                    {" · "}
                    <Link
                      href={`/window?q=${encodeURIComponent(video.title.slice(0, 100))}&from=${windowFromLanguage}`}
                      className="text-zinc-400 hover:text-zinc-200 hover:underline"
                    >
                      🌍 janela
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
