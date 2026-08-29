/**
 * Formata um percentual 0–100 para exibição, com defesa contra dados
 * malformados (ex.: JSON antigo/externo sem o campo): nunca renderiza
 * "undefined%" — se o valor não for um número finito, mostra "—".
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`;
}

const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1234567 → "1,2 mi". "—" para valores inválidos. */
export function formatCompact(value: number): string {
  return Number.isFinite(value) ? compactFormatter.format(value) : "—";
}

/** Idade de um vídeo em unidade curta: "18 h", "12 d", "5 m", "2 a". */
export function formatVideoAge(publishedAtIso: string): string {
  const ms = Date.now() - new Date(publishedAtIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const hours = ms / 3_600_000;
  if (hours < 48) return `${Math.max(1, Math.round(hours))} h`;
  const days = hours / 24;
  if (days < 60) return `${Math.round(days)} d`;
  const months = days / 30.44;
  if (months < 18) return `${Math.round(months)} m`;
  return `${Math.round(days / 365.25)} a`;
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
