import Link from "next/link";

/** Card de navegação do painel da Home. `highlight` = destaque visual. */
export function NavCard({
  href,
  emoji,
  title,
  description,
  highlight = false,
  className,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border p-5 transition ${
        highlight
          ? "border-red-500/40 bg-gradient-to-br from-red-500/10 to-zinc-900/60 hover:border-red-500/70"
          : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
      } ${className ?? ""}`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
        {title}
        <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-zinc-300">
          →
        </span>
      </span>
      <span className="mt-1 text-xs leading-relaxed text-zinc-500">
        {description}
      </span>
    </Link>
  );
}
