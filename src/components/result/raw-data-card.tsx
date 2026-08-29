import type { SampleVideo } from "@/domain";
import { formatCompact, formatVideoAge } from "@/lib/format";

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Card expansível "Ver dados brutos": a amostra de vídeos coletada,
 * ordenada por VPH para leitura. Só renderiza com dados reais.
 */
export function RawDataCard({ videos }: { videos: SampleVideo[] }) {
  if (videos.length === 0) return null;
  const sorted = [...videos].sort((a, b) => b.vph - a.vph);

  return (
    <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <summary className="flex cursor-pointer select-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden sm:p-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Ver dados brutos · {videos.length} vídeos da amostra
        </span>
        <span className="text-zinc-500 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="overflow-x-auto px-5 pb-5 sm:px-6 sm:pb-6">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="pb-2 pr-3 font-medium">Título</th>
              <th className="pb-2 pr-3 font-medium">Canal</th>
              <th className="pb-2 pr-3 text-right font-medium">Inscritos</th>
              <th className="pb-2 pr-3 text-right font-medium">Views</th>
              <th className="pb-2 pr-3 text-right font-medium">Idade</th>
              <th className="pb-2 pr-3 text-right font-medium">VPH</th>
              <th className="pb-2 font-medium">Sinais</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((video) => (
              <tr key={video.videoId} className="border-t border-zinc-800/60">
                <td className="max-w-[300px] py-2 pr-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-zinc-200 hover:text-white hover:underline"
                  >
                    {video.title}
                  </a>
                </td>
                <td className="max-w-[160px] truncate py-2 pr-3 text-zinc-400">
                  {video.channelTitle}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-zinc-400">
                  {video.subscribers === null
                    ? "—"
                    : formatCompact(video.subscribers)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-zinc-300">
                  {formatCompact(video.views)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-zinc-400">
                  {formatVideoAge(video.publishedAt)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-zinc-300">
                  {formatCompact(video.vph)}/h
                </td>
                <td className="py-2">
                  <span className="flex gap-1">
                    {video.isOutlier ? (
                      <Badge
                        label="outlier"
                        className="bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                      />
                    ) : null}
                    {video.isStrongChannel ? (
                      <Badge
                        label="canal forte"
                        className="bg-sky-500/15 text-sky-400 ring-sky-500/30"
                      />
                    ) : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-zinc-600">
          outlier = vídeo performando muito acima da média do próprio canal ·
          canal forte = canal grande que pesa no score de concorrência ·
          VPH = views por hora desde a publicação
        </p>
      </div>
    </details>
  );
}
