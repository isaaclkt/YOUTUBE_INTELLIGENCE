import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decide, type DecisionInput } from "./engine";
import { aggregateLongitudinal, computeDelta } from "./longitudinal";
import type { DecisionVideo } from "./metrics";

/**
 * Testes do motor de decisão V2.
 *
 * Fixtures explícitas — nenhum gerador aleatório, nenhuma dependência
 * de relógio, nenhum mock do produto. O motor é puro.
 *
 * Regra vigente: a CONCENTRAÇÃO decide; o alcance do entrante é
 * contextual e nunca bloqueia um veredito.
 */

const DAY = 86_400_000;

function video(
  id: string,
  channelId: string,
  views: number,
  subscribers: number | null
): DecisionVideo {
  return {
    videoId: id,
    channelId,
    views,
    publishedAt: new Date(Date.now() - 30 * DAY).toISOString(),
    subscribers,
  };
}

/** Audiência pulverizada: cada vídeo num canal próprio, views iguais. */
function pulverized(
  count: number,
  views: number,
  subscribers: number | null,
  prefix = "p"
): DecisionVideo[] {
  return Array.from({ length: count }, (_, i) =>
    video(`${prefix}v${i}`, `${prefix}c${i}`, views, subscribers)
  );
}

/**
 * Três canais capturam quase toda a audiência.
 * Cada gigante tem 3 vídeos: canais reais publicam mais de uma vez, e
 * com um único vídeo por gigante a concentração fica tão frágil que o
 * intervalo de reamostragem cobre toda a escala.
 */
function dominated(
  smallCount: number,
  smallViews = 20_000,
  subscribers: number | null = 10_000
) {
  const giants = ["big1", "big2", "big3"].flatMap((ch, gi) =>
    Array.from({ length: 3 }, (_, vi) =>
      video(`g${gi}_${vi}`, ch, 1_500_000, 9_000_000)
    )
  );
  return [...giants, ...pulverized(smallCount, smallViews, subscribers, "s")];
}

function input(overrides: Partial<DecisionInput> = {}): DecisionInput {
  const videos = overrides.videos ?? [];
  return {
    videos,
    rawCount: overrides.rawCount ?? videos.length,
    discardedCount: overrides.discardedCount ?? 0,
    usedFallback: overrides.usedFallback ?? false,
  };
}

describe("1 · concentração baixa", () => {
  it("audiência pulverizada com intervalo estreito produz SIM", () => {
    const r = decide(input({ videos: pulverized(60, 40_000, 10_000) }));
    expect(r.concentration.value).toBeLessThan(50);
    expect(r.concentration.band!.p95).toBeLessThan(50);
    expect(r.verdict).toBe("YES");
    expect(r.quality).toBe("HIGH");
    expect(r.opportunityScore).not.toBeNull();
  });

  it("o score reflete o sinal encolhido por λ", () => {
    const r = decide(input({ videos: pulverized(60, 40_000, 10_000) }));
    const esperado = Math.round(
      50 + (100 - r.concentration.value! - 50) * r.lambda!
    );
    expect(r.opportunityScore).toBe(esperado);
    expect(r.lambda).toBeGreaterThan(0);
    expect(r.lambda).toBeLessThanOrEqual(1);
  });
});

describe("2 · concentração alta", () => {
  it("três canais capturando a audiência produzem NÃO", () => {
    const r = decide(input({ videos: dominated(40) }));
    expect(r.concentration.value).toBeGreaterThanOrEqual(65);
    expect(r.verdict).toBe("NO");
    expect(r.reasons[0]).toContain("três maiores canais");
  });

  it("score baixo acompanha concentração alta", () => {
    const r = decide(input({ videos: dominated(40) }));
    expect(r.opportunityScore).toBeLessThan(40);
  });
});

describe("3 · M1 baixo + C favorável", () => {
  it("M1 fraco NÃO bloqueia o veredito quando a concentração é boa", () => {
    // Todos os entrantes bem abaixo do piso de 5.000 views,
    // mas audiência pulverizada entre 60 canais.
    const r = decide(input({ videos: pulverized(60, 120, 10_000) }));
    expect(r.newcomerContext.sharePercent).toBe(0);
    expect(r.newcomerContext.aboveFloor).toBe(0);
    expect(r.concentration.value).toBeLessThan(50);
    expect(r.verdict).toBe("YES");
    // E o motivo do veredito não menciona o alcance do entrante.
    expect(r.reasons.join(" ")).toContain("Concentração");
    expect(r.reasons.join(" ")).not.toContain("entrante");
  });
});

