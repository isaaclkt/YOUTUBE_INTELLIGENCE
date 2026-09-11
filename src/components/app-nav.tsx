"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "Visão Geral", match: (p: string) => p === "/" },
  {
    href: "/analisar",
    icon: "🔎",
    label: "Analisar Tema",
    match: (p: string) => p.startsWith("/analisar") || p.startsWith("/analysis"),
  },
  {
    href: "/radar",
    icon: "📡",
    label: "Radar",
    match: (p: string) => p === "/radar" || p.startsWith("/window"),
  },
  {
    href: "/radar/nichos",
    icon: "🌱",
    label: "Nichos Nascendo",
    match: (p: string) => p.startsWith("/radar/nichos"),
  },
  {
    href: "/radar/canais",
    icon: "🚀",
    label: "Canais em Ascensão",
    match: (p: string) => p.startsWith("/radar/canais"),
  },
  {
    href: "/radar/shorts",
    icon: "🎬",
    label: "Shorts (ideias)",
    match: (p: string) => p.startsWith("/radar/shorts"),
  },
  {
    href: "/historico",
    icon: "🕘",
    label: "Histórico",
    match: (p: string) => p.startsWith("/historico"),
  },
  {
    href: "/categorias",
    icon: "⚙️",
    label: "Categorias",
    match: (p: string) => p.startsWith("/categorias"),
  },
] as const;

function itemClass(active: boolean): string {
  return `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
    active
      ? "bg-red-500/10 font-semibold text-red-300 ring-1 ring-red-500/30"
      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
  }`;
}

/** Navegação do painel: sidebar fixa no desktop, barra rolável no mobile. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-zinc-800/80 bg-zinc-950/95 px-3 py-5 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-sm font-bold tracking-tight text-zinc-100">
            {APP_NAME}
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={itemClass(item.match(pathname))}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="px-3 text-[10px] leading-relaxed text-zinc-600">
          A decisão final é sempre sua.
        </p>
      </aside>

      {/* Mobile: barra superior rolável */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
          <span className="mr-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition ${
                item.match(pathname)
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
      </header>
    </>
  );
}
