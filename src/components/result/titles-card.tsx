import type { SuggestedTitle } from "@/domain";
import { Card } from "../card";

/**
 * Card "Títulos sugeridos" — 3 títulos com o porquê de cada um.
 * `placeholder` marca sugestões vindas de template (IA inativa).
 */
export function TitlesCard({
  titles,
  placeholder = false,
}: {
  titles: SuggestedTitle[];
  placeholder?: boolean;
}) {
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
      {placeholder ? (
        <p className="mt-4 border-t border-zinc-800/60 pt-3 text-xs text-zinc-600">
          ⚠︎ Sugestões de template (placeholder). Com a IA ativa
          (ANTHROPIC_API_KEY), os títulos seguem os padrões reais dos
          outliers do nicho.
        </p>
      ) : null}
    </Card>
  );
}
