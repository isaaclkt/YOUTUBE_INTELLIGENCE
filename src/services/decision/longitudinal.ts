/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — INDICADOR LONGITUDINAL
 *
 * Duas leituras da mesma contagem de views, separadas no tempo,
 * dão velocidade REAL (views por dia) — sem o viés de idade que
 * contamina views ÷ tempo-desde-publicação, onde vídeos novos
 * sempre parecem mais rápidos porque a acumulação é concentrada
 * nos primeiros dias.
 *
 * REGRA FIXA (RN-13): este indicador NUNCA entra no Opportunity
 * Score nem no veredito. Ele é exibido ao lado do resultado, e
 * sua ausência não degrada a qualidade da evidência — a primeira
 * análise de um tema é legitimamente transversal.
 *
 * Funções puras. A persistência vive em src/lib/repository.ts.
 * ============================================================
 */

import { median } from "./metrics";
import { LONGITUDINAL_MIN_DAYS } from "./parameters";

export interface Reading {
  views: number;
  /** ISO 8601. */
  readAt: string;
}

export interface VideoDelta {
  videoId: string;
  previousViews: number;
  currentViews: number;
  deltaViews: number;
  spanDays: number;
  /** Views por dia entre as duas leituras. */
  viewsPerDay: number;
}

export interface LongitudinalIndicator {
  /** Quantos vídeos tinham leitura anterior utilizável. */
  comparedVideos: number;
  /** Mediana de views/dia entre as duas leituras. */
  medianViewsPerDay: number;
  /** Dias cobertos pela comparação (mediana dos intervalos). */
  spanDays: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Variação entre duas leituras do mesmo vídeo.
 *
 * Devolve null quando a comparação não é defensável:
 * intervalo curto demais, datas inválidas, ou contagem que
 * DIMINUIU — views não caem, então uma queda indica troca de
 * contexto (vídeo republicado, contagem corrigida pelo YouTube)
 * e não uma velocidade negativa.
 */
export function computeDelta(
  videoId: string,
  previous: Reading,
  current: Reading
): VideoDelta | null {
  const prevMs = new Date(previous.readAt).getTime();
  const currMs = new Date(current.readAt).getTime();
  if (Number.isNaN(prevMs) || Number.isNaN(currMs)) return null;

  const spanDays = (currMs - prevMs) / MS_PER_DAY;
  if (spanDays < LONGITUDINAL_MIN_DAYS) return null;

  if (
    !Number.isFinite(previous.views) ||
    !Number.isFinite(current.views) ||
    current.views < previous.views
  ) {
    return null;
  }

  const deltaViews = current.views - previous.views;
  return {
    videoId,
    previousViews: previous.views,
    currentViews: current.views,
    deltaViews,
    spanDays: Math.round(spanDays * 10) / 10,
    viewsPerDay: Math.round((deltaViews / spanDays) * 10) / 10,
  };
}

/**
 * Agrega as variações num indicador do tema.
 * Devolve null quando não há comparações suficientes — ausência de
 * histórico é reportada como tal, nunca preenchida com zero.
 */
export function aggregateLongitudinal(
  deltas: readonly VideoDelta[],
  minVideos = 5
): LongitudinalIndicator | null {
  if (deltas.length < minVideos) return null;
  return {
    comparedVideos: deltas.length,
    medianViewsPerDay: Math.round(median(deltas.map((d) => d.viewsPerDay)) * 10) / 10,
    spanDays: Math.round(median(deltas.map((d) => d.spanDays)) * 10) / 10,
  };
}
