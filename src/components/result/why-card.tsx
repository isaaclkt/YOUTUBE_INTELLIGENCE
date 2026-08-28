import { Card } from "../card";

/** Card "Por que esse score?" — 3 pontos vindos da interpretação IA. */
export function WhyCard({ points }: { points: string[] }) {
  return (
    <Card title="Por que esse score?">
      <ol className="space-y-3">
        {points.map((point, index) => (
          <li key={index} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-zinc-300">{point}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
