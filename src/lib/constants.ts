import type { CountryCode, LanguageCode } from "@/domain";

export const APP_NAME = "YouTube Intelligence AI";
export const APP_TAGLINE = "Vale a pena criar conteúdo sobre esse tema?";
/** Variante da tagline usada no card de veredito (refere-se ao tema analisado). */
export const VERDICT_QUESTION = "Vale a pena criar conteúdo sobre isso?";
export const APP_DISCLAIMER = "A decisão final é sempre sua.";

/** Rota da API de análises — único caminho conhecido pela UI (via api-client). */
export const API_ANALYSES_PATH = "/api/analyses";

/** Mensagem compartilhada entre a rota da API e a validação. */
export const ERROR_INVALID_BODY = "Corpo da requisição inválido.";

export const LANGUAGES: ReadonlyArray<{ code: LanguageCode; label: string }> = [
  { code: "pt-BR", label: "Português (BR)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

export const COUNTRIES: ReadonlyArray<{
  code: CountryCode;
  label: string;
  flag: string;
}> = [
  { code: "BR", label: "Brasil", flag: "🇧🇷" },
  { code: "US", label: "EUA", flag: "🇺🇸" },
  { code: "MX", label: "México", flag: "🇲🇽" },
  { code: "ES", label: "Espanha", flag: "🇪🇸" },
  { code: "IT", label: "Itália", flag: "🇮🇹" },
  { code: "FR", label: "França", flag: "🇫🇷" },
  { code: "DE", label: "Alemanha", flag: "🇩🇪" },
];

export const COUNTRY_LABELS: Record<CountryCode, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.label])
) as Record<CountryCode, string>;

export const COUNTRY_FLAGS: Record<CountryCode, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.flag])
) as Record<CountryCode, string>;

export const LANGUAGE_LABELS: Record<LanguageCode, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.label])
) as Record<LanguageCode, string>;

/** Chips de exemplo na Home. */
export const EXAMPLE_TOPICS: readonly string[] = [
  "finanças pessoais para iniciantes",
  "receitas na air fryer",
  "inteligência artificial para pequenos negócios",
];

export const QUERY_MIN_LENGTH = 3;
export const QUERY_MAX_LENGTH = 120;

/** Defaults do formulário de análise. */
export const DEFAULT_LANGUAGE: LanguageCode = "pt-BR";
export const DEFAULT_COUNTRY: CountryCode = "BR";

/** Quantas análises aparecem no histórico da Home. */
export const HISTORY_LIMIT = 8;
