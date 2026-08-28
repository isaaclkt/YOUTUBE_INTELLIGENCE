import type { ComputedMetrics, NormalizedData, RawTopicData } from "./types";

/**
 * Etapas 2 e 3 do pipeline: NORMALIZAÇÃO e MÉTRICAS.
 * Transforma dados brutos em sinais comparáveis (0–1) e depois
 * em índices interpretáveis (0–100). Puro cálculo, sem IA.
 */
export interface MetricsEngine {
  normalize(raw: RawTopicData): NormalizedData;
  computeMetrics(data: NormalizedData): ComputedMetrics;
}
