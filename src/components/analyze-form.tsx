"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CountryCode, LanguageCode } from "@/domain";
import { createAnalysis } from "@/lib/api-client";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  QUERY_MAX_LENGTH,
  QUERY_MIN_LENGTH,
} from "@/lib/constants";
import { AnalyzingPanel } from "./analyzing-panel";
import { ExampleChips } from "./example-chips";

/**
 * Formulário da Home. Só estado de UI — a chamada de API vive em
 * src/lib/api-client.ts.
 */
export function AnalyzeForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const id = await createAnalysis({ query: query.trim(), language, country });
      // Mantém o estado "analisando" até a tela de resultado assumir.
      router.push(`/analysis/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro inesperado. Tente novamente."
      );
      setPending(false);
    }
  }

  const selectClass =
    "h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition focus:border-zinc-600 disabled:opacity-50";

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={QUERY_MAX_LENGTH}
          placeholder="Digite um nicho, tema ou ideia…"
          disabled={pending}
          className="h-13 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
          aria-label="Tema para analisar"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            disabled={pending}
            className={`${selectClass} flex-1`}
            aria-label="Idioma"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            disabled={pending}
            className={`${selectClass} flex-1`}
            aria-label="País"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || query.trim().length < QUERY_MIN_LENGTH}
            className="h-11 rounded-xl bg-red-600 px-8 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {pending ? "Analisando…" : "Analisar"}
          </button>
        </div>
      </form>

      <ExampleChips disabled={pending} onSelect={setQuery} />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      {pending ? <AnalyzingPanel query={query} /> : null}
    </div>
  );
}
