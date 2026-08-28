# RealAIInterpreter — IMPLEMENTADO

`real-ai-interpreter.ts` implementa o contrato `AIInterpreter`
(`src/services/contracts/ai-interpreter.ts`) com a API da Anthropic
(modelo `claude-sonnet-5`, saída estruturada validada por Zod).

## Como funciona

1. Recebe tema + idioma + país + scores/métricas/veredito **já
   calculados** pelo ScoringEngine.
2. Envia esses números ao Claude com um system prompt que proíbe
   calcular, alterar ou inventar valores — a IA só explica e cria
   (3 pontos do "Por quê", 3 ângulos específicos do tema, 3 títulos
   com justificativa e o texto da recomendação final).
3. A resposta é validada contra o schema (`messages.parse` +
   `zodOutputFormat`); resposta inválida conta como falha.

## Fallback automático (a UI nunca quebra)

Cai no `MockAIInterpreter` (templates) quando:

- `ANTHROPIC_API_KEY` não está definida;
- a chamada falha (rede, quota, 4xx/5xx, timeout de 30s);
- a resposta não valida contra o schema.

## Configuração

- Chave em `.env.local` (nunca commitado): `ANTHROPIC_API_KEY=...`
- `SERVICES_MODE="real"` no `.env` (já é o padrão).
- A chave é lida apenas no servidor; `import "server-only"` no módulo
  quebra o build se ele for importado por um bundle de cliente.

## Melhorias futuras

- Guarda-corpo extra: verificar que números citados nos textos
  pertencem à entrada (hoje garantido por prompt, não por código).
- Cache de interpretação por tema+scores (mesma entrada → mesmo texto).
- Idioma da interface configurável (hoje os textos analíticos são pt-BR
  e ângulos/títulos saem no idioma do conteúdo).
