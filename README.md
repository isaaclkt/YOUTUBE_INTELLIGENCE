# YouTube Intelligence AI

> Nome provisório. Ferramenta de inteligência para criadores de YouTube que
> responde **uma** pergunta: _"vale a pena criar conteúdo sobre esse tema?"_
> Nunca promete viralizar. **A decisão final é sempre sua.**

## Stack

- **Next.js 16** (App Router) + **TypeScript estrito** + **Tailwind CSS 4**
- **Prisma + SQLite** local (histórico de análises) — pensado para migrar
  para Postgres trocando apenas o datasource (ver `prisma/schema.prisma`)
- Sem auth, sem pagamentos nesta fase

## Como rodar

Pré-requisito: **Node.js 20+** ([nodejs.org](https://nodejs.org) ou
`winget install OpenJS.NodeJS.LTS` no Windows — o instalador pede permissão
de administrador).

```bash
# 1. Instalar dependências (o postinstall já gera o Prisma Client)
npm install

# 2. Configurar o ambiente
# (Windows: copy .env.example .env)
cp .env.example .env

# 3. Criar o banco SQLite local
npm run db:push

# 4. Subir o servidor de desenvolvimento
npm run dev
```

Abra **http://localhost:3000** no navegador.

Build de produção: `npm run build` e depois `npm start`.

## Arquitetura

Regra central: **MOCK e REAL totalmente separados**, com um único ponto de
injeção. A UI nunca importa mock diretamente.

```
src/
├── app/                  # páginas e rotas (Home, /analysis/[id], API)
├── components/           # componentes pequenos, sem lógica de negócio
├── domain/               # entidades: Analysis, Topic, Market, Scores,
│                         # Opportunity, Title, Recommendation
├── services/
│   ├── contracts/        # interfaces: DataCollector, MetricsEngine,
│   │                     # ScoringEngine, OpportunityEngine,
│   │                     # AIInterpreter, RecommendationEngine
│   ├── mock/             # implementações mock realistas (determinísticas)
│   │   └── formulas.ts   # ⚠️ fórmulas de score MOCK, isoladas e comentadas
│   ├── real/             # implementações reais (AIInterpreter via
│   │                     # Anthropic) + READMEs do que falta conectar
│   ├── index.ts          # PONTO ÚNICO de injeção (SERVICES_MODE no .env)
│   └── pipeline.ts       # coleta → normalização → métricas → scoring
│                         # → oportunidades → interpretação IA → recomendação
└── lib/                  # utilitários, constantes, config, persistência
```

Princípios do motor:

- O pipeline roda **as mesmas etapas** em mock e em real — só as
  implementações mudam.
- A camada de IA recebe dados estruturados (demanda, crescimento,
  concorrência, saturação) e devolve **explicação**. Ela nunca inventa
  números.
- Scores (0–100): **Opportunity**, Demand, Competition, Saturation, Trend,
  Confidence. Veredito derivado do Opportunity Score:
  **SIM** (≥70, verde) · **TALVEZ** (≥45, amarelo) · **NÃO** (<45, vermelho).
- Mocks são determinísticos: a mesma consulta (tema + idioma + país) sempre
  devolve os mesmos números.

O mapa completo de onde cada número da UI virá na fase real está em
[`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

### Trocar mock ↔ real

`SERVICES_MODE` no `.env` (`"mock"` | `"real"`, padrão `real`). No modo
`real`, a **interpretação por IA usa a API da Anthropic**
(`claude-sonnet-5`): pontos do "Por quê", ângulos específicos do tema,
títulos e recomendação vêm do Claude — sempre citando os números do
ScoringEngine, nunca alterando-os. Sem `ANTHROPIC_API_KEY` (ou em caso
de erro na chamada), o sistema **cai no mock automaticamente** sem
quebrar a UI. Coleta/métricas continuam mock —
`src/services/real/README.md` documenta o que falta conectar.

Para ativar a IA: preencha `ANTHROPIC_API_KEY=` no arquivo **`.env.local`**
(nunca commitado) e reinicie o dev server.

Para ativar a **coleta real do YouTube**: preencha `YOUTUBE_API_KEY=` no
mesmo `.env.local` (Google Cloud Console, YouTube Data API v3 habilitada)
e reinicie. Uma análise nova custa **~204 unidades de quota** (2×
`search.list` = 200 + `videos.list`/`channels.list` ≈ 4); com o cache de
24h em SQLite, repetir um tema custa 0 — dá ~49 análises novas/dia no
tier gratuito de 10.000 unidades. Tendência continua estimada (selo
"estimado" na UI) até a fonte de tendências ser conectada.

**Quota do Radar** (medido): o Radar principal é **long-form (4min+)**
— por categoria são 2 buscas (`videoDuration=medium` e `long`), custo
de **~1.622 unidades** por varredura nova. O **Shorts Radar**
(`/radar/shorts`, fonte de ideias) usa 1 busca por categoria
(`videoDuration=short`): **~813 unidades**. Ambos aplicam pós-filtro de
duração real + "#shorts" no título + **filtro rígido de idioma**
(script Unicode + stopwords) e compartilham motor, cache (12h por
formato+par+janela) e o **teto diário do Radar de 8.000 unidades**
(`RADAR_DAILY_QUOTA_BUDGET`).

O filtro de conteúdo infantil (`madeForKids` via `part=status` no
`videos.list` já chamado) e a classificação "replicável" são
pós-processamento: **custo extra zero** — os valores por varredura não
mudam. Capacidade diária fresca dentro do teto: ~4 varreduras long-form
+ 1 de Shorts (≈ 7,3k) — os 7 pares long-form frescos custariam 11,4k e
não cabem. O botão de troca é `FORMAT_DURATIONS` em
`src/services/real/radar/radar-youtube-provider.ts`: remover `"long"`
(>20min) devolve o long-form a ~815u/varredura (7 pares ≈ 5,7k/dia), ao
custo de perder documentários longos da varredura.

### Migrar SQLite → Postgres

1. `prisma/schema.prisma`: `provider = "postgresql"`
2. `.env`: `DATABASE_URL` apontando para o Postgres
3. `npx prisma migrate dev`

Toda a persistência passa por `src/lib/repository.ts` — nenhum outro código
muda.

## Status

| Parte                                                    | Status           |
| -------------------------------------------------------- | ---------------- |
| Home (busca, idioma, país, chips de exemplo)             | **IMPLEMENTADO** |
| Histórico de análises (SQLite via Prisma)                | **IMPLEMENTADO** |
| Tela de resultado `/analysis/[id]` (todos os cards)      | **IMPLEMENTADO** |
| Skeleton loading, estado vazio, tratamento de erro       | **IMPLEMENTADO** |
| Tema escuro responsivo (desktop primeiro)                | **IMPLEMENTADO** |
| Pipeline do motor (7 etapas, contratos + injeção)        | **IMPLEMENTADO** |
| API `POST /api/analyses`                                 | **IMPLEMENTADO** |
| Interpretação por IA (Anthropic `claude-sonnet-5`, saída validada, fallback p/ mock) | **IMPLEMENTADO** |
| Coleta de dados (YouTube Data API v3: views, VPH, outliers, canais/inscritos; cache 24h; fallback p/ mock) | **IMPLEMENTADO** |
| Demand/Competition/Saturation com dados reais            | **IMPLEMENTADO** |
| Selo "estimado" nas métricas sem fonte real              | **IMPLEMENTADO** |
| Card "Ver dados brutos" (amostra com VPH, outliers, canais fortes) | **IMPLEMENTADO** |
| Card "Títulos que estão performando agora" (outliers reais por VPH) | **IMPLEMENTADO** |
| Aba **Radar** (/radar, long-form 4min+): vídeos estourando, canais novos explodindo, nichos em aquecimento; filtros de par idioma+país e janela 24h/7d/30d | **IMPLEMENTADO** |
| Aba **Shorts Radar** (/radar/shorts): fonte de ideias para adaptar em vídeos longos | **IMPLEMENTADO** |
| Filtro rígido de idioma + descarte de Shorts no long-form | **IMPLEMENTADO** |
| Exclusão de conteúdo infantil (madeForKids + heurística de título) | **IMPLEMENTADO** |
| Classificação "replicável" (dark/faceless) com selo e priorização nos blocos | **IMPLEMENTADO** |
| Radar em modo estrito por padrão (só replicáveis; toggle "mostrar todos") | **IMPLEMENTADO** |
| Penalidade forte: podcast/cortes, entrevistas, highlights, trailers, clipes musicais, canal com nome de pessoa (título+descrição+tags) | **IMPLEMENTADO** |
| Tabela CALIBRÁVEL de tier de RPM por categoria (src/lib/rpm.ts) ponderando "Nichos em aquecimento" | **IMPLEMENTADO** |
| Canais explodindo: filtro "grinder" (>20 vídeos, <1.000 inscritos) + score "acertou de primeira" (poucos vídeos × outlier recente × razão) + dados de julgamento no card | **IMPLEMENTADO** |
| 🌍 Verificador de Janela entre Idiomas (/window): mini-análise por mercado, veredito do motor (JANELA ABERTA/DISPUTADO/SATURADO), tradução e leitura por IA, ~102u/idioma, cache 24h, aviso de quota baixa | **IMPLEMENTADO** |
| Sementes do Radar reformuladas para formatos dark por categoria | **IMPLEMENTADO** |
| Home em painel (Radar em destaque, Analisar tema, Shorts Radar, Histórico) | **IMPLEMENTADO** |
| Radar: cache de varredura 12h + teto diário de quota (8.000u) | **IMPLEMENTADO** |
| IA guiada pelos padrões de título dos outliers reais     | **IMPLEMENTADO** (aviso de placeholder quando em fallback) |
| Outliers/fórmulas 100% long-form (Shorts excluídos dos padrões e do card) | **IMPLEMENTADO** |
| "Fórmulas de título deste nicho" (2–3 padrões nomeados com exemplo real literal; títulos referenciam a fórmula) | **IMPLEMENTADO** |
| Fonte de tendências (série de 12 semanas, sinais/país)   | **MOCK** (selo "estimado") |
| Pesos da normalização (a recalibrar com histórico real)  | **MOCK**         |
| Fórmulas de score (`src/services/mock/formulas.ts`)      | **MOCK**         |
| Ângulos/títulos sem chave da Anthropic (templates)       | **MOCK**         |
| Ranking de mercados                                      | **MOCK**         |
| Latência simulada (skeleton visível)                     | **MOCK**         |
| Coleta real (`data-collector` + `trends` em `services/real`) | **PLANEJADO** |
| Autenticação de usuários                                 | **PLANEJADO**    |
| Postgres (migração do SQLite)                            | **PLANEJADO**    |
| Pagamentos / planos                                      | **PLANEJADO**    |
| Mais idiomas/países além dos 6/7 da fase 1               | **PLANEJADO**    |
