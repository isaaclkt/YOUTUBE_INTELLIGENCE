import { describe, expect, it } from "vitest";
import { decide, type DecisionInput } from "./engine";
import { aggregateLongitudinal, computeDelta } from "./longitudinal";
import type { DecisionVideo } from "./metrics";

/**
 * Testes do motor de decisão V2.
 *
 * Todas as entradas são FIXTURES explícitas — nenhum gerador
 * aleatório, nenhuma dependência de relógio, nenhum mock do
 * produto. O motor é puro, então o teste é aritmético.
 *
 * Parâmetros vigentes nos testes (padrões de produção):
 *   piso 5.000 views · alvo 100.000 views · entrante <= 50.000 inscritos
 */

const DAY = 86_400_000;

/** Vídeo publicado há `ageDays`, dentro da janela de amostragem. */
function video(
  id: string,
  channelId: string,
  views: number,
  subscribers: number | null,
  ageDays = 30
): DecisionVideo {
  return {
    videoId: id,
    channelId,
    views,
    publishedAt: new Date(Date.now() - ageDays * DAY).toISOString(),
    subscribers,
  };
}

/** Amostra pulverizada: cada vídeo num canal próprio. */
function spread(
  count: number,
  views: number,
  subscribers: number | null,
  prefix: string
): DecisionVideo[] {
  return Array.from({ length: count }, (_, i) =>
    video(`${prefix}v${i}`, `${prefix}c${i}`, views, subscribers)
  );
}

function input(overrides: Partial<DecisionInput> = {}): DecisionInput {
  const videos = overrides.videos ?? [];
  return {
    videos,
    rawCount: overrides.rawCount ?? videos.length,
    discardedCount: overrides.discardedCount ?? 0,
    supplyPerMonth: overrides.supplyPerMonth ?? null,
    usedFallback: overrides.usedFallback ?? false,
    tier: overrides.tier ?? "reduced",
  };
}

/**
 * Tema saudável: entrantes atingem o alvo, audiência pulverizada.
 * Dimensionado para satisfazer os critérios de evidência ALTA
 * (n >= 40, n_E >= 12), para que os testes de qualidade alta sejam
 * atingíveis sem afrouxar nenhum limiar.
 */
function healthySample(newcomerViews = 150_000): DecisionVideo[] {
  return [
    ...spread(20, newcomerViews, 10_000, "n"),
    ...spread(22, 120_000, 500_000, "i"),
  ];
}

describe("1 · alta oportunidade", () => {
  it("entrantes no alvo e audiência pulverizada produzem SIM", () => {
    const result = decide(input({ videos: healthySample() }));
    expect(result.verdict).toBe("YES");
    expect(result.quality).toBe("HIGH");
    expect(result.metrics.reach.value).toBe(100);
    expect(result.metrics.reach.raw).toBe(150_000);
    expect(result.opportunityScore).not.toBeNull();
    expect(result.scoreBand).toBe("Muito favorável");
  });
});

describe("2 · baixa oportunidade", () => {
  it("entrantes abaixo do piso produzem NÃO, com o piso vetando o score", () => {
    const videos = [
      ...spread(14, 1_200, 10_000, "n"),
      ...spread(16, 3_000, 500_000, "i"),
    ];
    const result = decide(input({ videos }));
    expect(result.verdict).toBe("NO");
    expect(result.metrics.reach.value).toBe(0);
    expect(result.reasons[0]).toContain("abaixo do piso");
  });

  it("o veto do piso vence mesmo com concorrência e oferta favoráveis", () => {
    // Concentração ~0 e nenhuma pressão: o score fica no meio da escala,
    // mas não há audiência a capturar. Se o veredito saísse do score,
    // este tema viraria TALVEZ.
    const videos = [
      ...spread(14, 1_200, 10_000, "n"),
      ...spread(16, 1_100, 20_000, "x"),
    ];
    const result = decide(input({ videos }));
    expect(result.verdict).toBe("NO");
    expect(result.metrics.concentration.value).toBeLessThan(10);
  });
});

