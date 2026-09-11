# CHANGELOG

Resumo de cada rodada de trabalho (mais recente primeiro).

## 11/09/2026 — Categorias gerenciáveis pela interface
- Tela **⚙️ Categorias** (`/categorias`): listar, adicionar, editar e
  ativar/desativar categorias do Radar, persistidas no SQLite
  (nome, sementes por idioma, tier de RPM, toggle).
- Novas categorias padrão nos 6 idiomas: **Marcas & consumo** e
  **Casa & manutenção** (fraseado dark adaptado por idioma).
- Varredura usa só as ativas; custo estimado exibido na tela
  (~100u por semente/busca) com alerta ao passar do teto; cache da
  varredura invalida sozinho ao editar categorias (hash na chave).
- README reescrito para leitura rápida + este CHANGELOG.
- Regra permanente: toda rodada termina com commit + push.

## 01/09/2026 — Painel diário + abas de inteligência
- **Redesign**: sidebar fixa responsiva e Visão Geral com saudação,
  5 cards de métrica (só cache/DB, zero quota) e "Próximo passo"
  do motor com frase da IA (cache 12h).
- **🌱 Nichos Nascendo**: clusters de n-gramas nos outliers long-form
  (3+ canais distintos = nicho real), tendência novo/crescendo/estável,
  IA só nomeia; custo extra zero (reusa cache do Radar).
- **🚀 Canais em Ascensão**: consistência via playlist de uploads
  (~1u/canal, máx. 8), filtros de porte; grinder e não-dark ficam fora.
- **🌍 Verificador de Janela**: mini-análise por mercado com veredito
  do motor (JANELA ABERTA/DISPUTADO/SATURADO), tradução e leitura por
  IA (~102u/idioma, cache 24h).
- Canais explodindo com filtro "grinder" + score "acertou de primeira";
  fórmulas de título do nicho extraídas pela IA dos outliers long-form;
  filtro dark endurecido (podcast/cortes/trailers/clipes/nome de pessoa)
  com modo estrito por padrão e peso de RPM nos nichos.

## 29/08/2026 — Radar
- Aba **📡 Radar** (varredura por categoria/idioma/país, ~814u→depois
  recalibrada), teto diário de 8.000u e cache de 12h.
- Recalibração long-form 4min+ (2 buscas por categoria), aba
  **🎬 Shorts Radar** separada, filtro rígido de idioma (script +
  stopwords), exclusão de conteúdo infantil, selo "replicável".
- Cards "Ver dados brutos" e "Títulos que estão performando agora";
  IA guiada pelos padrões reais de título do nicho.

## 28/08/2026 — Dados reais
- Coleta real via **YouTube Data API v3** (~204u/análise, cache 24h):
  VPH, outliers, concorrência reais para Demand/Competition/Saturation;
  Trend segue estimada (selo).
- Interpretação por IA real (**Anthropic claude-sonnet-5**, saída
  validada por Zod) com fallback automático para o mock.

## 27–28/08/2026 — Fase 1 (fundação)
- Next.js 16 + TS estrito + Tailwind 4 + Prisma/SQLite.
- Motor em 7 etapas com contratos e ponto único de injeção mock/real;
  telas de análise e histórico; publicação no GitHub.
