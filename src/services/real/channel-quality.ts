/**
 * ⚠️ CALIBRÁVEL — filtro de eficiência de canal.
 *
 * "Grinder sem tração": canal com MUITOS vídeos publicados e QUASE
 * NENHUM inscrito (ex.: 40 vídeos / 106 inscritos). O formato dele já
 * provou que não funciona — não é sinal de nicho aberto e sai por
 * padrão do bloco "Canais novos explodindo" e das contagens do
 * Verificador de Janela.
 */
export const GRINDER_MIN_VIDEOS = 20;
export const GRINDER_MAX_SUBSCRIBERS = 1_000;

export function isGrinderChannel(
  totalVideos: number,
  subscribers: number | null
): boolean {
  return (
    totalVideos > GRINDER_MIN_VIDEOS &&
    subscribers !== null &&
    subscribers < GRINDER_MAX_SUBSCRIBERS
  );
}