describe("3 · alta concorrência", () => {
  it("três canais capturando a audiência produzem NÃO", () => {
    const giants = [
      video("g1", "big1", 5_000_000, 9_000_000),
      video("g2", "big2", 4_000_000, 8_000_000),
      video("g3", "big3", 3_000_000, 7_000_000),
    ];
    const videos = [...giants, ...spread(27, 20_000, 10_000, "n")];
    const result = decide(input({ videos }));
    expect(result.metrics.concentration.value).toBeGreaterThanOrEqual(65);
    expect(result.verdict).toBe("NO");
    expect(result.reasons[0]).toContain("Concentração");
  });

  it("concentração intermediária com alcance no alvo produz TALVEZ", () => {
    // Três canais com 1,8 mi cada contra 27 canais somando 3,66 mi:
    // top-3 fica em ~60% da audiência, o que dá excesso ~55/100 —
    // acima do limite de SIM (50) e abaixo do de NÃO (65).
    const videos = [
      video("g1", "big1", 1_800_000, 9_000_000),
      video("g2", "big2", 1_800_000, 8_000_000),
      video("g3", "big3", 1_800_000, 7_000_000),
      ...spread(14, 150_000, 10_000, "n"),
      ...spread(13, 120_000, 400_000, "i"),
    ];
    const result = decide(input({ videos }));
    const concentration = result.metrics.concentration.value!;
    expect(concentration).toBeGreaterThanOrEqual(50);
    expect(concentration).toBeLessThan(65);
    expect(result.verdict).toBe("MAYBE");
  });
});

describe("4 · baixa concorrência", () => {
  it("audiência pulverizada dá concentração próxima de zero", () => {
    const result = decide(input({ videos: healthySample() }));
    expect(result.metrics.concentration.value).toBeLessThan(10);
    expect(result.metrics.concentration.kind).toBe("derived");
  });
});

describe("5 · histórico suficiente", () => {
  it("duas leituras separadas produzem velocidade real", () => {
    const previous = { views: 10_000, readAt: new Date(Date.now() - 20 * DAY).toISOString() };
    const current = { views: 30_000, readAt: new Date().toISOString() };
    const delta = computeDelta("v1", previous, current)!;
    expect(delta.deltaViews).toBe(20_000);
    expect(delta.spanDays).toBe(20);
    expect(delta.viewsPerDay).toBe(1_000);
  });

  it("agrega quando há comparações suficientes", () => {
    const deltas = Array.from({ length: 6 }, (_, i) =>
      computeDelta(
        `v${i}`,
        { views: 1_000, readAt: new Date(Date.now() - 10 * DAY).toISOString() },
        { views: 6_000, readAt: new Date().toISOString() }
      )!
    );
    const agg = aggregateLongitudinal(deltas)!;
    expect(agg.comparedVideos).toBe(6);
    expect(agg.medianViewsPerDay).toBe(500);
  });
});

describe("6 · histórico insuficiente", () => {
  it("intervalo curto demais não vira velocidade", () => {
    const delta = computeDelta(
      "v1",
      { views: 10_000, readAt: new Date(Date.now() - 2 * DAY).toISOString() },
      { views: 12_000, readAt: new Date().toISOString() }
    );
    expect(delta).toBeNull();
  });

  it("queda de views é rejeitada em vez de virar velocidade negativa", () => {
    const delta = computeDelta(
      "v1",
      { views: 50_000, readAt: new Date(Date.now() - 30 * DAY).toISOString() },
      { views: 40_000, readAt: new Date().toISOString() }
    );
    expect(delta).toBeNull();
  });

  it("poucas comparações não produzem indicador", () => {
    expect(aggregateLongitudinal([])).toBeNull();
  });

  it("AUSÊNCIA DE HISTÓRICO NÃO AFETA O VEREDITO (RN-13)", () => {
    // Mesma amostra, nenhum histórico: o veredito sai normalmente.
    const result = decide(input({ videos: healthySample() }));
    expect(result.verdict).toBe("YES");
    expect(result.quality).toBe("HIGH");
  });
});

