/** Um título de vídeo sugerido para o tema analisado. */
export interface SuggestedTitle {
  title: string;
  /** Explicação de por que este título tende a funcionar. */
  whyItWorks: string;
  /** Nome da fórmula do nicho que este título segue (quando houver). */
  formulaName?: string;
}

/** Um padrão estrutural de título extraído dos outliers do nicho. */
export interface TitleFormula {
  /** Nome curto do padrão (ex.: "PERGUNTA + GUIA COMPLETO"). */
  name: string;
  /** A fórmula estrutural em si. */
  pattern: string;
  /** UM exemplo literal vindo dos outliers long-form reais. */
  realExample: string;
  /** O que o padrão entrega — por que gera clique neste nicho. */
  whyItWorks: string;
}
