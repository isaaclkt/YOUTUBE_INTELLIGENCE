import type { Metadata } from "next";
import { AnalyzeForm } from "@/components/analyze-form";
import { APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = { title: "Analisar Tema" };

export const dynamic = "force-dynamic";

export default async function AnalisarPage(props: PageProps<"/analisar">) {
  const searchParams = await props.searchParams;
  const rawQuery = Array.isArray(searchParams.q)
    ? searchParams.q[0]
    : searchParams.q;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          🔎 Analisar Tema
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-400">
          {APP_TAGLINE} Demanda, concorrência, saturação e tendência antes de
          você gravar — sem promessas de viral.
        </p>
      </header>
      <AnalyzeForm initialQuery={rawQuery?.slice(0, 120) ?? ""} />
    </main>
  );
}
