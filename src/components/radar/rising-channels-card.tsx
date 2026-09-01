import type { RadarChannel } from "@/domain";
import { formatCompact, formatVideoAge } from "@/lib/format";
import { Card } from "../card";

/** Bloco "Canais novos explodindo": pequenos/novos com VPH alto. */
export function RisingChannelsCard({ channels }: { channels: RadarChannel[] }) {
  if (channels.length === 0) return null;
  return (
    <Card title="Canais novos explodindo">
      <p className="mb-4 text-xs text-zinc-500">
        Canais pequenos ou recentes que acertaram de primeira: poucos vídeos
        publicados, outlier recente e razão views/inscritos alta. Canais
        &quot;grinder&quot; (muitos vídeos, quase nenhum inscrito) ficam de
        fora — o formato deles já provou que não funciona.
      </p>
      <ol className="space-y-3">
        {channels.map((channel) => (
          <li key={channel.channelId} className="flex items-baseline gap-3">
            <span className="w-14 shrink-0 text-right text-xs font-bold tabular-nums text-emerald-400">
              {formatCompact(channel.viewsPerSubscriber)}×
            </span>
            <div className="min-w-0">
              <a
                href={`https://www.youtube.com/channel/${channel.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium leading-snug text-zinc-200 hover:text-white hover:underline"
              >
                {channel.channelTitle}
              </a>
              {channel.isReplicable ? (
                <span className="ml-2 inline-flex rounded-full bg-violet-500/15 px-1.5 py-0.5 align-middle text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/30">
                  replicável
                </span>
              ) : null}
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatCompact(channel.subscribers)} inscritos ·{" "}
                {channel.totalVideos} vídeos no canal
                {channel.channelPublishedAt
                  ? ` · canal há ${formatVideoAge(channel.channelPublishedAt)}`
                  : ""}{" "}
                · {formatCompact(channel.recentViews)} views na janela · melhor
                vídeo {formatCompact(channel.bestVph)}/h ·{" "}
                {formatCompact(channel.viewsPerSubscriber)}× views/inscritos
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
