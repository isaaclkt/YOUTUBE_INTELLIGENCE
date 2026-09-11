import type { CountryCode, LanguageCode, RadarWindow } from "@/domain";

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

// ===================== Radar =====================

/** Pares idioma+país varridos pelo Radar. */
export const RADAR_PAIRS: ReadonlyArray<{
  language: LanguageCode;
  country: CountryCode;
  label: string;
  flag: string;
}> = [
  { language: "pt-BR", country: "BR", label: "PT · Brasil", flag: "🇧🇷" },
  { language: "en", country: "US", label: "EN · EUA", flag: "🇺🇸" },
  { language: "es", country: "MX", label: "ES · México", flag: "🇲🇽" },
  { language: "es", country: "ES", label: "ES · Espanha", flag: "🇪🇸" },
  { language: "it", country: "IT", label: "IT · Itália", flag: "🇮🇹" },
  { language: "fr", country: "FR", label: "FR · França", flag: "🇫🇷" },
  { language: "de", country: "DE", label: "DE · Alemanha", flag: "🇩🇪" },
];

/** Janelas de publicação do Radar. */
export const RADAR_WINDOWS: ReadonlyArray<{
  key: RadarWindow;
  label: string;
  hours: number;
}> = [
  { key: "24h", label: "Últimas 24h", hours: 24 },
  { key: "7d", label: "7 dias", hours: 168 },
  { key: "30d", label: "30 dias", hours: 720 },
];

export const RADAR_DEFAULT_WINDOW: RadarWindow = "7d";

// ============ Verificador de Janela entre Idiomas ============

/** Mercados verificados por padrão (demais via "verificar todos"). */
export const WINDOW_DEFAULT_TARGETS: ReadonlyArray<{
  language: LanguageCode;
  country: CountryCode;
}> = [
  { language: "pt-BR", country: "BR" },
  { language: "en", country: "US" },
  { language: "es", country: "MX" },
];

/** Custo estimado por idioma verificado (1 search + videos + channels). */
export const WINDOW_ESTIMATED_UNITS_PER_LANGUAGE = 105;

/** Abaixo deste saldo diário, a página avisa o custo antes de rodar. */
export const WINDOW_QUOTA_WARN_THRESHOLD = 2_000;

// Rótulos e tiers das categorias agora vivem no SQLite (tela ⚙️
// Categorias) — ver src/lib/repository.ts e default-radar-categories.ts.

/** Custo de busca por semente do Radar (search.list da API). */
export const RADAR_UNITS_PER_SEED_SEARCH = 100;
