"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LanguageCode } from "@/domain";
import { LANGUAGES } from "@/lib/constants";
import {
  createRadarCategory,
  listRadarCategories,
  setRadarCategoryActive,
  updateRadarCategory,
} from "@/lib/repository";

/** Slug a partir do nome: minúsculo, sem acentos, kebab-case. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function readSeeds(formData: FormData): {
  seeds: Partial<Record<LanguageCode, string>>;
  error: string | null;
} {
  const seeds: Partial<Record<LanguageCode, string>> = {};
  for (const { code } of LANGUAGES) {
    const raw = String(formData.get(`seed_${code}`) ?? "").trim();
    if (!raw) continue;
    const terms = raw.split("|").map((t) => t.trim()).filter(Boolean);
    if (terms.length < 2 || terms.length > 4) {
      return {
        seeds,
        error: `Semente de ${code} precisa de 2 a 4 termos separados por "|".`,
      };
    }
    seeds[code] = terms.join("|");
  }
  if (Object.keys(seeds).length === 0) {
    return { seeds, error: "Preencha a semente de pelo menos um idioma." };
  }
  return { seeds, error: null };
}

function fail(message: string): never {
  redirect(`/categorias?erro=${encodeURIComponent(message)}`);
}

export async function saveCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rpmTier = String(formData.get("rpmTier") ?? "medium");
  if (name.length < 3) fail("Nome da categoria precisa de 3+ caracteres.");
  if (!["high", "medium", "low"].includes(rpmTier)) fail("Tier inválido.");

  const { seeds, error } = readSeeds(formData);
  if (error) fail(error);

  if (id) {
    await updateRadarCategory(id, { name, rpmTier, seeds });
  } else {
    const existing = await listRadarCategories();
    let slug = slugify(name);
    if (!slug) fail("Nome inválido para gerar identificador.");
    if (existing.some((c) => c.slug === slug)) slug = `${slug}-2`;
    await createRadarCategory({ slug, name, rpmTier, seeds });
  }
  revalidatePath("/categorias");
  redirect("/categorias?ok=1");
}

export async function toggleCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  if (id) await setRadarCategoryActive(id, active);
  revalidatePath("/categorias");
  redirect("/categorias");
}
