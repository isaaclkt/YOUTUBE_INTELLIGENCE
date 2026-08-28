import type { OpportunityPotential, Verdict } from "@/domain";

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
