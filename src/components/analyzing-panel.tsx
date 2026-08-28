import { Skeleton } from "./skeleton";

/** Painel skeleton exibido enquanto uma análise está em andamento. */
export function AnalyzingPanel({ query }: { query: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-300">
        Analisando <span className="font-semibold">“{query}”</span>…
      </p>
      <p className="text-xs text-zinc-500">
        coleta → métricas → scoring → oportunidades → interpretação IA
      </p>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
