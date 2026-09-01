import { Skeleton } from "@/components/skeleton";

/** Skeleton do Verificador de Janela (verificação fresca: ~10–30s). */
export default function WindowLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <Skeleton className="mb-6 h-4 w-40" />
      <Skeleton className="mb-2 h-4 w-64" />
      <Skeleton className="mb-8 h-8 w-2/3" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </main>
  );
}
