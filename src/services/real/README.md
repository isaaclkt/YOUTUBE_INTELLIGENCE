# Serviços REAIS

Implementações de produção dos contratos de `src/services/contracts`.
`index.ts` monta o contêiner do modo `SERVICES_MODE="real"`: o que já
existe de real entra; o restante reusa o mock até ser conectado.

## Estado atual

| Subpasta          | Serviço            | Fonte externa                             | Status          |
| ----------------- | ------------------ | ----------------------------------------- | --------------- |
| `ai-interpreter/` | `AIInterpreter`    | Anthropic API (`claude-sonnet-5`)         | **IMPLEMENTADO** (fallback automático p/ mock) |
| `data-collector/` | `DataCollector`    | YouTube Data API v3 + fonte de tendências | PLANEJADO       |
| `trends/`         | (parte da coleta)  | Google Trends / SerpAPI / DataForSEO      | PLANEJADO       |

## Como conectar os próximos

1. Implemente o contrato na subpasta (veja o README de cada uma).
2. Substitua a entrada correspondente em `./index.ts`
   (`createRealServices`).

A UI e o pipeline **não mudam** — eles só conhecem os contratos.

`MetricsEngine`, `ScoringEngine`, `OpportunityEngine` e
`RecommendationEngine` são cálculo/composição local: podem começar
reaproveitando a lógica dos mocks, recalibrada com dados reais
(pesos em `src/services/mock/formulas.ts`).
