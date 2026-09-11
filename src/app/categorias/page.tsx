import type { Metadata } from "next";
import type { RadarCategoryConfig } from "@/domain";
import { LANGUAGES, RADAR_UNITS_PER_SEED_SEARCH } from "@/lib/constants";
import { listRadarCategories } from "@/lib/repository";
import { RPM_TIER_LABELS } from "@/lib/rpm";
import { RADAR_DAILY_QUOTA_BUDGET } from "@/services/real/radar/radar-youtube-provider";
import { saveCategoryAction, toggleCategoryAction } from "./actions";

export const metadata: Metadata = { title: "Categorias do Radar" };

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-zinc-600";

function CategoryFields({ category }: { category?: RadarCategoryConfig }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">
            Nome
          </span>
          <input
            type="text"
            name="name"
            required
            minLength={3}
            defaultValue={category?.name ?? ""}
            placeholder="ex.: Tecnologia & educação"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">
            Tier de RPM
          </span>
          <select
            name="rpmTier"
            defaultValue={category?.rpmTier ?? "medium"}
            className={inputClass}
          >
            <option value="high">{RPM_TIER_LABELS.high}</option>
            <option value="medium">{RPM_TIER_LABELS.medium}</option>
            <option value="low">{RPM_TIER_LABELS.low}</option>
          </select>
        </label>
      </div>
      <p className="text-[11px] text-zinc-600">
        Sementes por idioma: 2–4 termos no fraseado dark, separados por
        &quot;|&quot;. Idioma vazio = não varrido por esta categoria.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LANGUAGES.map((lang) => (
          <label key={lang.code} className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">
              {lang.label}
            </span>
            <input
              type="text"
              name={`seed_${lang.code}`}
              defaultValue={category?.seeds[lang.code] ?? ""}
              placeholder="termo um|termo dois|termo três"
              className={inputClass}
            />
          </label>
        ))}
      </div>
      {category ? (
        <input type="hidden" name="id" value={category.id} />
      ) : null}
      <button
        type="submit"
        className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
      >
        {category ? "Salvar alterações" : "Adicionar categoria"}
      </button>
    </div>
  );
}

export default async function CategoriasPage(
  props: PageProps<"/categorias">
) {
  const searchParams = await props.searchParams;
  const erro = Array.isArray(searchParams.erro)
    ? searchParams.erro[0]
    : searchParams.erro;
  const ok = searchParams.ok === "1";

  const categories = await listRadarCategories();
  const active = categories.filter((c) => c.active);

  // Custo estimado por varredura NOVA conforme categorias ativas:
  // long-form = 2 buscas por semente; shorts = 1.
  const longformCost = active.length * 2 * RADAR_UNITS_PER_SEED_SEARCH + 50;
  const shortsCost = active.length * RADAR_UNITS_PER_SEED_SEARCH + 20;
  const overBudget = longformCost > RADAR_DAILY_QUOTA_BUDGET;
  const freshPerDay = Math.floor(RADAR_DAILY_QUOTA_BUDGET / longformCost);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          ⚙️ Categorias do Radar
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          As varreduras usam apenas as categorias ativas. Editar ou
          ativar/desativar invalida o cache da varredura automaticamente.
        </p>
      </header>

      {erro ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Categoria salva.
        </div>
      ) : null}

      {/* Custo estimado */}
      <section
        className={`mb-8 rounded-2xl border px-5 py-4 text-sm ${
          overBudget
            ? "border-red-500/40 bg-red-500/10 text-red-200"
            : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
        }`}
      >
        <p className="font-semibold">
          {active.length} categorias ativas → varredura long-form nova ≈{" "}
          {longformCost}u · Shorts ≈ {shortsCost}u
        </p>
        <p className="mt-1 text-xs opacity-80">
          {overBudget
            ? `⚠️ Uma única varredura long-form passaria do teto diário do Radar (${RADAR_DAILY_QUOTA_BUDGET}u) — desative categorias.`
            : `Cabem ~${freshPerDay} varreduras long-form novas por dia dentro do teto de ${RADAR_DAILY_QUOTA_BUDGET}u (repetir em 12h custa 0). Cada semente ativa custa ${RADAR_UNITS_PER_SEED_SEARCH}u por busca.`}
        </p>
      </section>

      {/* Lista de categorias */}
      <section className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`rounded-2xl border p-4 ${
              category.active
                ? "border-zinc-800 bg-zinc-900/60"
                : "border-zinc-800/50 bg-zinc-950/40 opacity-70"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-200">
                  {category.name}
                </p>
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 ring-1 ring-zinc-700/60">
                  {RPM_TIER_LABELS[category.rpmTier]}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                    category.active
                      ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                      : "bg-zinc-500/15 text-zinc-500 ring-zinc-600/40"
                  }`}
                >
                  {category.active ? "ativa" : "inativa"}
                </span>
              </div>
              <form action={toggleCategoryAction}>
                <input type="hidden" name="id" value={category.id} />
                <input
                  type="hidden"
                  name="active"
                  value={category.active ? "0" : "1"}
                />
                <button
                  type="submit"
                  className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500"
                >
                  {category.active ? "Desativar" : "Ativar"}
                </button>
              </form>
            </div>
            <p className="mt-2 truncate text-xs text-zinc-500">
              pt-BR: {category.seeds["pt-BR"] ?? "—"}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-200">
                ✏️ Editar
              </summary>
              <form action={saveCategoryAction} className="mt-3">
                <CategoryFields category={category} />
              </form>
            </details>
          </div>
        ))}
      </section>

      {/* Adicionar nova */}
      <section className="mt-8 rounded-2xl border border-dashed border-zinc-700 p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          ➕ Nova categoria
        </h2>
        <form action={saveCategoryAction}>
          <CategoryFields />
        </form>
      </section>
    </main>
  );
}
