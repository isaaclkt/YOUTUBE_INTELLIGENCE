# Mapa de fontes de dados

Cada número exibido na UI, de onde ele virá **de verdade** quando a fase mock
for substituída (`SERVICES_MODE=real`). Complementa os READMEs de
`src/services/real/`.

> **Estado (atualizado):** a coleta de vídeos/canais via YouTube Data API v3
> está **IMPLEMENTADA** (`src/services/real/data-collector/`) — VPH,
> outliers, concorrência e o proxy de demanda por engajamento já usam dados
> reais quando `YOUTUBE_API_KEY` está configurada, com cache de 24h e
> fallback para mock. **Tendência e sinais por país seguem mock** (selo
> "estimado" na UI) até a fonte de tendências ser contratada.

**Legenda de status:**

| Status                  | Significado                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| ✅ **API DIRETA**       | Vem direto de um campo da YouTube Data API v3                      |
| 🔧 **DERIVADO**         | Calculado internamente a partir de dados da YouTube Data API       |
| 🌐 **FONTE EXTERNA**    | Exige fonte além do YouTube (fornecedor escolhido ou em avaliação) |
| ⚠️ **SEM FONTE DEFINIDA** | Nenhum fornecedor/abordagem contratada — decisão em aberto       |

---

## 1. Matéria-prima: o que a YouTube Data API v3 entrega

| Endpoint        | Dado                                              | Campo                                  | Observações                                                                 |
| --------------- | ------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `search.list`   | IDs de vídeos do tema, filtráveis por país/idioma | `q`, `regionCode`, `relevanceLanguage`, `publishedAfter`, `order` | **100 unidades de quota por chamada** (a mais cara). Base de tudo.          |
| `search.list`   | Total estimado de vídeos do tema                  | `pageInfo.totalResults`                | Aproximado e instável — usar só como **ordem de grandeza**, nunca como número exato. |
| `videos.list`   | Views, likes, comentários por vídeo               | `statistics.viewCount/likeCount/commentCount` | 1 unidade para até 50 vídeos. Dislikes não existem mais.                     |
| `videos.list`   | Data de publicação, duração, tags, categoria      | `snippet.publishedAt`, `contentDetails.duration`, `snippet.tags` | Snapshot único — a API **não** dá histórico de views.                        |
| `channels.list` | Inscritos, total de vídeos e views do canal       | `statistics.subscriberCount/videoCount/viewCount` | `subscriberCount` é **arredondado** (3 algarismos significativos) — suficiente para índices 0–100. |

**O que a API NÃO entrega (nunca):** volume de busca, série histórica de
views, CTR/impressões/watch time (só no YouTube Analytics do **próprio**
canal), demografia de audiência de terceiros.

---

## 2. Números da tela de resultado, um a um

### Opportunity Score (0–100) — card de veredito e histórico

🔧 **DERIVADO (composto).** Não tem fonte própria: é uma média ponderada de
Demanda, Tendência, Concorrência e Saturação (pesos hoje em
`src/services/mock/formulas.ts`, a recalibrar com dados reais). Herda o
status das entradas — enquanto Demanda/Tendência dependerem de fonte não
contratada, ele carrega esse ⚠️ indiretamente.

### Demanda (0–100) — card de métrica

Composto de duas partes:

| Componente                                | Status | Fonte real                                                       |
| ----------------------------------------- | ------ | ---------------------------------------------------------------- |
| Interesse de busca médio (12 semanas)     | 🌐     | Fonte de tendências (ver Tendência abaixo)                       |
| Média/mediana de views dos top ~50 vídeos | 🔧     | `search.list` + `videos.list`                                    |
| Volume **absoluto** de busca (buscas/mês) | ⚠️     | Google Trends é relativo; volume absoluto exigiria DataForSEO/afins — **não decidido** se entra no produto |

### Concorrência (0–100) — card de métrica

🔧 **DERIVADO** por inteiro da YouTube Data API:

- nº de canais distintos nos resultados do tema (`search.list`);
- fatia de views do canal dominante (soma de views por canal ÷ total) (`videos.list`);
- força dos canais: inscritos médios/medianos (`channels.list`);
- ritmo de publicação dos concorrentes (`search.list` com `publishedAfter`).

### Saturação (0–100) — card de métrica

Parcialmente derivável:

| Componente                                   | Status | Fonte real                                                   |
| -------------------------------------------- | ------ | ------------------------------------------------------------ |
| Volume de vídeos existentes (ordem de grandeza) | 🔧  | `search.list` (`totalResults` + amostragem)                  |
| Novos uploads por semana                     | 🔧     | `search.list` com `publishedAfter`                           |
| Repetição real de conteúdo (títulos/formatos "iguais") | ⚠️ | Abordagem planejada: embeddings/LLM sobre títulos da amostra; modelo e pipeline **não definidos** |

### Tendência (0–100) + crescimento %/semana (citado em "Por que esse score?")

- Série semanal de interesse (12 semanas): 🌐 **FONTE EXTERNA**. Google
  Trends não tem API oficial; candidatos: **SerpAPI** (recomendação atual),
  DataForSEO, Glimpse. ⚠️ **Fornecedor ainda não contratado.**
