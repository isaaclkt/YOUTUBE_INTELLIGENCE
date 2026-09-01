import Link from "next/link";
import { RADAR_PAIRS, RADAR_WINDOWS } from "@/lib/constants";
import { pairKey, type RadarParams } from "@/lib/radar-params";

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-red-500/50 bg-red-500/10 text-red-300"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      }`}
    >
      {children}
    </Link>
  );
}

/** Filtros do Radar como links — estado vive na URL, sem JS de cliente. */
export function RadarFilters({
  params,
  basePath = "/radar",
  showReplicableToggle = true,
}: {
  params: RadarParams;
  basePath?: string;
  showReplicableToggle?: boolean;
}) {
  const currentPair = pairKey(params.language, params.country);
  const href = (pair: string, window: string, showAll: boolean) =>
    `${basePath}?pair=${encodeURIComponent(pair)}&window=${window}${showAll ? "&all=1" : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RADAR_PAIRS.map((pair) => {
          const key = pairKey(pair.language, pair.country);
          return (
            <Pill
              key={key}
              href={href(key, params.window, params.showAll)}
              active={key === currentPair}
            >
              {pair.flag} {pair.label}
            </Pill>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {RADAR_WINDOWS.map((window) => (
          <Pill
            key={window.key}
            href={href(currentPair, window.key, params.showAll)}
            active={window.key === params.window}
          >
            {window.label}
          </Pill>
        ))}
        {showReplicableToggle ? (
          <>
            <span className="mx-1 h-4 w-px bg-zinc-800" />
            <Pill
              href={href(currentPair, params.window, false)}
              active={!params.showAll}
            >
              🎯 só replicáveis
            </Pill>
            <Pill
              href={href(currentPair, params.window, true)}
              active={params.showAll}
            >
              mostrar todos
            </Pill>
          </>
        ) : null}
      </div>
    </div>
  );
}
