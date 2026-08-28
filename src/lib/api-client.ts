import type { Topic } from "@/domain";
import { API_ANALYSES_PATH } from "./constants";

const FALLBACK_ERROR = "Não foi possível concluir a análise. Tente novamente.";

/**
 * Cliente do endpoint de análises — o ÚNICO lugar da UI que conhece
 * fetch, rota e formato de resposta. Componentes chamam createAnalysis
 * e recebem o id da análise ou um Error com mensagem exibível.
 */
export async function createAnalysis(topic: Topic): Promise<string> {
  const response = await fetch(API_ANALYSES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topic),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? FALLBACK_ERROR);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}
