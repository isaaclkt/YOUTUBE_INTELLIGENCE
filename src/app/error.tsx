"use client";

import Link from "next/link";

/** Fronteira de erro global — cobre falhas de renderização/dados. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl">⚠️</p>
      <h1 className="mt-4 text-xl font-bold text-zinc-100">Algo deu errado</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Não conseguimos carregar esta tela. Tente novamente — se persistir,
        volte para a página inicial.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-zinc-600">
          código: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="rounded-xl border border-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600"
        >
          Página inicial
        </Link>
      </div>
    </main>
  );
}
