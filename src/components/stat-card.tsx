import Link from "next/link";

/** Card de métrica do painel. Puramente apresentacional. */
export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-100">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>
    </>
  );
  const className =
    "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition";
  return href ? (
    <Link href={href} className={`${className} block hover:border-zinc-600`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
