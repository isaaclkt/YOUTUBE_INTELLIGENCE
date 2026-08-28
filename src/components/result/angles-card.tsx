import type { Opportunity } from "@/domain";
import { POTENTIAL_META } from "@/lib/verdict";
import { Card } from "../card";

/** Card "Ângulos pouco explorados" — 3 recortes com potencial e motivo. */
export function AnglesCard({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <Card title="Ângulos pouco explorados">
      <ul className="space-y-4">
        {opportunities.map((opportunity) => {
          const meta = POTENTIAL_META[opportunity.potential];
          return (
            <li
              key={opportunity.angle}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-200">
                  {opportunity.angle}
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                {opportunity.reason}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
