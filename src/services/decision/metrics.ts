/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — MÉTRICAS
 *
 * Funções puras. Sem rede, sem banco, sem aleatoriedade.
 * Cada métrica devolve `null` quando não é computável, em vez de
 * um valor de preenchimento — a ausência é informação e precisa
 * chegar intacta ao veredito.
 * ============================================================
 */

import {
  MIN_SAMPLE,
  newcomerMaxSubscribers,
  supplyHigh,
  supplyLow,
  viewsFloor,
  viewsTarget,
} from "./parameters";

/** Um vídeo da amostra, já aprovado pelos filtros de formato/idioma. */
export interface DecisionVideo {
  videoId: string;
  channelId: string;
  views: number;
  /** ISO 8601. */
  publishedAt: string;
  /** null = inscritos ocultos ou canal ausente na resposta da API. */
  subscribers: number | null;
}

/**
 * Origem do número exibido:
 * "real"    contagem direta da API;
 * "derived" calculado a partir de contagens diretas;
 * "proxy"   mede um conceito vizinho ao que o nome sugere.
 */
export type MetricKind = "real" | "derived" | "proxy";

export interface DecisionMetric {
  /** 0–100 normalizado, ou null quando não computável. */
  value: number | null;
  /** Valor na unidade natural (views, fração, vídeos/mês). */
  raw: number | null;
  kind: MetricKind;
  /** Preenchido só quando `value` é null. */
  unavailableReason?: string;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Mediana de uma lista não vazia. Assume entrada já validada. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Quantil por interpolação linear — usado só na dispersão da evidência. */
function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/**
 * Posição de `raw` na escala logarítmica entre duas âncoras.
 * Fora do intervalo satura em 0 ou 100 — deliberado: abaixo do piso
 * "quão abaixo" não muda a decisão, e acima do alvo idem.
 */
export function normalizeLog(raw: number, low: number, high: number): number {
  const lo = Math.log10(low + 1);
  const hi = Math.log10(high + 1);
  if (!(hi > lo)) return 0;
  return Math.round(clamp01((Math.log10(raw + 1) - lo) / (hi - lo)) * 100);
}

/** Vídeos de canais classificados como entrantes. */
export function newcomerVideos(
  videos: readonly DecisionVideo[]
): DecisionVideo[] {
  const max = newcomerMaxSubscribers();
  return videos.filter((v) => v.subscribers !== null && v.subscribers <= max);
}

/** Vídeos cujo canal não pôde ser classificado (inscritos ocultos). */
export function unclassifiableVideos(
  videos: readonly DecisionVideo[]
): DecisionVideo[] {
  return videos.filter((v) => v.subscribers === null);
}

export function distinctChannelCount(
  videos: readonly DecisionVideo[]
): number {
  return new Set(videos.map((v) => v.channelId)).size;
}

/**
 * M1 · ALCANCE DO ENTRANTE — PROXY declarado.
 *
 * Mede: as views que um canal sem autoridade efetivamente alcançou
 * neste tema dentro da janela. É proxy de demanda acessível, não
 * medição de procura do público — a API não expõe procura.
 */
export function computeReach(videos: readonly DecisionVideo[]): DecisionMetric {
  const sample = newcomerVideos(videos);
  if (sample.length < MIN_SAMPLE.newcomerVideos) {
    return {
      value: null,
      raw: null,
      kind: "proxy",
      unavailableReason: `Apenas ${sample.length} vídeo(s) de canais entrantes; mínimo ${MIN_SAMPLE.newcomerVideos}.`,
    };
  }
  const raw = median(sample.map((v) => v.views));
  return {
    value: normalizeLog(raw, viewsFloor(), viewsTarget()),
    raw: Math.round(raw),
    kind: "proxy",
  };
}

/**
 * M2 · CONCENTRAÇÃO — derivada de contagens diretas.
 *
 * Mede: o quanto a audiência do tema está capturada pelos 3 canais
 * de maior soma de views. A subtração de 3/k remove o artefato de
 * que, com poucos canais, o top-3 é trivialmente alto.
 */
export function computeConcentration(
  videos: readonly DecisionVideo[]
): DecisionMetric {
  const k = distinctChannelCount(videos);
  if (k < MIN_SAMPLE.distinctChannels) {
    return {
      value: null,
      raw: null,
      kind: "derived",
      unavailableReason: `Apenas ${k} canal(is) distinto(s); concentração não é interpretável abaixo de ${MIN_SAMPLE.distinctChannels}.`,
    };
  }

  const viewsByChannel = new Map<string, number>();
  for (const v of videos) {
    viewsByChannel.set(v.channelId, (viewsByChannel.get(v.channelId) ?? 0) + v.views);
  }
  const total = [...viewsByChannel.values()].reduce((sum, v) => sum + v, 0);
  if (total <= 0) {
    return {
      value: null,
      raw: null,
      kind: "derived",
      unavailableReason: "Amostra sem views acumuladas.",
    };
  }

  const top3 = [...viewsByChannel.values()]
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((sum, v) => sum + v, 0);
  const share = top3 / total;
  const baseline = 3 / k;
  const excess = clamp01((share - baseline) / (1 - baseline));

  return {
    value: Math.round(excess * 100),
    raw: Math.round(share * 100) / 100,
    kind: "derived",
  };
}

/**
 * M3 · PRESSÃO DE OFERTA — derivada de contagens diretas.
 *
 * Mede: a densidade de publicação long-form no tema, em vídeos por
 * 30 dias. Entrada já calculada pelo coletor (a partir do intervalo
 * coberto pelos resultados mais recentes), porque depende de uma
 * chamada de API que esta camada não faz.
 *
 * `null` quando o tier reduzido não mediu — e null precisa
 * atravessar o score sem virar zero.
 */
export function computeSupplyPressure(
  supplyPerMonth: number | null
): DecisionMetric {
  if (supplyPerMonth === null || !Number.isFinite(supplyPerMonth)) {
    return {
      value: null,
      raw: null,
      kind: "derived",
      unavailableReason: "Pressão de oferta não medida neste tier de coleta.",
    };
  }
  return {
    value: normalizeLog(supplyPerMonth, supplyLow(), supplyHigh()),
    raw: round1(supplyPerMonth),
    kind: "derived",
  };
}

/**
 * Dispersão das views dos entrantes, em ordens de grandeza entre o
 * 1º e o 3º quartil. Alimenta a qualidade da evidência: um IQR que
 * cruza mais de uma década significa que a mediana não descreve
 * bem a amostra. Estatística descritiva — não é intervalo de
 * confiança, e a amostra não é aleatória.
 */
export function reachSpreadDecades(
  videos: readonly DecisionVideo[]
): number | null {
  const sample = newcomerVideos(videos).map((v) => v.views);
  if (sample.length < MIN_SAMPLE.newcomerVideos) return null;
  const q1 = quantile(sample, 0.25);
  const q3 = quantile(sample, 0.75);
  return round1(Math.log10(q3 + 1) - Math.log10(q1 + 1));
}
