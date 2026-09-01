import type { CountryCode, LanguageCode, WindowReport } from "@/domain";

export interface WindowTarget {
  language: LanguageCode;
  country: CountryCode;
}

export interface WindowCheckInput {
  /** Tema no idioma de origem. */
  query: string;
  sourceLanguage: LanguageCode;
  /** Mercados a verificar, na ordem de exibição. */
  targets: WindowTarget[];
}

/**
 * Verificador de Janela entre Idiomas: mini-análise do tema em cada
 * mercado-alvo. Vereditos vêm do motor (services/window-verdict.ts);
 * a IA traduz a consulta e interpreta o quadro, nunca decide números.
 * Real: YouTube Data API (cache 24h por tema+idioma) + Anthropic.
 */
export interface WindowChecker {
  check(input: WindowCheckInput): Promise<WindowReport>;
}
