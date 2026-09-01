import type { SuggestedTitle, TitleFormula } from "@/domain";
import { Card } from "../card";

/**
 * Card "Títulos sugeridos" — 3 títulos com o porquê de cada um, mais a
 * seção "Fórmulas de título deste nicho" (padrões extraídos pela IA
 * dos outliers long-form). `placeholder` marca sugestões de template.
 */
export function TitlesCard({
  titles,
  formulas = [],
  placeholder = false,
}: {
  titles: SuggestedTitle[];
  formulas?: TitleFormula[];
  placeholder?: boolean;
}) {
  return (
    <Card title="Títulos sugeridos">
      <ul className="space-y-4">
        {titles.map((suggestion) => (
          <li key={suggestion.title}>
            <p className="text-sm font-semibold leading-snug text-zinc-200">
              “{suggestion.title}”
              {suggestion.formulaName ? (
                <span className="ml-2 inline-flex rounded-full bg-violet-500/15 px-1.5 py-0.5 align-middle text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/30">
                  {suggestion.formulaName}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {suggestion.whyItWorks}
            </p>
          </li>
        ))}
      </ul>

      {formulas.length > 0 ? (
        <div className="mt-5 border-t border-zinc-800/60 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Fórmulas de título deste nicho
          </p>
          <ul className="space-y-4">
            {formulas.map((formula) => (
              <li key={formula.name}>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                  {formula.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-300">{formula.pattern}</p>
                <p className="mt-1 text-xs italic text-zinc-500">
                  ex. real: “{formula.realExample}”
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {formula.whyItWorks}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
