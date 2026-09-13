/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — MÉTRICAS
 *
 * Funções puras. Sem rede, sem banco, sem aleatoriedade.
 * Métrica não computável devolve `null` com motivo, em vez de um
 * valor de preenchimento — a ausência é informação e precisa
 * chegar intacta ao veredito.
 * ============================================================
 */

import {
  MIN_NEWCOMER_VIDEOS,
  MIN_SAMPLE,
  newcomerMaxSubscribers,
  RESAMPLE,
  viewsFloor,
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Mediana de uma lista não vazia. Assume entrada já validada. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Quantil por interpolação linear sobre uma lista não vazia. */
export function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** Vídeos de canais dentro do recorte de entrante. */
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

export function distinctChannelCount(videos: readonly DecisionVideo[]): number {
  return new Set(videos.map((v) => v.channelId)).size;
}

// ==================== C · CONCENTRAÇÃO (decisiva) ====================

export interface ConcentrationMetric {
  /** 0–100, ou null quando não computável. */
  value: number | null;
  /** Fatia bruta dos 3 maiores canais, 0–1. */
  topThreeShare: number | null;
  /** Intervalo de incerteza por reamostragem determinística. */
  band: { p5: number; p95: number } | null;
  /** Canais distintos na amostra. */
  distinctChannels: number;
  unavailableReason?: string;
}

/** Núcleo do cálculo — usado também em cada subconjunto da reamostragem. */
function concentrationOf(videos: readonly DecisionVideo[]): number | null {
  const k = new Set(videos.map((v) => v.channelId)).size;
  if (k < MIN_SAMPLE.distinctChannels) return null;

  const viewsByChannel = new Map<string, number>();
  for (const v of videos) {
    viewsByChannel.set(
      v.channelId,
      (viewsByChannel.get(v.channelId) ?? 0) + v.views
    );
  }
  const total = [...viewsByChannel.values()].reduce((sum, v) => sum + v, 0);
  if (total <= 0) return null;

  const topThree = [...viewsByChannel.values()]
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((sum, v) => sum + v, 0);
  const baseline = 3 / k;
  return clamp01((topThree / total - baseline) / (1 - baseline)) * 100;
}

/**
 * Subconjuntos DETERMINÍSTICOS de ~70% da amostra.
 *
 * Sem gerador pseudoaleatório e sem semente: a amostra é ordenada por
 * videoId e cada rodada seleciona os índices que satisfazem uma
 * progressão modular fixa. Mesma entrada → exatamente os mesmos
 * subconjuntos, sempre. Nenhum dado é inventado: cada subconjunto
 * contém apenas vídeos realmente observados.
 */
function deterministicSubsets(
  videos: readonly DecisionVideo[]
): DecisionVideo[][] {
  const ordered = [...videos].sort((a, b) =>
    a.videoId < b.videoId ? -1 : a.videoId > b.videoId ? 1 : 0
  );
  const subsets: DecisionVideo[][] = [];
  for (let round = 0; round < RESAMPLE.rounds; round++) {
    subsets.push(
      ordered.filter(
        (_, index) =>
          (index * RESAMPLE.strideA + round * RESAMPLE.strideB) %
            RESAMPLE.modulus <
          RESAMPLE.keepPerMille
      )
    );
  }
  return subsets;
}

/**
 * C · CONCENTRAÇÃO — métrica DECISIVA, derivada de contagens diretas.
 *
 * Mede: o quanto a audiência do tema está capturada pelos 3 canais de
 * maior soma de views. A subtração de `3/k` remove o artefato de que,
 * com poucos canais, o top-3 é trivialmente alto.
 *
 * Não lê contagem de inscritos — logo não depende de onde a faixa de
 * "entrante" é traçada, e seu valor não é artefato de uma escolha de
 * produto.
 */
export function computeConcentration(
  videos: readonly DecisionVideo[]
): ConcentrationMetric {
  const k = distinctChannelCount(videos);
  if (k < MIN_SAMPLE.distinctChannels) {
    return {
      value: null,
      topThreeShare: null,
      band: null,
      distinctChannels: k,
      unavailableReason: `Apenas ${k} canal(is) distinto(s); a concentração não é interpretável abaixo de ${MIN_SAMPLE.distinctChannels}.`,
    };
  }

  const value = concentrationOf(videos);
  if (value === null) {
    return {
      value: null,
      topThreeShare: null,
      band: null,
      distinctChannels: k,
      unavailableReason: "Amostra sem views acumuladas.",
    };
  }

  const viewsByChannel = new Map<string, number>();
  for (const v of videos) {
    viewsByChannel.set(
      v.channelId,
      (viewsByChannel.get(v.channelId) ?? 0) + v.views
    );
  }
  const total = [...viewsByChannel.values()].reduce((sum, v) => sum + v, 0);
  const topThree = [...viewsByChannel.values()]
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((sum, v) => sum + v, 0);

  const resampled = deterministicSubsets(videos)
    .map(concentrationOf)
    .filter((v): v is number => v !== null);

  const band =
    resampled.length >= 20
      ? { p5: quantile(resampled, 0.05), p95: quantile(resampled, 0.95) }
      : null;

  return {
    value: Math.round(value),
    topThreeShare: Math.round((topThree / total) * 100) / 100,
    band: band
      ? { p5: Math.round(band.p5), p95: Math.round(band.p95) }
      : null,
    distinctChannels: k,
  };
}

// ============ M1 · ALCANCE DO ENTRANTE (contextual) ============

/**
 * M1 é EVIDÊNCIA CONTEXTUAL. Não entra no score nem no veredito.
 *
 * É reportada apenas como o que os dados sustentam literalmente:
 * quantos dos vídeos de canais pequenos ultrapassaram o piso de views.
 * Não é convertida em afirmação sobre demanda do tema nem sobre
 * potencial do entrante — a validação com dados reais mostrou que o
 * porte do canal explica a maior parte da sua variação.
 */
export interface NewcomerContext {
  /** Vídeos de canais dentro do recorte de entrante. */
  videos: number;
  /** Quantos deles ultrapassaram o piso. */
  aboveFloor: number;
  /** aboveFloor ÷ videos, 0–100; null quando a amostra é pequena demais. */
  sharePercent: number | null;
  /** Mediana de views desses vídeos; null quando amostra pequena demais. */
  medianViews: number | null;
  /** Piso usado, para a frase ficar verificável. */
  floor: number;
  /** Dispersão das views, em ordens de grandeza entre Q1 e Q3. */
  spreadDecades: number | null;
}

export function describeNewcomers(
  videos: readonly DecisionVideo[]
): NewcomerContext {
  const sample = newcomerVideos(videos);
  const floor = viewsFloor();
  const aboveFloor = sample.filter((v) => v.views >= floor).length;

  if (sample.length < MIN_NEWCOMER_VIDEOS) {
    return {
      videos: sample.length,
      aboveFloor,
      sharePercent: null,
      medianViews: null,
      floor,
      spreadDecades: null,
    };
  }

  const views = sample.map((v) => v.views);
  const q1 = quantile(views, 0.25);
  const q3 = quantile(views, 0.75);

  return {
    videos: sample.length,
    aboveFloor,
    sharePercent: Math.round((aboveFloor / sample.length) * 100),
    medianViews: Math.round(median(views)),
    floor,
    spreadDecades:
      Math.round((Math.log10(q3 + 1) - Math.log10(q1 + 1)) * 10) / 10,
  };
}