describe("7 · amostra pequena", () => {
  it("menos de 20 vídeos não produz veredito", () => {
    const result = decide(input({ videos: spread(12, 200_000, 10_000, "n") }));
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
    expect(result.opportunityScore).toBeNull();
    expect(result.scoreBand).toBeNull();
    expect(result.reasons.join(" ")).toContain("mínimo 20");
  });

  it("menos de 5 entrantes não produz veredito, por melhores que sejam os números", () => {
    const videos = [
      ...spread(3, 900_000, 10_000, "n"),
      ...spread(27, 500_000, 800_000, "i"),
    ];
    const result = decide(input({ videos }));
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
    expect(result.metrics.reach.value).toBeNull();
    expect(result.metrics.reach.unavailableReason).toContain("entrantes");
  });

  it("poucos canais distintos tornam a concentração não interpretável", () => {
    const videos = Array.from({ length: 24 }, (_, i) =>
      video(`v${i}`, `c${i % 3}`, 200_000, 10_000)
    );
    const result = decide(input({ videos }));
    expect(result.metrics.concentration.value).toBeNull();
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
  });
});

describe("8 · dados ausentes", () => {
  it("amostra vazia não produz veredito nem score", () => {
    const result = decide(input({ videos: [] }));
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
    expect(result.opportunityScore).toBeNull();
    expect(result.metrics.reach.value).toBeNull();
    expect(result.metrics.concentration.value).toBeNull();
  });

  it("no tier reduzido a pressão de oferta é null e NÃO vira zero", () => {
    const result = decide(input({ videos: healthySample(), tier: "reduced" }));
    expect(result.metrics.supplyPressure.value).toBeNull();
    expect(result.metrics.supplyPressure.raw).toBeNull();
    expect(result.metrics.supplyPressure.unavailableReason).toBeTruthy();
    // O score existe assim mesmo, com os pesos do tier reduzido.
    expect(result.opportunityScore).not.toBeNull();
  });

  it("no tier completo, pressão ausente impede o score", () => {
    const result = decide(
      input({ videos: healthySample(), tier: "full", supplyPerMonth: null })
    );
    expect(result.metrics.supplyPressure.value).toBeNull();
    expect(result.opportunityScore).toBeNull();
  });

  it("no tier completo, pressão presente entra no score", () => {
    const result = decide(
      input({ videos: healthySample(), tier: "full", supplyPerMonth: 12 })
    );
    expect(result.metrics.supplyPressure.value).toBeGreaterThan(0);
    expect(result.opportunityScore).not.toBeNull();
    expect(result.verdict).toBe("YES");
  });
});

describe("9 · dados parciais", () => {
  it("inscritos ocultos em excesso impedem o veredito", () => {
    const videos = [
      ...spread(8, 150_000, 10_000, "n"),
      ...spread(22, 150_000, null, "u"), // 73% sem inscritos visíveis
    ];
    const result = decide(input({ videos }));
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
    expect(result.reasons.join(" ")).toContain("inscritos");
  });

  it("evidência baixa bloqueia SIM mas mantém o resultado (RN-09)", () => {
    // n=22, n_E=6: acima dos mínimos, abaixo dos critérios de Média.
    const videos = [
      ...spread(6, 400_000, 10_000, "n"),
      ...spread(16, 300_000, 800_000, "i"),
    ];
    const result = decide(input({ videos }));
    expect(result.quality).toBe("LOW");
    expect(result.metrics.reach.raw).toBe(400_000); // atingiria o alvo
    expect(result.verdict).toBe("MAYBE"); // rebaixado
    expect(result.reasons.join(" ")).toContain("evidência é baixa");
  });

  it("evidência baixa NÃO bloqueia NÃO — a assimetria é deliberada", () => {
    const videos = [
      ...spread(6, 900, 10_000, "n"),
      ...spread(16, 2_000, 800_000, "i"),
    ];
    const result = decide(input({ videos }));
    expect(result.quality).toBe("LOW");
    expect(result.verdict).toBe("NO");
  });
});

