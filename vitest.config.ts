import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Config mínima: só resolve o alias "@/" que o projeto usa, para que
 * os testes possam importar módulos da aplicação do mesmo jeito que
 * o código de produção importa.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
