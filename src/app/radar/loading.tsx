import { Skeleton } from "@/components/skeleton";

/** Skeleton exibido enquanto a varredura roda (fresca: alguns segundos). */
export default function RadarLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <Skeleton className="mb-6 h-4 w-32" />
      <Skeleton className="mb-2 h-8 w-32" />
      <Skeleton className="mb-8 h-3 w-72" />

      {/* filtros */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-7 w-full max-w-xl" />
        <Skeleton className="h-7 w-64" />
      </div>

      {/* vídeos estourando */}
      <Skeleton className="mb-6 h-96 w-full rounded-2xl" />

      {/* canais + nichos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </main>
  );
}
