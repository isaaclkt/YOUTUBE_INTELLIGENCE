import type { OpportunityPotential, Verdict, WindowVerdict } from "@/domain";

/** Mapeamento de apresentação do veredito (label + cores do tema escuro). */
export const VERDICT_META: Record<
  Verdict,
  {
    label: string;
    description: string;
    badgeClass: string;
    barClass: string;
    textClass: string;
    glowClass: string;
  }
> = {
  YES: {
    label: "SIM",
    description: "Os sinais indicam espaço real para novos vídeos neste tema.",
    badgeClass: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-400",
    glowClass: "shadow-emerald-500/20",
  },
  MAYBE: {
    label: "TALVEZ",
    description:
      "Há oportunidade, mas com ressalvas — o ângulo escolhido fará diferença.",
    badgeClass: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    barClass: "bg-amber-500",
    textClass: "text-amber-400",
    glowClass: "shadow-amber-500/20",
  },
  NO: {
    label: "NÃO",
    description:
      "Os sinais atuais são desfavoráveis — considere outro tema ou recorte.",
    badgeClass: "bg-red-500/15 text-red-400 ring-red-500/30",
    barClass: "bg-red-500",
    textClass: "text-red-400",
    glowClass: "shadow-red-500/20",
  },
  INSUFFICIENT_DATA: {
    label: "DADOS INSUFICIENTES",
    description:
      "Não há evidência suficiente para recomendar nem desaconselhar este tema.",
    badgeClass: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
    barClass: "bg-zinc-600",
    textClass: "text-zinc-300",
    glowClass: "shadow-zinc-500/10",
  },
};

/** Apresentação da qualidade da evidência (substitui a confiança em %). */
export const EVIDENCE_META: Record<
  "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT",
  { label: string; badgeClass: string }
> = {
  HIGH: {
    label: "Evidência alta",
    badgeClass: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  },
  MEDIUM: {
    label: "Evidência média",
    badgeClass: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  },
  LOW: {
    label: "Evidência baixa",
    badgeClass: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
  },
  INSUFFICIENT: {
    label: "Evidência insuficiente",
    badgeClass: "bg-zinc-500/15 text-zinc-400 ring-zinc-600/40",
  },
};

/** Rótulo da origem de cada métrica — o usuário precisa distinguir. */
export const METRIC_KIND_META: Record<
  "real" | "derived" | "proxy",
  { label: string; title: string; badgeClass: string }
> = {
  real: {
    label: "real",
    title: "Contagem direta da YouTube Data API.",
    badgeClass: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
  },
  derived: {
    label: "derivado",
    title: "Calculado a partir de contagens diretas da API.",
    badgeClass: "bg-sky-500/10 text-sky-400 ring-sky-500/25",
  },
  proxy: {
    label: "proxy",
    title:
      "Mede um conceito vizinho ao nome: a API não expõe procura do público, então o alcance observado é usado como aproximação.",
    badgeClass: "bg-violet-500/10 text-violet-300 ring-violet-500/25",
  },
};

/** Apresentação dos vereditos do Verificador de Janela. */
export const WINDOW_VERDICT_META: Record<
  WindowVerdict,
  { label: string; badgeClass: string; description: string }
> = {
  OPEN: {
    label: "JANELA ABERTA",
    badgeClass: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    description: "Pouco long-form recente ou outliers ativos sem domínio de canais fortes.",
  },
  CONTESTED: {
    label: "DISPUTADO",
    badgeClass: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    description: "Mercado ativo — dá para entrar, mas o ângulo decide.",
  },
  SATURATED: {
    label: "SATURADO",
    badgeClass: "bg-red-500/15 text-red-400 ring-red-500/30",
    description: "Canais fortes dominam e quase nada novo fura a bolha.",
  },
};

/** Mapeamento de apresentação do potencial de um ângulo. */
export const POTENTIAL_META: Record<
  OpportunityPotential,
  { label: string; badgeClass: string }
> = {
  HIGH: {
    label: "Potencial alto",
    badgeClass: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  },
  MEDIUM: {
    label: "Potencial médio",
    badgeClass: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  },
  LOW: {
    label: "Potencial baixo",
    badgeClass: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
  },
};
