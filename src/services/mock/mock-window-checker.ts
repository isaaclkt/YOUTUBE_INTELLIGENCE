import type {
  LanguageWindowCheck,
  WindowInterpretation,
  WindowReport,
} from "@/domain";
import { COUNTRY_LABELS } from "@/lib/constants";
import type { WindowChecker, WindowCheckInput } from "../contracts";
import { computeWindowVerdict } from "../window-verdict";
import { between, createRng, intBetween } from "./seeded-random";
import { simulateLatency } from "./simulate";

const VERDICT_RANK = { OPEN: 0, CONTESTED: 1, SATURATED: 2 } as const;

/**
 * Interpretação por template (fallback e mock): resume o quadro a
 * partir dos vereditos do motor, sem IA. Também usada pelo verificador
 * real quando a Anthropic está indisponível.
 */
export function buildTemplateWindowInterpretation(
  checks: readonly LanguageWindowCheck[]
): WindowInterpretation {
  const ordered = [...checks].sort(
    (a, b) =>
      VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] ||
      b.avgTopVph - a.avgTopVph
  );
  const best = ordered[0];
  const enterFirst = best
    ? best.verdict === "OPEN"
      ? `Comece por ${COUNTRY_LABELS[best.country]}: janela aberta (${best.recentLongFormCount} long-form recentes, ${best.activeOutliers} outliers ativos, ${Math.round(best.strongChannelShare * 100)}% de canais fortes).`
      : `Nenhum mercado com janela aberta agora; o menos disputado é ${COUNTRY_LABELS[best.country]} (${Math.round(best.strongChannelShare * 100)}% de canais fortes, ${best.activeOutliers} outliers ativos).`
    : "Sem mercados verificados.";

  return {
    enterFirst,
    culturalNotes: checks.map((check) => ({
      language: check.language,
      note: `Valide o vocabulário do nicho em ${COUNTRY_LABELS[check.country]} — a consulta usada foi "${check.translatedQuery}".`,
    })),
    validateBefore: [
      "Confirme os títulos dos outliers locais antes de definir o formato.",
      "Publique 2–3 vídeos de teste e compare o VPH com o do mercado de origem.",
    ],
    generatedBy: "template",
  };
}

/** Mock determinístico do verificador (sem chave do YouTube). */
export class MockWindowChecker implements WindowChecker {
  async check(input: WindowCheckInput): Promise<WindowReport> {
    await simulateLatency(500, 900);
    const checks: LanguageWindowCheck[] = input.targets.map((target) => {
      const rng = createRng(
        `window|${input.query.trim().toLowerCase()}|${target.language}|${target.country}`
      );
      const recentLongFormCount = intBetween(rng, 3, 55);
      const strongChannelShare = Math.round(between(rng, 0, 0.7) * 100) / 100;
      const activeOutliers = intBetween(rng, 0, 8);
      return {
        language: target.language,
        country: target.country,
        translatedQuery: input.query,
        verdict: computeWindowVerdict({
          recentLongFormCount,
          strongChannelShare,
          activeOutliers,
        }),
        recentLongFormCount,
        strongChannelShare,
        activeOutliers,
        avgTopVph: Math.round(10 ** between(rng, 0, 2.3) * 10) / 10,
        sampleSize: intBetween(rng, 10, 50),
        quotaUnits: 0,
        fromCache: false,
      };
    });

    return {
      query: input.query,
      sourceLanguage: input.sourceLanguage,
      checks,
      interpretation: buildTemplateWindowInterpretation(checks),
      checkedAt: new Date().toISOString(),
      totalQuotaUnits: 0,
    };
  }
}
