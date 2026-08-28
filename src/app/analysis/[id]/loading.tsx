import { Skeleton } from "@/components/skeleton";

/** Skeleton exibido enquanto a análise é carregada/renderizada. */
export default function AnalysisLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <Skeleton className="mb-6 h-4 w-28" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="mb-6 h-3 w-48" />

      <div className="space-y-6">
        {/* veredito */}
        <Skeleton className="h-44 w-full rounded-2xl" />

        {/* métricas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>

        {/* por quê + mercados */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>

        {/* ângulos + títulos */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>

        {/* recomendação */}
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </main>
  );
}
