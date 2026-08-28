import type { MetricSourceMap, Scores } from "@/domain";

/** Chaves das 4 métricas exibidas na tela de resultado. */
export type MetricKey = keyof Pick<
  Scores,
  "demand" | "competition" | "saturation" | "trend"
>;

export interface MetricMeta {
  key: MetricKey;
  label: string;
  hint: string;
  /** true quando valor ALTO é desfavorável (concorrência, saturação). */
  invert: boolean;
}

/**
 * Rótulos, hints e direção semântica das métricas da UI — no mesmo
 * espírito de VERDICT_META/POTENTIAL_META em src/lib/verdict.ts.
 * O "50" do hint de tendência descreve o invariante do contrato
 * (trendMomentum: 50 = estável — ver src/services/contracts/types.ts).
 */
export const METRIC_META: readonly MetricMeta[] = [
  {
    key: "demand",
    label: "Demanda",
    hint: "Interesse do público pelo tema",
    invert: false,
  },
  {
    key: "competition",
    label: "Concorrência",
    hint: "Força dos canais já estabelecidos",
    invert: true,
  },
  {
    key: "saturation",
    label: "Saturação",
    hint: "Quanto o tema já foi repetido",
    invert: true,
  },
  {
    key: "trend",
    label: "Tendência",
    hint: "Acima de 50 = interesse em alta",
    invert: false,
  },
];

/** A partir deste valor favorável a barra fica verde. */
export const METRIC_GOOD_THRESHOLD = 60;
/** A partir deste valor favorável a barra fica âmbar (abaixo: vermelha). */
export const METRIC_WARN_THRESHOLD = 35;

/** A análise usou dados reais do YouTube? (decide a copy do rodapé) */
export function usesRealVideoData(sources: MetricSourceMap | undefined): boolean {
  return sources?.demand === "real";
}

/**
 * Classe de cor da barra de uma métrica 0–100.
 * `invert` marca métricas onde valor alto é ruim — a favorabilidade
 * é o espelho do valor, mesma semântica de formulas.ts (100 - x).
 */
export function metricBarColorClass(value: number, invert: boolean): string {
  const favorable = invert ? 100 - value : value;
  if (favorable >= METRIC_GOOD_THRESHOLD) return "bg-emerald-500";
  if (favorable >= METRIC_WARN_THRESHOLD) return "bg-amber-500";
  return "bg-red-500";
}
