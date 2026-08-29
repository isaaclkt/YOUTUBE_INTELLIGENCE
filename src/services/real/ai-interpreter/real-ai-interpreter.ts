import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { LANGUAGE_LABELS } from "@/lib/constants";
import type {
  AIInterpretation,
  AIInterpretationInput,
  AIInterpreter,
} from "../../contracts";

/**
 * Interpretador REAL: Claude (Anthropic API) explica os números já
 * calculados e gera o conteúdo criativo específico do tema.
 *
 * Garantias:
 * - A chave (ANTHROPIC_API_KEY) é lida SOMENTE no servidor — o
 *   `import "server-only"` acima quebra o build se este módulo vazar
 *   para um bundle de cliente.
 * - Sem chave, com erro de rede/API ou com resposta fora do schema,
 *   cai automaticamente no interpretador mock — a UI nunca quebra.
 * - Os números (scores/métricas/veredito) chegam prontos do
 *   ScoringEngine e são apenas citados; a IA não calcula nada.
 */

/** Sonnet: melhor custo/latência para interpretação de métricas. */
const ANTHROPIC_MODEL = "claude-sonnet-5";

/**
 * Falha rápido para a UI: 30s de teto POR tentativa, 1 retry
 * (pior caso ~60s) — depois, fallback mock.
 */
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;

/** Schema da resposta — espelha o contrato AIInterpretation. */
const interpretationSchema = z.object({
  whyPoints: z.array(z.string().min(1)).length(3),
  angles: z
    .array(
      z.object({
        angle: z.string().min(1),
        potential: z.enum(["HIGH", "MEDIUM", "LOW"]),
        reason: z.string().min(1),
      })
    )
    .length(3),
  titles: z
    .array(
      z.object({
        title: z.string().min(1),
        whyItWorks: z.string().min(1),
      })
    )
    .length(3),
  recommendationSummary: z.string().min(1),
});

const SYSTEM_PROMPT = `Você é a camada de interpretação do YouTube Intelligence AI, uma ferramenta que responde a criadores de YouTube: "vale a pena criar conteúdo sobre esse tema?".

Você recebe um JSON com o tema, idioma do conteúdo, país-alvo e TODOS os números já calculados pelo motor (scores 0–100, métricas e veredito).

REGRAS INEGOCIÁVEIS:
- Você NUNCA calcula, ajusta, arredonda ou inventa números. Todo número citado nos seus textos deve existir literalmente na entrada.
- O veredito já foi decidido pelo motor — explique-o, não o conteste.
- NUNCA prometa viralização, crescimento garantido ou resultados. Tom honesto e direto; a decisão final é sempre do criador.

O QUE PRODUZIR:
- whyPoints: exatamente 3 pontos explicando o score — (1) demanda, (2) concorrência + saturação, (3) tendência — cada um citando os valores da entrada. Em português do Brasil.
- angles: exatamente 3 ângulos pouco explorados ESPECÍFICOS deste tema (proibido genérico aplicável a qualquer tema, como "X para iniciantes" sem um recorte concreto do assunto). O campo "angle" no idioma do conteúdo; "reason" em português do Brasil, citando pelo menos um número da entrada; "potential" coerente com os scores.
- titles: exatamente 3 títulos de vídeo prontos para uso, específicos do tema, no idioma do conteúdo. "whyItWorks" em português do Brasil, sem prometer viral.
  REGRA DOS TÍTULOS: se "titulosDeOutliersReais" vier preenchido, esses são títulos de vídeos que estão performando muito acima da média nos canais deste nicho AGORA. Analise a ESTRUTURA deles (formato, comprimento, uso de números, perguntas, colchetes, maiúsculas, gatilhos e vocabulário próprios do nicho) e gere as 3 sugestões seguindo esses padrões comprovados, adaptados ao tema analisado. NUNCA use fórmulas genéricas de outro nicho (ex.: "eu testei X por 30 dias") se elas não aparecem nos padrões reais. Em "whyItWorks", diga qual padrão real o título segue. Se a lista vier vazia, crie títulos plausíveis para o nicho — ainda assim específicos do tema, nunca fórmula genérica.
- recommendationSummary: 2–3 frases em português do Brasil com a recomendação prática, citando 1–2 números da entrada e terminando com um próximo passo concreto.`;

export class RealAIInterpreter implements AIInterpreter {
  private client: Anthropic | null = null;

  constructor(private readonly fallback: AIInterpreter) {}

  async interpret(input: AIInterpretationInput): Promise<AIInterpretation> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return this.fallback.interpret(input);
    }
    try {
      return await this.callAnthropic(input);
    } catch (error) {
      console.warn(
        "[RealAIInterpreter] Chamada à Anthropic falhou — usando o interpretador mock.",
        error
      );
      return this.fallback.interpret(input);
    }
  }

  private getClient(): Anthropic {
    if (this.client === null) {
      // Lê ANTHROPIC_API_KEY do ambiente do servidor automaticamente.
      // Chaves "identity-linked" exigem também o id do workspace
      // (ANTHROPIC_WORKSPACE_ID) enviado como header.
      const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
      this.client = new Anthropic({
        timeout: REQUEST_TIMEOUT_MS,
        maxRetries: MAX_RETRIES,
        ...(workspaceId
          ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } }
          : {}),
      });
    }
    return this.client;
  }

  private async callAnthropic(
    input: AIInterpretationInput
  ): Promise<AIInterpretation> {
    const { topic, metrics, scores, verdict, outlierTitles } = input;

    const payload = {
      tema: topic.query,
      idiomaDoConteudo: LANGUAGE_LABELS[topic.language],
      paisAlvo: topic.country,
      veredito: verdict,
      titulosDeOutliersReais: outlierTitles,
      scores: {
        oportunidade: scores.opportunity,
        demanda: scores.demand,
        concorrencia: scores.competition,
        saturacao: scores.saturation,
        tendencia: scores.trend,
        confianca: scores.confidence,
      },
      metricas: {
        crescimentoPercentualPorSemana: metrics.growthRate,
      },
    };

    const response = await this.getClient().messages.parse({
      model: ANTHROPIC_MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
      output_config: { format: zodOutputFormat(interpretationSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("Resposta do modelo não validou contra o schema.");
    }
    return { ...parsed, generatedBy: "ai" };
  }
}
