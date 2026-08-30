import type { RadarSweep } from "@/domain";
import { RadarBudgetExceededError, type RadarSweepInput } from "./contracts";
import { getServices } from "./index";

export type RadarOutcome =
  | { status: "ok"; sweep: RadarSweep }
  | { status: "budget_exceeded"; spentToday: number; budget: number };

/**
 * Entrada única do Radar para a UI. Traduz o estouro do orçamento
 * diário de quota em um estado exibível (nunca em dados mock).
 */
export async function runRadarSweep(
  input: RadarSweepInput
): Promise<RadarOutcome> {
  try {
    const sweep = await getServices().radarProvider.sweep(input);
    return { status: "ok", sweep };
  } catch (error) {
    if (error instanceof RadarBudgetExceededError) {
      return {
        status: "budget_exceeded",
        spentToday: error.spentToday,
        budget: error.budget,
      };
    }
    throw error;
  }
}
