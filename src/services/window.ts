import type { WindowReport } from "@/domain";
import type { WindowCheckInput } from "./contracts";
import { getServices } from "./index";
import {
  DAILY_QUOTA_LIMIT,
  getDailyQuotaSpent,
} from "./real/data-collector/youtube-api";

/** Entrada única do Verificador de Janela para a UI. */
export async function runWindowCheck(
  input: WindowCheckInput
): Promise<WindowReport> {
  return getServices().windowChecker.check(input);
}

/** Situação da quota diária GLOBAL do YouTube (todas as frentes). */
export async function getYouTubeQuotaStatus(): Promise<{
  spent: number;
  limit: number;
  remaining: number;
}> {
  const spent = await getDailyQuotaSpent();
  return { spent, limit: DAILY_QUOTA_LIMIT, remaining: DAILY_QUOTA_LIMIT - spent };
}
