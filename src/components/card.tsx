import type { ReactNode } from "react";

/** Contêiner base dos cards do tema escuro. */
export function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 ${className ?? ""}`}
    >
      {title ? (
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