describe("4 · M1 alto + C desfavorável", () => {
  it("M1 forte NÃO salva um tema concentrado", () => {
    // Todo entrante acima do piso de 5.000 views (M1 = 100%),
    // mas três canais concentram a audiência do tema.
    const r = decide(input({ videos: dominated(40, 20_000) }));
    expect(r.newcomerContext.sharePercent).toBe(100);
    expect(r.concentration.value).toBeGreaterThanOrEqual(65);
    expect(r.verdict).toBe("NO");
  });
});

describe("5 · evidência insuficiente", () => {
  it("menos de 20 vídeos não produz veredito", () => {
    const r = decide(input({ videos: pulverized(12, 50_000, 10_000) }));
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
    expect(r.opportunityScore).toBeNull();
    expect(r.scoreBand).toBeNull();
    expect(r.lambda).toBeNull();
    expect(r.reasons.join(" ")).toContain("mínimo 20");
  });

  it("poucos canais distintos tornam a concentração não interpretável", () => {
    const videos = Array.from({ length: 30 }, (_, i) =>
      video(`v${i}`, `c${i % 3}`, 50_000, 10_000)
    );
    const r = decide(input({ videos }));
    expect(r.concentration.value).toBeNull();
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
  });

  it("descarte excessivo impede o veredito", () => {
    const r = decide(
      input({
        videos: pulverized(60, 40_000, 10_000),
        rawCount: 140,
        discardedCount: 80,
      })
    );
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
    expect(r.reasons.join(" ")).toContain("inconsistência");
  });

  it("evidência BAIXA bloqueia SIM mas permite NÃO", () => {
    // n=22, k=22: acima do mínimo, abaixo dos critérios de Média (25).
    const baixaFavoravel = decide(input({ videos: pulverized(22, 40_000, 10_000) }));
    expect(baixaFavoravel.quality).toBe("LOW");
    expect(baixaFavoravel.verdict).not.toBe("YES");

    // 9 vídeos de gigantes + 12 pequenos = 21 vídeos: acima do mínimo
    // de 20, abaixo do critério de Média (25).
    const baixaDesfavoravel = decide(input({ videos: dominated(12) }));
    expect(baixaDesfavoravel.counters.sampleSize).toBeLessThan(25);
    expect(baixaDesfavoravel.quality).toBe("LOW");
    expect(baixaDesfavoravel.verdict).toBe("NO");
  });
});

describe("6 · limite do p95(C) < 50", () => {
  it("SIM exige o intervalo INTEIRO abaixo do limiar, não só a estimativa", () => {
    // Três canais reúnem ~52% das views: a estimativa pontual fica
    // logo abaixo de 50, mas remover qualquer um deles move muito o
    // valor, então o intervalo cruza o limiar.
    const videos = [
      video("d1", "dom1", 910_000, 40_000),
      video("d2", "dom2", 910_000, 40_000),
      video("d3", "dom3", 910_000, 40_000),
      ...pulverized(42, 60_000, 10_000, "s"),
    ];
    const r = decide(input({ videos }));
    expect(r.concentration.value).toBeLessThan(50);
    expect(r.concentration.band!.p95).toBeGreaterThanOrEqual(50);
    expect(r.verdict).toBe("MAYBE");
    expect(r.reasons.join(" ")).toContain("cruza o limiar");
  });

  it("intervalo inteiramente abaixo do limiar libera o SIM", () => {
    const r = decide(input({ videos: pulverized(60, 40_000, 10_000) }));
    expect(r.concentration.band!.p95).toBeLessThan(50);
    expect(r.verdict).toBe("YES");
  });

  it("concentração entre os dois limiares produz TALVEZ", () => {
    const videos = [
      video("d1", "dom1", 1_600_000, 40_000),
      video("d2", "dom2", 1_600_000, 40_000),
      video("d3", "dom3", 1_600_000, 40_000),
      ...pulverized(27, 130_000, 10_000, "s"),
    ];
    const r = decide(input({ videos }));
    expect(r.concentration.value).toBeGreaterThanOrEqual(50);
    expect(r.concentration.value).toBeLessThan(65);
    expect(r.verdict).toBe("MAYBE");
  });
});

