import type { Metadata } from "next";
import Link from "next/link";
import type { LanguageCode } from "@/domain";
import {
  APP_DISCLAIMER,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  LANGUAGE_LABELS,
  LANGUAGES,
  QUERY_MAX_LENGTH,
  QUERY_MIN_LENGTH,
  RADAR_PAIRS,
  WINDOW_DEFAULT_TARGETS,
  WINDOW_ESTIMATED_UNITS_PER_LANGUAGE,
  WINDOW_QUOTA_WARN_THRESHOLD,
} from "@/lib/constants";
import { formatCompact, formatDateTime } from "@/lib/format";
import { WINDOW_VERDICT_META } from "@/lib/verdict";
import { getYouTubeQuotaStatus, runWindowCheck } from "@/services/window";

export const metadata: Metadata = { title: "Verificador de Janela" };

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WindowPage(props: PageProps<"/window">) {
  const searchParams = await props.searchParams;
  const rawQuery = first(searchParams.q)?.trim() ?? "";
  const from = LANGUAGES.some((l) => l.code === first(searchParams.from))
    ? (first(searchParams.from) as LanguageCode)
    : "pt-BR";
  const allTargets = first(searchParams.targets) === "all";
  const confirmed = first(searchParams.confirm) === "1";

  const targets = allTargets
    ? RADAR_PAIRS.map((p) => ({ language: p.language, country: p.country }))
    : [...WINDOW_DEFAULT_TARGETS];

  if (rawQuery.length < QUERY_MIN_LENGTH || rawQuery.length > QUERY_MAX_LENGTH) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-6 text-sm text-zinc-400">
          Informe um tema válido para verificar (use o botão 🌍 numa análise
          ou num item do Radar).
        </div>
      </main>
    );
  }

  const quota = await getYouTubeQuotaStatus();
  const estimated = targets.length * WINDOW_ESTIMATED_UNITS_PER_LANGUAGE;
  const selfHref = (extra: string) =>
    `/window?q=${encodeURIComponent(rawQuery)}&from=${from}${allTargets ? "&targets=all" : ""}${extra}`;

  // Quota baixa: avisa o custo estimado antes de rodar.
  if (quota.remaining < WINDOW_QUOTA_WARN_THRESHOLD && !confirmed) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-6 text-sm text-amber-200">
          <p className="font-semibold">Quota do dia baixa</p>
          <p className="mt-1.5 text-amber-200/80">
            Restam ~{formatCompact(quota.remaining)} unidades hoje (de{" "}
            {formatCompact(quota.limit)}). Esta verificação de{" "}
            {targets.length} idiomas custa até ~{estimated} unidades (0 para
            idiomas já em cache de 24h).
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href={selfHref("&confirm=1")}
              className="rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-100 ring-1 ring-amber-500/40 transition hover:bg-amber-500/30"
            >
              Continuar (~{estimated}u)
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500"
            >
              Voltar
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const report = await runWindowCheck({
    query: rawQuery,
    sourceLanguage: from,
    targets,
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          🌍 Verificador de Janela entre Idiomas
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          {report.query}
        </h1>
        <p className="mt-1.5 text-xs text-zinc-500">
          Validado em {LANGUAGE_LABELS[report.sourceLanguage]} — caçando
          janela nos outros mercados. Vereditos calculados pelo motor.
        </p>
      </header>

      {!allTargets ? (
        <p className="mb-6 text-xs text-zinc-500">
          Verificando os 3 mercados padrão ·{" "}
          <Link
            href={`/window?q=${encodeURIComponent(rawQuery)}&from=${from}&targets=all`}
            className="text-zinc-300 underline-offset-2 hover:underline"
          >
            verificar os 7 mercados
          </Link>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {report.checks.map((check) => {
          const meta = WINDOW_VERDICT_META[check.verdict];
          return (
            <div
              key={`${check.language}-${check.country}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-200">
                  {COUNTRY_FLAGS[check.country]} {COUNTRY_LABELS[check.country]}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                {meta.description}
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Long-form recentes (90d)</dt>
                  <dd className="tabular-nums text-zinc-300">
                    {check.recentLongFormCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Canais fortes na amostra</dt>
                  <dd className="tabular-nums text-zinc-300">
                    {Math.round(check.strongChannelShare * 100)}%
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Outliers ativos (30d)</dt>
                  <dd className="tabular-nums text-zinc-300">
                    {check.activeOutliers}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">VPH médio do topo</dt>
                  <dd className="tabular-nums text-zinc-300">
                    {formatCompact(check.avgTopVph)}/h
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-zinc-800/60 pt-2 text-[11px] text-zinc-600">
                busca: “{check.translatedQuery}” ·{" "}
                {check.fromCache
                  ? "cache (0u)"
                  : `${check.quotaUnits}u`}
              </p>
            </div>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Leitura do quadro
          <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium lowercase text-zinc-500 ring-1 ring-zinc-700/60">
            {report.interpretation.generatedBy === "ai" ? "ia" : "template"}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-zinc-300">
          {report.interpretation.enterFirst}
        </p>
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Adaptação cultural por mercado
          </p>
          <ul className="space-y-1.5">
            {report.interpretation.culturalNotes.map((note) => (
              <li key={note.language} className="text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-300">
                  {LANGUAGE_LABELS[note.language]}:
                </span>{" "}
                {note.note}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Validar antes de produzir
          </p>
          <ul className="list-disc space-y-1 pl-4">
            {report.interpretation.validateBefore.map((item) => (
              <li key={item} className="text-xs leading-relaxed text-zinc-400">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Verificação de {formatDateTime(report.checkedAt)} ·{" "}
        {report.totalQuotaUnits > 0
          ? `${report.totalQuotaUnits} unidades de quota`
          : "servida do cache (0 unidades)"}{" "}
        · cache de 24h por tema+idioma · conta no orçamento das análises
        (não no teto do Radar)
      </p>

      <footer className="mt-12 text-center text-xs text-zinc-600">
        {APP_DISCLAIMER}
      </footer>
    </main>
  );
}