describe("10 · dados inconsistentes", () => {
  it("descarte excessivo pelo gate de validade impede o veredito", () => {
    const result = decide(
      input({ videos: healthySample(), rawCount: 100, discardedCount: 60 })
    );
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
    expect(result.reasons.join(" ")).toContain("descartada por inconsistência");
  });

  it("descarte moderado rebaixa a qualidade sem impedir o veredito", () => {
    // 8 de 50 descartados = 16%: passa do limite de Alta (10%),
    // fica dentro do de Média (20%).
    const result = decide(
      input({ videos: healthySample(), rawCount: 50, discardedCount: 8 })
    );
    expect(result.quality).toBe("MEDIUM");
    expect(result.verdict).toBe("YES");
  });

  it("views dispersas em muitas ordens de grandeza rebaixam de Alta para Média", () => {
    // Amostra grande o bastante para Alta em todos os outros critérios:
    // a dispersão é a ÚNICA razão do rebaixamento.
    const scattered = [
      ...spread(10, 6_000, 10_000, "lo"),
      ...spread(10, 900_000, 10_000, "hi"),
      ...spread(22, 120_000, 500_000, "i"),
    ];
    const result = decide(input({ videos: scattered }));
    expect(result.counters.sampleSize).toBeGreaterThanOrEqual(40);
    expect(result.counters.newcomerCount).toBeGreaterThanOrEqual(12);
    expect(result.counters.reachSpreadDecades!).toBeGreaterThan(1);
    expect(result.quality).toBe("MEDIUM");
  });

  it("amostra sem views não produz concentração", () => {
    const videos = spread(30, 0, 10_000, "z");
    const result = decide(input({ videos }));
    expect(result.metrics.concentration.value).toBeNull();
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
  });
});

describe("11 · limite entre vereditos", () => {
  it("exatamente no piso NÃO é NÃO; um view abaixo é", () => {
    const atFloor = decide(
      input({
        videos: [...spread(14, 5_000, 10_000, "n"), ...spread(16, 9_000, 500_000, "i")],
      })
    );
    expect(atFloor.metrics.reach.raw).toBe(5_000);
    expect(atFloor.verdict).toBe("MAYBE");

    const belowFloor = decide(
      input({
        videos: [...spread(14, 4_999, 10_000, "n"), ...spread(16, 9_000, 500_000, "i")],
      })
    );
    expect(belowFloor.verdict).toBe("NO");
  });

  it("exatamente no alvo é SIM; um view abaixo é TALVEZ", () => {
    const atTarget = decide(input({ videos: healthySample(100_000) }));
    expect(atTarget.metrics.reach.raw).toBe(100_000);
    expect(atTarget.verdict).toBe("YES");

    const belowTarget = decide(input({ videos: healthySample(99_999) }));
    expect(belowTarget.metrics.reach.raw).toBe(99_999);
    expect(belowTarget.verdict).toBe("MAYBE");
  });

  it("a normalização satura nas âncoras sem extrapolar", () => {
    const wayAbove = decide(input({ videos: healthySample(10_000_000) }));
    expect(wayAbove.metrics.reach.value).toBe(100);
    const wayBelow = decide(
      input({ videos: [...spread(14, 1, 10_000, "n"), ...spread(16, 9_000, 500_000, "i")] })
    );
    expect(wayBelow.metrics.reach.value).toBe(0);
  });
});

describe("12 · ausência total de dados artificiais", () => {
  it("fallback demonstrativo impede qualquer veredito (RN-10)", () => {
    const result = decide(input({ videos: healthySample(), usedFallback: true }));
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
    expect(result.opportunityScore).toBeNull();
    expect(result.reasons.join(" ")).toContain("demonstrativos");
  });

  it("o motor é determinístico: mesma entrada, saída idêntica", () => {
    const sample = healthySample();
    const a = decide(input({ videos: sample }));
    const b = decide(input({ videos: sample }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("expõe os parâmetros usados junto do resultado (RN-12)", () => {
    const result = decide(input({ videos: healthySample() }));
    expect(result.parameters.viewsFloor).toBe(5_000);
    expect(result.parameters.viewsTarget).toBe(100_000);
    expect(result.parameters.tier).toBe("reduced");
  });

  it("toda métrica declara a própria origem", () => {
    const result = decide(input({ videos: healthySample(), tier: "full", supplyPerMonth: 10 }));
    expect(result.metrics.reach.kind).toBe("proxy");
    expect(result.metrics.concentration.kind).toBe("derived");
    expect(result.metrics.supplyPressure.kind).toBe("derived");
  });
});
