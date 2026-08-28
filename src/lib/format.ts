/**
 * Formata um percentual 0–100 para exibição, com defesa contra dados
 * malformados (ex.: JSON antigo/externo sem o campo): nunca renderiza
 * "undefined%" — se o valor não for um número finito, mostra "—".
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`;
}

/** Formata uma data ISO para exibição (pt-BR). Usado só em Server Components. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}
