/** Idiomas suportados na fase 1. */
export type LanguageCode = "pt-BR" | "en" | "es" | "it" | "fr" | "de";

/** Países suportados na fase 1 (ISO 3166-1 alpha-2). */
export type CountryCode = "BR" | "US" | "MX" | "ES" | "IT" | "FR" | "DE";

/** O que o usuário quer analisar: um nicho, tema ou ideia de vídeo. */
export interface Topic {
  query: string;
  language: LanguageCode;
  country: CountryCode;
}
