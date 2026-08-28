import type { CountryCode } from "./topic";

/** Um mercado (país) ranqueado para o tema analisado. */
export interface Market {
  country: CountryCode;
  countryName: string;
  /** Atratividade do mercado para este tema, 0–100. */
  score: number;
  /** Por que este mercado é (ou não é) atraente. */
  reason: string;
}
