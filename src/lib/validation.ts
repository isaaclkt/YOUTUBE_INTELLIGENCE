import type { CountryCode, LanguageCode, Topic } from "@/domain";
import {
  COUNTRIES,
  ERROR_INVALID_BODY,
  LANGUAGES,
  QUERY_MAX_LENGTH,
  QUERY_MIN_LENGTH,
} from "./constants";

export type ParseResult =
  | { ok: true; topic: Topic }
  | { ok: false; error: string };

function isLanguage(value: unknown): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value);
}

function isCountry(value: unknown): value is CountryCode {
  return COUNTRIES.some((c) => c.code === value);
}

/** Valida o corpo do POST /api/analyses sem depender de libs externas. */
export function parseAnalyzeRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: ERROR_INVALID_BODY };
  }
  const { query, language, country } = body as Record<string, unknown>;

  if (typeof query !== "string" || query.trim().length < QUERY_MIN_LENGTH) {
    return {
      ok: false,
      error: `Digite um tema com pelo menos ${QUERY_MIN_LENGTH} caracteres.`,
    };
  }
  if (query.trim().length > QUERY_MAX_LENGTH) {
    return {
      ok: false,
      error: `O tema pode ter no máximo ${QUERY_MAX_LENGTH} caracteres.`,
    };
  }
  if (!isLanguage(language)) {
    return { ok: false, error: "Idioma não suportado." };
  }
  if (!isCountry(country)) {
    return { ok: false, error: "País não suportado." };
  }

  return {
    ok: true,
    topic: { query: query.trim(), language, country },
  };
}
