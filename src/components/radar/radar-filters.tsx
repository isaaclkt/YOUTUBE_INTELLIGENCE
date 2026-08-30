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
}: {
  params: RadarParams;
  basePath?: string;
}) {
  const currentPair = pairKey(params.language, params.country);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RADAR_PAIRS.map((pair) => {
          const key = pairKey(pair.language, pair.country);
          return (
            <Pill
              key={key}
              href={`${basePath}?pair=${encodeURIComponent(key)}&window=${params.window}`}
              active={key === currentPair}
            >
              {pair.flag} {pair.label}
            </Pill>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {RADAR_WINDOWS.map((window) => (
          <Pill
            key={window.key}
            href={`${basePath}?pair=${encodeURIComponent(currentPair)}&window=${window.key}`}
            active={window.key === params.window}
          >
            {window.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}
