/** Barra horizontal 0–100. A cor vem de fora (classe Tailwind). */
export function ScoreBar({
  value,
  colorClass,
  heightClass = "h-2",
}: {
  value: number;
  colorClass: string;
  heightClass?: string;
}) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-zinc-800 ${heightClass}`}
    >
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
