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
│   ├── real/             # READMEs do que precisa ser conectado
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

`SERVICES_MODE` no `.env` (`"mock"` | `"real"`). O modo `real` ainda não
existe — `src/services/real/README.md` documenta o que conectar
(YouTube Data API v3, LLM, fonte de tendências).

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
| Coleta de dados (YouTube Data API)                       | **MOCK**         |
| Fonte de tendências (série de 12 semanas, sinais/país)   | **MOCK**         |
| Métricas e normalização                                  | **MOCK**         |
| Fórmulas de score (`src/services/mock/formulas.ts`)      | **MOCK**         |
| Interpretação por IA (explicação dos números)            | **MOCK**         |
| Ângulos, títulos e ranking de mercados                   | **MOCK**         |
| Latência simulada (skeleton visível)                     | **MOCK**         |
| Serviços reais (`SERVICES_MODE=real`)                    | **PLANEJADO**    |
| Autenticação de usuários                                 | **PLANEJADO**    |
| Postgres (migração do SQLite)                            | **PLANEJADO**    |
| Pagamentos / planos                                      | **PLANEJADO**    |
| Mais idiomas/países além dos 6/7 da fase 1               | **PLANEJADO**    |
