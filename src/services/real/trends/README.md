# Fonte de tendências — PLANEJADO

Alimenta `trendSeries` (12 semanas de interesse de busca) e
`countrySignals` (interesse por país) dentro do `RawTopicData`.

## Opções avaliadas

| Fonte                        | Prós                                   | Contras                          |
| ---------------------------- | -------------------------------------- | -------------------------------- |
| Google Trends (não oficial)  | Gratuito, dados por país e por semana  | Sem API oficial; instável        |
| SerpAPI (Google Trends API)  | API estável, JSON pronto               | Pago por requisição              |
| DataForSEO                   | Volumes de busca reais (keyword data)  | Pago; setup maior                |
| YouTube "most popular"       | Dentro da própria Data API             | Não cobre interesse por tema     |

## O que precisa ser feito

1. Escolher a fonte (recomendação inicial: SerpAPI pelo equilíbrio
   custo/estabilidade) e criar `TRENDS_API_KEY` no `.env`.
2. Normalizar a resposta para `RawTrendPoint[]` (0–100 por semana,
   12 semanas) e `RawCountrySignal[]` (apenas os 7 países da fase 1).
3. Cache por tema+país (tendências mudam devagar; TTL de 24h serve).
4. Fallback: sem dados de tendência, reduzir `dataQuality` — o
   Confidence Score já reflete isso automaticamente.
