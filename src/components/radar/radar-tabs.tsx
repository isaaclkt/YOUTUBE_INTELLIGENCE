import Link from "next/link";

const TABS = [
  { href: "/radar", label: "📡 Radar" },
  { href: "/radar/nichos", label: "🌱 Nichos Nascendo" },
  { href: "/radar/canais", label: "🚀 Canais em Ascensão" },
  { href: "/radar/shorts", label: "🎬 Shorts" },
] as const;

/** Navegação entre as abas da família Radar. */
export function RadarTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            tab.href === active
              ? "border-red-500/50 bg-red-500/10 text-red-300"
              : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
