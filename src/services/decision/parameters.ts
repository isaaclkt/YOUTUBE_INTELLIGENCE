/**
 * ============================================================
 * MOTOR DE DECISÃO V2 — PARÂMETROS
 *
 * Limiares OPERACIONAIS declarados, não constantes empíricas.
 * Ajustáveis por variável de ambiente para calibração futura;
 * valor inválido ou ausente cai no padrão.
 *
 * A métrica decisiva é a CONCENTRAÇÃO (C). O alcance do entrante
 * é contextual e não participa do score nem do veredito — a
 * validação com dados reais mostrou que ele mede sobretudo o porte
 * dos canais devolvidos pela busca, não a oportunidade do tema.
 * ============================================================
 */

function positiveEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Piso de views que define "desempenho relevante" para o número
 * CONTEXTUAL de M1 ("X de N vídeos ultrapassaram este piso").
 * Não é limiar de veredito.
 */
export function viewsFloor(): number {
  return positiveEnv("DECISION_VIEWS_FLOOR", 5_000);
}

/** Teto de inscritos para o canal contar como "entrante" no recorte de M1. */
export function newcomerMaxSubscribers(): number {
  return positiveEnv("DECISION_NEWCOMER_MAX_SUBS", 50_000);
}

/**
 * Janela de amostragem, em dias. Piso de 7 dias: antes disso o vídeo
 * ainda acumula views no pico inicial e não é comparável a um maduro.
 */
export const WINDOW_MIN_AGE_DAYS = 7;
export const WINDOW_MAX_AGE_DAYS = 90;

/** Limiares do veredito, na escala da concentração. */
export const VERDICT_LIMITS = {
  /** A partir daqui os três maiores canais capturam a audiência. */
  concentrationSaturated: 65,
  /** Abaixo daqui a audiência está pulverizada o bastante para SIM. */
  concentrationForYes: 50,
} as const;

/** Amostra mínima para que o motor aceite emitir qualquer veredito. */
export const MIN_SAMPLE = {
  /** Vídeos long-form na janela, após todos os filtros. */
  videos: 20,
  /** Canais distintos — abaixo disto a concentração não é interpretável. */
  distinctChannels: 4,
} as const;

/**
 * Observações mínimas para que o número CONTEXTUAL de M1 seja exibido.
 * Não bloqueia veredito: sem isso, M1 apenas não aparece.
 */
export const MIN_NEWCOMER_VIDEOS = 5;

/**
 * Critérios objetivos de qualidade da evidência.
 * Só entram grandezas que sustentam a concentração — contagem de
 * entrantes e inscritos ocultos passaram a ser contadores descritivos.
 */
export const EVIDENCE_CRITERIA = {
  high: { videos: 40, channels: 10, maxDiscardRatio: 0.1 },
  medium: { videos: 25, channels: 6, maxDiscardRatio: 0.2 },
  low: {
    videos: MIN_SAMPLE.videos,
    channels: MIN_SAMPLE.distinctChannels,
    maxDiscardRatio: 0.5,
  },
} as const;

/**
 * Reamostragem para o intervalo de incerteza da concentração.
 *
 * DETERMINÍSTICA POR CONSTRUÇÃO: os subconjuntos são enumerados por
 * uma progressão modular sobre a amostra ordenada por videoId. Não há
 * gerador pseudoaleatório nem semente — a mesma entrada produz sempre
 * exatamente os mesmos subconjuntos, e nenhum valor é inventado:
 * cada subconjunto contém apenas vídeos realmente observados.
 */
export const RESAMPLE = {
  /** Subconjuntos avaliados. */
  rounds: 400,
  /** Fração da amostra em cada subconjunto, em milésimos. */
  keepPerMille: 700,
  /**
   * Passos coprimos com o módulo. `strideA` precisa espalhar índices
   * PEQUENOS por toda a faixa de resíduos: um passo próximo do módulo
   * (ex.: 997 ≡ −3) agrupa os primeiros índices numa faixa estreita e
   * produz subconjuntos tudo-ou-nada em vez de 70% da amostra.
   * Com 371 a fração fica entre 0,67 e 0,76 para n de 21 a 79.
   */
  strideA: 371,
  strideB: 131,
  modulus: 1000,
} as const;

/** Faixas de exibição do score. O inteiro só ordena; a faixa comunica. */
export const SCORE_BANDS = [
  { min: 75, label: "Muito favorável" },
  { min: 60, label: "Favorável" },
  { min: 40, label: "Misto" },
  { min: 25, label: "Desfavorável" },
  { min: 0, label: "Muito desfavorável" },
] as const;

/**
 * Intervalo mínimo entre duas leituras para reportar variação
 * longitudinal. Abaixo disso o ruído domina.
 */
export const LONGITUDINAL_MIN_DAYS = 7;

/** Snapshot dos parâmetros em uso, exibido junto do resultado. */
export interface DecisionParameters {
  viewsFloor: number;
  newcomerMaxSubscribers: number;
  windowMinAgeDays: number;
  windowMaxAgeDays: number;
  concentrationSaturated: number;
  concentrationForYes: number;
}

export function currentParameters(): DecisionParameters {
  return {
    viewsFloor: viewsFloor(),
    newcomerMaxSubscribers: newcomerMaxSubscribers(),
    windowMinAgeDays: WINDOW_MIN_AGE_DAYS,
    windowMaxAgeDays: WINDOW_MAX_AGE_DAYS,
    concentrationSaturated: VERDICT_LIMITS.concentrationSaturated,
    concentrationForYes: VERDICT_LIMITS.concentrationForYes,
  };
}
