import { describe, expect, it } from "vitest";
import { matchesFormat, parseIsoDuration } from "./video-filters";

/**
 * `parseIsoDuration` é pré-requisito do motor V2: uma duração
 * ilegível devolve 0, o vídeo falha no gate de validade e sai da
 * amostra silenciosamente. Um erro aqui reduz o denominador de
 * todas as métricas sem deixar rastro.
 */
describe("parseIsoDuration", () => {
  it.each([
    ["PT15M30S", 930, "vídeo típico"],
    ["PT4M", 240, "exatamente no piso long-form"],
    ["PT3M59S", 239, "logo abaixo do piso"],
    ["PT1H2M30S", 3750, "uma hora e pouco"],
    ["PT45S", 45, "short"],
    ["P1DT2H30M", 95_400, "acima de 24h, com componente de tempo"],
    ["P1DT0H0M0S", 86_400, "24h na forma completa"],
    ["P1D", 86_400, "24h na forma compacta, SEM o separador T"],
    ["P2DT3H", 183_600, "dois dias e três horas"],
  ])("%s → %i segundos (%s)", (iso, expected) => {
    expect(parseIsoDuration(iso as string)).toBe(expected);
  });

  it.each([
    ["PT0S", "duração zero"],
    ["PT", "degenerado"],
    ["", "vazio"],
    ["lixo", "não é ISO-8601"],
    ["15M30S", "sem o prefixo P"],
  ])("%s → 0 (%s)", (iso) => {
    expect(parseIsoDuration(iso as string)).toBe(0);
  });

  it("trata duração ausente como 0, não como NaN", () => {
    expect(parseIsoDuration(undefined)).toBe(0);
  });
});

describe("matchesFormat", () => {
  it("aceita long-form acima de 24h (depende do parser de dias)", () => {
    expect(
      matchesFormat("longform", parseIsoDuration("P1DT2H30M"), "Live completa")
    ).toBe(true);
  });

  it("recusa long-form abaixo de 4 minutos", () => {
    expect(matchesFormat("longform", parseIsoDuration("PT3M"), "Curto")).toBe(
      false
    );
  });

  it("recusa long-form marcado como #shorts no título", () => {
    expect(
      matchesFormat("longform", parseIsoDuration("PT15M"), "Legal #shorts")
    ).toBe(false);
  });
});
