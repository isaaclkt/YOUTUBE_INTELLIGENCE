# RealAIInterpreter — PLANEJADO

Implementará o contrato `AIInterpreter`
(`src/services/contracts/ai-interpreter.ts`) usando um LLM
(recomendado: Claude API, modelo `claude-sonnet-5` para custo/qualidade).

## Regra inegociável (já garantida pelo contrato)

O LLM recebe os números JÁ CALCULADOS (`ComputedMetrics` + `Scores`
+ `Verdict`) e devolve **apenas explicação em linguagem natural**.
Ele nunca calcula, ajusta ou inventa números. Todo valor citado no
texto deve existir na entrada.

## O que precisa ser feito

1. `ANTHROPIC_API_KEY` no `.env` e SDK `@anthropic-ai/sdk`.
2. Prompt de sistema com: o papel ("explique, não calcule"), o tom
   do produto (honesto, sem promessa de viralização) e o formato de
   saída (`whyPoints`: exatamente 3 itens; `summary`: 1–2 frases).
3. Saída estruturada: usar tool use / JSON schema para receber
   `AIInterpretation` válido, com retry em caso de schema inválido.
4. Idioma da resposta = idioma da interface (fase 1: pt-BR).
5. Guarda-corpos: validar que números citados no texto pertencem à
   entrada; em caso de falha do LLM, degradar para o interpretador
   template (o mock atual serve de fallback).
