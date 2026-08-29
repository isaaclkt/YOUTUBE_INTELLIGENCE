/**
 * Um vídeo da amostra coletada (real: YouTube Data API v3).
 * Persistido no resultado da análise para os cards "Ver dados brutos"
 * e "Títulos que estão performando agora".
 */
export interface SampleVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  /** null = canal com contagem de inscritos oculta. */
  subscribers: number | null;
  views: number;
  /** ISO 8601. */
  publishedAt: string;
  /** Views por hora desde a publicação. */
  vph: number;
  /** Performando muito acima da média do próprio canal. */
  isOutlier: boolean;
  /** Canal "forte" (muitos inscritos) — pesa na concorrência. */
  isStrongChannel: boolean;
}
