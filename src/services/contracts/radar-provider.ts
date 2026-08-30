import type {
  CountryCode,
  LanguageCode,
  RadarSweep,
  RadarWindow,
} from "@/domain";

export interface RadarSweepInput {
  language: LanguageCode;
  country: CountryCode;
  window: RadarWindow;
}

/**
 * Lançado quando uma varredura NOVA estouraria o orçamento diário de
 * quota do Radar. Nunca vira fallback mock — dados demonstrativos no
 * lugar de "quota esgotada" enganariam o usuário.
 */
export class RadarBudgetExceededError extends Error {
  constructor(
    public readonly spentToday: number,
    public readonly budget: number
  ) {
    super(
      `Orçamento diário de quota do Radar atingido (${spentToday}/${budget} unidades).`
    );
    this.name = "RadarBudgetExceededError";
  }
}

/**
 * O RADAR: varredura do que está bombando agora, sem tema informado.
 * Real: YouTube Data API v3 (8 consultas-semente por categoria de
 * nicho, cache de 12h por idioma+país+janela, teto diário de quota).
 * Mock: dados demonstrativos determinísticos.
 */
export interface RadarProvider {
  sweep(input: RadarSweepInput): Promise<RadarSweep>;
}
