# YouTube Intelligence AI

> Painel de inteligência para uma operação de **vídeos longos dark
> (faceless)** no YouTube. Responde "vale a pena criar conteúdo sobre
> esse tema?", vigia o que está bombando e caça janelas entre idiomas.
> Nunca promete viralizar — **a decisão final é sempre sua.**

📄 Histórico de rodadas: [CHANGELOG.md](CHANGELOG.md) · Mapa de fontes
de dados: [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)

## O que a ferramenta faz

- **Analisa temas** com dados reais do YouTube (views, VPH, outliers,
  concorrência) e IA que interpreta — nunca inventa números.
- **Radar** do que está estourando AGORA por idioma/país, só long-form,
  só conteúdo replicável (dark), sem infantil/música/clipes.
- **Detecta nichos nascendo** (temas em 3+ canais distintos) e
  **canais em ascensão** (consistência, não viral isolado).
- **Verifica janela entre idiomas**: valida num mercado, caça espaço
  aberto nos outros (PT/EN/ES/IT/FR/DE).

## Mapa das telas

| Tela | Rota | O que mostra |
| --- | --- | --- |
| 🏠 Visão Geral | `/` | Resumo do dia (só cache/DB, zero quota) + próximo passo sugerido |
| 🔎 Analisar Tema | `/analisar` | Veredito SIM/TALVEZ/NÃO, 4 métricas, mercados, ângulos, títulos com fórmulas do nicho |
| 📡 Radar | `/radar` | Vídeos long-form estourando, canais explodindo, nichos em aquecimento (peso de RPM) |
| 🌱 Nichos Nascendo | `/radar/nichos` | Subnichos emergentes por clusters de títulos de outliers |
| 🚀 Canais em Ascensão | `/radar/canais` | Canais dark novos/médios com MÚLTIPLOS vídeos performando |
| 🎬 Shorts Radar | `/radar/shorts` | Fonte de ideias para adaptar em long-form |
| 🌍 Verificador de Janela | `/window?q=...` | Veredito por mercado: JANELA ABERTA / DISPUTADO / SATURADO |
| 🕘 Histórico | `/historico` | Últimas análises com veredito e score |
| ⚙️ Categorias | `/categorias` | Gerenciar categorias/sementes da varredura (SQLite) + custo estimado |

## Como rodar

Pré-requisito: Node.js 20+ (`winget install OpenJS.NodeJS.LTS`).

```bash
npm install          # postinstall gera o Prisma Client
cp .env.example .env # Windows: copy .env.example .env
npm run db:push      # cria o SQLite local
npm run dev          # http://localhost:3000
```

Chaves (opcionais — sem elas tudo roda em modo demonstrativo) no
`.env.local` (nunca commitado):

```
ANTHROPIC_API_KEY=   # interpretação por IA (claude-sonnet-5)
YOUTUBE_API_KEY=     # dados reais (YouTube Data API v3)
```

## Arquitetura (mock vs real)

```
src/
├── app/          # telas (App Router) — nunca importam mock/real direto
├── components/   # componentes pequenos, sem lógica de negócio
├── domain/       # tipos/entidades
├── lib/          # constantes, formatadores, repositório (Prisma), RPM
└── services/
    ├── contracts/  # interfaces do motor (a "constituição")
    ├── mock/       # implementações demonstrativas determinísticas
    ├── real/       # YouTube Data API + Anthropic (fallback p/ mock)
    ├── index.ts    # PONTO ÚNICO de injeção (SERVICES_MODE no .env)
    └── pipeline.ts # coleta → normaliza → métricas → scoring → IA
```

Regras fixas: números vêm 100% do motor (API/fórmulas); a IA só traduz,
nomeia e interpreta. Sem chave ou erro → fallback mock sem quebrar a UI.
SQLite local via Prisma (migração p/ Postgres = trocar o datasource).

## Custos de quota (YouTube: 10.000 unidades/dia grátis)

| Operação | Custo novo | Cache |
| --- | --- | --- |
| Análise de tema | ~204u | 24h por tema+idioma+país |
| Varredura Radar long-form | ~200u × categorias ativas (10 ativas ≈ 2.009u medido) | 12h por par+janela+sementes |
| Varredura Shorts | ~100u × categorias ativas | 12h |
| Nichos Nascendo | 0u (reusa a varredura) | 12h |
| Canais em Ascensão | ~12u (máx. 8 canais × ~1,3u) | 12h |
| Verificador de Janela | ~102u por idioma (3 padrão ≈ 306u) | 24h por tema+idioma |
| Visão Geral | 0u (só cache/DB) | — |

Proteções: **teto diário do Radar = 8.000u** (varreduras/canais);
janela e análises usam o orçamento geral, com aviso quando o saldo do
dia fica abaixo de 2.000u. A tela ⚙️ Categorias mostra o custo estimado
conforme o que estiver ativo. Contador diário global em `yt-quota:`.

## Status

| Parte | Status |
| --- | --- |
| Telas: painel, análise, radar (4 abas), janela, histórico, categorias | **IMPLEMENTADO** |
| Coleta real YouTube (views, VPH, outliers, canais, madeForKids) | **IMPLEMENTADO** |
| IA real (interpretação, fórmulas de título, traduções, nomes de nicho) | **IMPLEMENTADO** (fallback automático p/ mock) |
| Filtros dark: idioma rígido, infantil, podcast/cortes/trailers/clipes, grinder | **IMPLEMENTADO** |
| Categorias/sementes gerenciáveis (SQLite) + custo estimado | **IMPLEMENTADO** |
| Caches (12–24h) + tetos de quota + contador diário | **IMPLEMENTADO** |
| Tendência real (fonte de trends) — hoje estimada com selo | **MOCK** |
| Fórmulas de normalização/score (recalibrar com dados da operação) | **MOCK (calibrável)** |
| Postgres, auth, pagamentos, mais idiomas | **PLANEJADO** |

Constantes calibráveis marcadas com ⚠️ no código: tiers/pesos de RPM
(`src/lib/rpm.ts`), limiares de veredito da janela, grinder, outlier,
score de ascensão e listas do classificador replicável.