describe("7 · determinismo", () => {
  it("mesma entrada produz saída byte-idêntica", () => {
    const amostra = pulverized(50, 30_000, 10_000);
    const a = decide(input({ videos: amostra }));
    const b = decide(input({ videos: amostra }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("a ordem dos vídeos na entrada não muda o resultado", () => {
    const amostra = pulverized(50, 30_000, 10_000);
    const a = decide(input({ videos: amostra }));
    const b = decide(input({ videos: [...amostra].reverse() }));
    expect(b.concentration.value).toBe(a.concentration.value);
    expect(b.concentration.band).toEqual(a.concentration.band);
    expect(b.opportunityScore).toBe(a.opportunityScore);
    expect(b.verdict).toBe(a.verdict);
  });
});

describe("8 · ausência de mock/PRNG no caminho decisório", () => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const fontes = ["engine.ts", "metrics.ts", "evidence.ts", "parameters.ts", "longitudinal.ts"]
    .map((f) => ({ f, src: fs.readFileSync(path.join(dir, f), "utf8") }));

  it("nenhum módulo do motor usa aleatoriedade", () => {
    for (const { f, src } of fontes) {
      expect(src, `${f} usa Math.random`).not.toMatch(/Math\.random/);
      expect(src, `${f} importa um PRNG`).not.toMatch(/seeded-random|createRng|mulberry/);
    }
  });

  it("nenhum módulo do motor importa do pacote mock", () => {
    for (const { f, src } of fontes) {
      expect(src, `${f} importa de mock/`).not.toMatch(/from\s+["'].*\/mock\//);
    }
  });

  it("fallback demonstrativo impede qualquer veredito", () => {
    const r = decide(
      input({ videos: pulverized(60, 40_000, 10_000), usedFallback: true })
    );
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
    expect(r.opportunityScore).toBeNull();
    expect(r.reasons.join(" ")).toContain("demonstrativos");
  });
});

describe("9 · ausência completa de M3", () => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const fontes = ["engine.ts", "metrics.ts", "evidence.ts", "parameters.ts"]
    .map((f) => ({ f, src: fs.readFileSync(path.join(dir, f), "utf8") }));

  it("nenhuma referência a pressão de oferta no motor", () => {
    for (const { f, src } of fontes) {
      expect(src, `${f} menciona supply`).not.toMatch(/supplyPressure|supplyPerMonth|supplyLow|supplyHigh/);
    }
  });

  it("o resultado não expõe campo de oferta nem de tier", () => {
    const r = decide(input({ videos: pulverized(60, 40_000, 10_000) }));
    const chaves = JSON.stringify(r);
    expect(chaves).not.toMatch(/supply/i);
    expect(chaves).not.toMatch(/"tier"/);
  });
});

describe("longitudinal — contextual, nunca decisivo", () => {
  it("duas leituras separadas produzem velocidade real", () => {
    const d = computeDelta(
      "v1",
      { views: 10_000, readAt: new Date(Date.now() - 20 * DAY).toISOString() },
      { views: 30_000, readAt: new Date().toISOString() }
    )!;
    expect(d.viewsPerDay).toBe(1_000);
  });

  it("intervalo curto ou queda de views não viram velocidade", () => {
    expect(
      computeDelta(
        "v1",
        { views: 10_000, readAt: new Date(Date.now() - 2 * DAY).toISOString() },
        { views: 12_000, readAt: new Date().toISOString() }
      )
    ).toBeNull();
    expect(
      computeDelta(
        "v1",
        { views: 50_000, readAt: new Date(Date.now() - 30 * DAY).toISOString() },
        { views: 40_000, readAt: new Date().toISOString() }
      )
    ).toBeNull();
  });

  it("ausência de histórico não afeta o veredito", () => {
    expect(aggregateLongitudinal([])).toBeNull();
    const r = decide(input({ videos: pulverized(60, 40_000, 10_000) }));
    expect(r.verdict).toBe("YES");
  });
});
