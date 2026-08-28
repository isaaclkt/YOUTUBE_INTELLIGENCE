import type { ServiceContainer } from "./contracts";
import { createMockServices } from "./mock";

/**
 * ============================================================
 * PONTO ÚNICO DE INJEÇÃO DE SERVIÇOS
 *
 * Toda a aplicação obtém o motor por getServices(). A escolha
 * mock/real acontece SOMENTE aqui, via SERVICES_MODE (.env).
 * A UI e as rotas nunca importam `./mock` ou `./real` diretamente.
 * ============================================================
 */

export type ServicesMode = "mock" | "real";

export function getServicesMode(): ServicesMode {
  return process.env.SERVICES_MODE === "real" ? "real" : "mock";
}

function createRealServices(): ServiceContainer {
  // Fase 1: intencionalmente não implementado.
  throw new Error(
    "SERVICES_MODE=real ainda não está disponível. " +
      "Veja src/services/real/README.md para o que precisa ser conectado, " +
      "ou volte para SERVICES_MODE=mock no .env."
  );
}

let container: ServiceContainer | null = null;

export function getServices(): ServiceContainer {
  if (container === null) {
    container =
      getServicesMode() === "real" ? createRealServices() : createMockServices();
  }
  return container;
}
