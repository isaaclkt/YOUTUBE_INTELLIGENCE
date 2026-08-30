import type { ServiceContainer } from "../contracts";
import { createMockServices } from "../mock";
import { MockAIInterpreter } from "../mock/mock-ai-interpreter";
import { MockDataCollector } from "../mock/mock-data-collector";
import { MockRadarProvider } from "../mock/mock-radar-provider";
import { RealAIInterpreter } from "./ai-interpreter/real-ai-interpreter";
import { YouTubeDataCollector } from "./data-collector/youtube-data-collector";
import { RadarYouTubeProvider } from "./radar/radar-youtube-provider";

/**
 * Contêiner do modo "real" na fase atual:
 * - coleta de vídeos/canais via YouTube Data API v3 (YOUTUBE_API_KEY);
 * - interpretação por IA via Anthropic (ANTHROPIC_API_KEY);
 * ambos com fallback automático para o mock quando a chave falta ou a
 * chamada falha. Tendência/sinais por país continuam mock ("estimado")
 * até a fonte de tendências ser conectada (ver READMEs vizinhos).
 */
export function createRealServices(): ServiceContainer {
  return {
    ...createMockServices(),
    dataCollector: new YouTubeDataCollector(new MockDataCollector()),
    aiInterpreter: new RealAIInterpreter(new MockAIInterpreter()),
    radarProvider: new RadarYouTubeProvider(new MockRadarProvider()),
  };
}
