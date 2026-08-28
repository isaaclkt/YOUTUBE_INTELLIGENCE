import { EXAMPLE_TOPICS } from "@/lib/constants";

/** Chips de temas de exemplo. Apresentacional — a ação vem de fora. */
export function ExampleChips({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (topic: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">Experimente:</span>
      {EXAMPLE_TOPICS.map((example) => (
        <button
          key={example}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(example)}
          className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
