# YouTubeDataCollector — IMPLEMENTADO

`youtube-data-collector.ts` implementa o contrato `DataCollector`
(`src/services/contracts/data-collector.ts`) com a YouTube Data API v3.
`youtube-api.ts` é o cliente HTTP (cache + quota); `derive-video-stats.ts`
contém a derivação pura das métricas.

## O que é coletado (real)

Para um tema+idioma+país: duas buscas (`search.list` por relevância e
por data, 50 resultados cada), estatísticas dos vídeos (`videos.list`:
views, likes, comentários, data) e dos canais (`channels.list`:
inscritos, views e nº de vídeos do canal).

## Métricas derivadas

| Métrica                | Como                                                            |
| ---------------------- | --------------------------------------------------------------- |
| **VPH**                | views ÷ horas desde a publicação; medianas geral e recente (90d) |
| **Outliers**           | vídeo com ≥3× a média de views do próprio canal (piso 1.000 views); `outlierRatio` = fração da amostra |
| **Concorrência**       | fração da amostra de canais fortes (≥100k inscritos), share do canal dominante, inscritos medianos |
| **Cadência**           | uploads/semana a partir da janela dos 50 vídeos mais recentes    |
| **Demanda (proxy)**    | VPH recente + engajamento (likes+comentários/views) + views médias |

`MetricsEngine` transforma esses números em Demand/Competition/Saturation
reais. **Trend continua MOCK** (`sources.trends = "mock"`) e aparece na
UI com o selo "estimado" — conectar a fonte de tendências é o próximo
passo (`../trends/README.md`).

## Quota (10.000 unidades/dia no tier gratuito)

Uma análise NOVA custa **~204 unidades**:

| Chamada                          | Custo      |
| -------------------------------- | ---------- |
| `search.list` × 2 (relevância + data) | 200   |
| `videos.list` (até 100 ids)      | 1–2        |
| `channels.list` (canais únicos)  | 1–2        |

Cache de 24h em SQLite (`ApiCache`, chave = hash do endpoint+parâmetros,
sem a chave da API): repetir o mesmo tema+idioma+país custa **0 unidades**.
O custo real de cada análise é logado no servidor
(`[YouTubeDataCollector] ... unidades de quota`).

## Fallback automático (a UI nunca quebra)

Cai no `MockDataCollector` quando: `YOUTUBE_API_KEY` ausente; erro
HTTP/quota; ou amostra com menos de 5 vídeos utilizáveis.

## Configuração

- Chave em `.env.local` (nunca commitado): `YOUTUBE_API_KEY=...`
  (Google Cloud Console, YouTube Data API v3 habilitada).
- A chave é lida apenas no servidor; `import "server-only"` quebra o
  build se o módulo vazar para bundle de cliente.
