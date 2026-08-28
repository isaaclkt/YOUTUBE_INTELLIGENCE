# RealDataCollector — PLANEJADO

Implementará o contrato `DataCollector` (`src/services/contracts/data-collector.ts`),
devolvendo `RawTopicData` com dados reais.

## Fonte principal: YouTube Data API v3

- `search.list` — buscar vídeos pelo tema (`q`), filtrando por
  `regionCode` (país) e `relevanceLanguage` (idioma). Custo: 100
  unidades de quota por chamada — a mais cara da API.
- `videos.list` — estatísticas dos vídeos encontrados (views, likes,
  comentários, data de publicação) para calcular `avgViews`,
  `medianViews`, `avgEngagementRate` e `recentUploadsPerWeek`.
- `channels.list` — estatísticas dos canais para `channelCount` e
  `dominantChannelShare`.

## O que precisa ser feito

1. Chave de API no Google Cloud Console (YouTube Data API v3 habilitada).
2. Variável `YOUTUBE_API_KEY` no `.env`.
3. Estratégia de quota (10.000 unidades/dia no tier gratuito):
   cache agressivo por tema+país+idioma (ex.: TTL de 24h) e
   amostragem (50–100 vídeos por análise é suficiente).
4. `trendSeries` e `countrySignals` vêm da fonte de tendências
   (ver `../trends/README.md`) — este serviço agrega as duas fontes.
5. Tratamento de erros: quota estourada, tema sem resultados,
   API indisponível → erros tipados que a rota da API converte em
   mensagens amigáveis.