- `trendMomentum` (0–100) e `growthRate` (%/semana): 🔧 derivados da série
  (comparação início/fim da janela — cálculo já implementado no
  `MetricsEngine`, hoje alimentado por mock).

### Confiança (%) — card de recomendação

🔧 **DERIVADO internamente, sem fonte externa.** Mede a qualidade da própria
coleta: tamanho da amostra de vídeos, série de tendências completa ou não,
erros/quota da API. Fórmula em `formulas.ts` (a recalibrar).

### Melhores mercados — score (0–100), interesse/país, concorrência/país

| Componente                    | Status | Fonte real                                                             |
| ----------------------------- | ------ | ---------------------------------------------------------------------- |
| Interesse de busca por país   | 🌐 ⚠️  | Tendências com recorte geográfico (mesmo fornecedor pendente acima)    |
| Concorrência local por país   | 🔧     | Repetir `search.list` com `regionCode` de cada um dos 7 países — custo 7×100 unidades por análise ⇒ **cache obrigatório** (TTL 24h) |
| Score do mercado (0–100)      | 🔧     | Fórmula interna (`computeMarketScore`)                                 |

### Ângulos pouco explorados — potencial ALTO/MÉDIO/BAIXO + motivo

⚠️ **SEM FONTE DEFINIDA (por completo).** Plano: clusterizar títulos da
amostra (embeddings) → detectar recortes com pouca cobertura → LLM nomeia a
lacuna; o potencial sai das métricas (demanda alta + cobertura baixa do
cluster). Hoje: templates mock. Os **motivos** citam números já calculados
(sem fonte nova).

### Títulos sugeridos + "por que funciona"

🌐 **LLM (Claude API)** — geração criativa condicionada às métricas e aos
ângulos. Nenhum número novo.

### "Por que esse score?" (3 pontos)

🌐 **LLM (Claude API)** explicando números **já calculados** — contrato
`AIInterpreter` proíbe inventar valores. Nenhuma fonte nova de dados.

### Histórico (score, data/hora)

Interno — SQLite (fase 1) / Postgres (futuro). Nenhuma fonte externa.

---

## 3. Métricas derivadas notáveis (receitas de cálculo)

| Métrica          | Receita                                                                | Status |
| ---------------- | ---------------------------------------------------------------------- | ------ |
| **VPH médio**    | `viewCount ÷ horas desde publishedAt` — velocidade média de vida       | 🔧 implementado |
| **VPH atual**    | Exige ≥2 snapshots próprios (polling periódico) ou fornecedor terceiro | ⚠️ **SEM FONTE DEFINIDA** — a API só dá o total acumulado |
| **Outlier score**| `viewCount do vídeo ÷ média de views por vídeo do canal` (channels.list, sem quota extra) — detecta vídeo fora da curva | 🔧 implementado |
| **Engajamento**  | `(likes + comentários) ÷ views`                                        | 🔧     |
| **Share do dominante** | maior soma de views por canal ÷ views totais da amostra          | 🔧     |

---

## 4. Resumo geral

| Número na UI                    | Onde aparece            | Status                       |
| ------------------------------- | ----------------------- | ---------------------------- |
| Opportunity Score               | Veredito, histórico     | 🔧 composto                  |
| Demanda                         | Métricas                | 🔧 + 🌐 (+ ⚠️ volume absoluto) |
| Concorrência                    | Métricas                | 🔧                           |
| Saturação                       | Métricas                | 🔧 (+ ⚠️ similaridade)        |
| Tendência                       | Métricas                | 🌐 ⚠️ fornecedor pendente     |
| Crescimento %/semana            | "Por que esse score?"   | 🔧 (sobre série 🌐)          |
| Confiança %                     | Recomendação final      | 🔧 interno                   |
| Score de mercado                | Melhores mercados       | 🔧 fórmula                   |
| Interesse de busca por país     | Melhores mercados       | 🌐 ⚠️ fornecedor pendente     |
| Concorrência local por país     | Melhores mercados       | 🔧 (quota alta ⇒ cache)      |
| Potencial do ângulo             | Ângulos pouco explorados | ⚠️ abordagem não fechada     |
| Data/hora e score no histórico  | Home                    | interno (banco)              |

---

## 5. Decisões em aberto (bloqueiam o `SERVICES_MODE=real`)

1. **Fornecedor de tendências** (SerpAPI vs DataForSEO vs Glimpse) — afeta
   Demanda, Tendência e Melhores mercados. É a decisão mais urgente.
2. **Volume absoluto de busca**: entra no produto ou ficamos só com
   interesse relativo? (Custo extra por análise se entrar.)
3. **VPH atual**: montar infra própria de snapshots ou comprar de terceiro?
4. **Similaridade de títulos** (saturação fina + detecção de ângulos):
   qual modelo de embeddings e onde roda.
5. **Orçamento de quota do YouTube** (10.000 unidades/dia grátis): 1 análise
   completa com 7 países ≈ 700+ unidades sem cache ⇒ política de cache e
   limite diário de análises precisam ser definidos juntos.
