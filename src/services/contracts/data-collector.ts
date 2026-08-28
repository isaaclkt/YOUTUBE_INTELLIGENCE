import type { Topic } from "@/domain";
import type { RawTopicData } from "./types";

/**
 * Etapa 1 do pipeline: COLETA.
 * Fase real: YouTube Data API v3 + fonte de tendências.
 * Fase 1: mock determinístico (mesma consulta → mesmos dados).
 */
export interface DataCollector {
  collect(topic: Topic): Promise<RawTopicData>;
}
