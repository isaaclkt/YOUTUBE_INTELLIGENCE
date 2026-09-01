import type {
  EmergingNiche,
  LanguageCode,
  NicheCategory,
  NicheTrend,
  RadarVideo,
} from "@/domain";
import { STOPWORDS } from "./real/radar/language-filter";

/**
 * ============================================================
 * ⚠️  MOTOR DE NICHOS NASCENDO — regras CALIBRÁVEIS
 *
 * Extrai temas recorrentes (n-gramas 2–4 palavras) dos títulos dos
 * outliers long-form replicáveis. Um tema só vira "nicho nascendo"
 * quando aparece em MÚLTIPLOS canais distintos — 1 canal só é um
 * canal bombando, não um nicho. Todos os números vêm da API; a IA
 * apenas dá nome legível aos clusters.
 * ============================================================
 */

/** CALIBRÁVEL: canais distintos mínimos para ser nicho de verdade. */
export const NICHE_MIN_CHANNELS = 3;
export const NICHE_MAX_RESULTS = 12;
const NGRAM_MIN_WORDS = 2;
const NGRAM_MAX_WORDS = 4;
const NGRAM_MIN_LENGTH = 7;
const EXAMPLES_PER_NICHE = 3;

/** Ruído genérico de títulos do YouTube, em todos os idiomas varridos. */
const GENERIC_NOISE = new Set([
  "video", "vídeo", "videos", "vídeos", "youtube", "canal", "channel",
  "parte", "part", "episodio", "episódio", "episode", "ep", "full",
  "completo", "completa", "complete", "official", "oficial", "shorts",
  "2023", "2024", "2025", "2026", "top", "the", "new", "novo", "nova",
]);

interface ClusterAccumulator {
  videos: Map<string, RadarVideo>;
  channels: Set<string>;
}

function tokenize(title: string): string[] {
  return (
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0)
  );
}

function isStop(token: string, stopSet: ReadonlySet<string>): boolean {
  return (
    stopSet.has(token) || GENERIC_NOISE.has(token) || /^\d+$/.test(token)
  );
}

/** N-grama válido: não começa/termina em stopword e tem ≥2 palavras "de conteúdo". */
function validNgram(tokens: string[], stopSet: ReadonlySet<string>): boolean {
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  if (isStop(first, stopSet) || isStop(last, stopSet)) return false;
  const contentWords = tokens.filter((t) => !isStop(t, stopSet)).length;
  if (contentWords < 2) return false;
  return tokens.join(" ").length >= NGRAM_MIN_LENGTH;
}

function modeCategory(videos: readonly RadarVideo[]): NicheCategory {
  const counts = new Map<NicheCategory, number>();
  for (const v of videos) {
    counts.set(v.category, (counts.get(v.category) ?? 0) + 1);
  }
  let best: NicheCategory = videos[0]?.category ?? "curiosidades";
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

/** Metade recente vs. metade anterior da janela → NEW/GROWING/STEADY. */
function computeTrend(
  videos: readonly RadarVideo[],
  windowHours: number,
  nowMs: number
): NicheTrend {
  const halfMs = (windowHours / 2) * 3_600_000;
  let recent = 0;
  let older = 0;
  for (const v of videos) {
    const age = nowMs - new Date(v.publishedAt).getTime();
    if (age <= halfMs) recent += 1;
    else older += 1;
  }
  if (older === 0) return "NEW";
  if (recent > older) return "GROWING";
  return "STEADY";
}

/** Extrai os nichos emergentes (tudo motor; displayName = termo bruto). */
export function extractEmergingNiches(
  videos: readonly RadarVideo[],
  options: {
    language: LanguageCode;
    windowHours: number;
    minChannels?: number;
    maxResults?: number;
    now?: Date;
  }
): EmergingNiche[] {
  const minChannels = options.minChannels ?? NICHE_MIN_CHANNELS;
  const maxResults = options.maxResults ?? NICHE_MAX_RESULTS;
  const nowMs = (options.now ?? new Date()).getTime();
  const stopSet = new Set(STOPWORDS[options.language]);

  // 1. Acumula n-gramas → vídeos/canais que os contêm.
  const clusters = new Map<string, ClusterAccumulator>();
  for (const video of videos) {
    const tokens = tokenize(video.title);
    const seenInVideo = new Set<string>();
    for (let n = NGRAM_MIN_WORDS; n <= NGRAM_MAX_WORDS; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const gram = tokens.slice(i, i + n);
        if (!validNgram(gram, stopSet)) continue;
        const term = gram.join(" ");
        if (seenInVideo.has(term)) continue;
        seenInVideo.add(term);
        const acc = clusters.get(term) ?? {
          videos: new Map(),
          channels: new Set(),
        };
        acc.videos.set(video.videoId, video);
        acc.channels.add(video.channelId);
        clusters.set(term, acc);
      }
    }
  }

  // 2. Suporte mínimo: 3+ canais distintos.
  const candidates = [...clusters.entries()]
    .filter(([, acc]) => acc.channels.size >= minChannels)
    // Termos mais longos (mais específicos) primeiro; depois suporte.
    .sort(
      (a, b) =>
        b[0].split(" ").length - a[0].split(" ").length ||
        b[1].channels.size - a[1].channels.size
    );

  // 3. Poda: descarta termo cujo conjunto de vídeos já está coberto
  //    por um termo mantido mais específico.
  const kept: Array<[string, ClusterAccumulator]> = [];
  for (const candidate of candidates) {
    const [, acc] = candidate;
    const covered = kept.some(([, keptAcc]) =>
      [...acc.videos.keys()].every((id) => keptAcc.videos.has(id))
    );
    if (!covered) kept.push(candidate);
  }

  // 4. Monta os nichos e ranqueia.
  return kept
    .map(([term, acc]) => {
      const clusterVideos = [...acc.videos.values()];
      const avgVph =
        clusterVideos.reduce((sum, v) => sum + v.vph, 0) /
        clusterVideos.length;
      return {
        term,
        displayName: term.charAt(0).toUpperCase() + term.slice(1),
        parentCategory: modeCategory(clusterVideos),
        channelCount: acc.channels.size,
        videoCount: clusterVideos.length,
        avgVph: Math.round(avgVph * 10) / 10,
        trend: computeTrend(clusterVideos, options.windowHours, nowMs),
        examples: [...clusterVideos]
          .sort((a, b) => b.vph - a.vph)
          .slice(0, EXAMPLES_PER_NICHE)
          .map((v) => ({
            videoId: v.videoId,
            title: v.title,
            channelTitle: v.channelTitle,
            vph: v.vph,
          })),
      };
    })
    .sort(
      (a, b) =>
        b.channelCount - a.channelCount ||
        b.videoCount - a.videoCount ||
        b.avgVph - a.avgVph
    )
    .slice(0, maxResults);
}
