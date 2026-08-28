/** Bloco de carregamento pulsante. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-800/80 ${className ?? ""}`} />
  );
}
