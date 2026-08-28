import type { ServiceContainer } from "../contracts";
import { createMockServices } from "../mock";
import { MockAIInterpreter } from "../mock/mock-ai-interpreter";
import { RealAIInterpreter } from "./ai-interpreter/real-ai-interpreter";

/**
 * Contêiner do modo "real" na fase atual: interpretação por IA de
 * verdade (Anthropic, com fallback automático para o mock quando não
 * há ANTHROPIC_API_KEY ou a chamada falha); coleta, métricas, scoring
 * e mercados continuam mock até a YouTube Data API ser conectada
 * (ver os READMEs vizinhos).
 */
export function createRealServices(): ServiceContainer {
  return {
    ...createMockServices(),
    aiInterpreter: new RealAIInterpreter(new MockAIInterpreter()),
  };
}
