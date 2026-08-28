import type { SuggestedTitle } from "@/domain";
import { Card } from "../card";

/** Card "Títulos sugeridos" — 3 títulos com o porquê de cada um. */
export function TitlesCard({ titles }: { titles: SuggestedTitle[] }) {
  return (
    <Card title="Títulos sugeridos">
      <ul className="space-y-4">
        {titles.map((suggestion) => (
          <li key={suggestion.title}>
            <p className="text-sm font-semibold leading-snug text-zinc-200">
              “{suggestion.title}”
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {suggestion.whyItWorks}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
