# Serviços REAIS — ainda não implementados

Esta pasta receberá as implementações de produção dos contratos
definidos em `src/services/contracts`. Nada aqui é importado hoje.

## Como ativar quando estiver pronto

1. Implemente os contratos nas subpastas (veja o README de cada uma).
2. Crie um `createRealServices(): ServiceContainer` (espelhando
   `src/services/mock/index.ts`).
3. Ligue-o em `src/services/index.ts` (único ponto de injeção).
4. Troque `SERVICES_MODE="real"` no `.env`.

A UI e o pipeline **não mudam** — eles só conhecem os contratos.

## O que precisa ser conectado

| Subpasta          | Serviço            | Fonte externa                            |
| ----------------- | ------------------ | ---------------------------------------- |
| `data-collector/` | `DataCollector`    | YouTube Data API v3 + fonte de tendências |
| `trends/`         | (parte da coleta)  | Google Trends / SerpAPI / DataForSEO     |
| `ai-interpreter/` | `AIInterpreter`    | LLM (ex.: Claude API)                    |

`MetricsEngine`, `ScoringEngine`, `OpportunityEngine` e
`RecommendationEngine` são cálculo/composição local: podem começar
reaproveitando a lógica dos mocks, recalibrada com dados reais
(pesos em `src/services/mock/formulas.ts`).
