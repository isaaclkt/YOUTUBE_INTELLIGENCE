import type { Verdict } from "@/domain";
import { VERDICT_META } from "@/lib/verdict";

export function VerdictBadge({
  verdict,
  size = "sm",
}: {
  verdict: Verdict;
  size?: "sm" | "lg";
}) {
  const meta = VERDICT_META[verdict];
  const sizeClass =
    size === "lg"
      ? "px-4 py-1.5 text-xl tracking-wide"
      : "px-2.5 py-0.5 text-xs tracking-wider";
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ring-1 ${meta.badgeClass} ${sizeClass}`}
    >
      {meta.label}
    </span>
  );
}
