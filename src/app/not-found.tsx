import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-xl font-bold text-zinc-100">
        Análise não encontrada
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Este link não corresponde a nenhuma análise no histórico local.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
      >
        Fazer uma nova análise
      </Link>
    </main>
  );
}
