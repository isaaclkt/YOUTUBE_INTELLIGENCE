import type { LanguageCode, NicheCategory } from "@/domain";

/**
 * Consultas-semente do Radar: 1 por categoria de nicho, por idioma,
 * REFORMULADAS para puxar formatos dark/replicáveis (documentário,
 * "história de", top 10, "o que aconteceu com", "como é feito") em vez
 * de temas amplos dominados por vlogs e personalidades.
 *
 * O "|" é OR na busca do YouTube. CADA consulta custa 100 unidades por
 * duração varrida, então o nº de categorias é o principal fator de
 * custo da varredura.
 */
export const RADAR_SEED_QUERIES: Record<
  LanguageCode,
  Record<NicheCategory, string>
> = {
  "pt-BR": {
    historia: "a história de|documentário completo|o que aconteceu com",
    financas: "dinheiro explicado|top 10 investimentos|ascensão e queda",
    saude: "o que acontece com seu corpo|saúde explicada|top alimentos",
    curiosidades: "fatos que|top 10 mistérios|o mistério de",
    automotivo: "a história da marca|top 10 carros|como funciona o motor",
    animais: "documentário animais|fatos sobre animais|os animais mais",
    comida: "como é feito|a história da comida|top 10 comidas",
    religiao: "a história bíblica de|bíblia explicada|personagens da bíblia",
  },
  en: {
    historia: "the history of|full documentary|what happened to",
    financas: "money explained|top 10 investments|rise and fall of",
    saude: "what happens to your body|health explained|top foods",
    curiosidades: "facts about|top 10 mysteries|the mystery of",
    automotivo: "car brand history|top 10 cars|how engines work",
    animais: "animal documentary|facts about animals|most dangerous animals",
    comida: "how it's made food|food history|top 10 foods",
    religiao: "bible story of|bible explained|bible characters",
  },
  es: {
    historia: "la historia de|documental completo|qué pasó con",
    financas: "dinero explicado|top 10 inversiones|auge y caída de",
    saude: "qué le pasa a tu cuerpo|salud explicada|top alimentos",
    curiosidades: "datos que|top 10 misterios|el misterio de",
    automotivo: "la historia de la marca|top 10 autos|cómo funciona el motor",
    animais: "documental animales|datos de animales|los animales más",
    comida: "cómo se hace|la historia de la comida|top 10 comidas",
    religiao: "la historia bíblica de|biblia explicada|personajes de la biblia",
  },
  it: {
    historia: "la storia di|documentario completo|cosa è successo a",
    financas: "soldi spiegati|top 10 investimenti|ascesa e caduta di",
    saude: "cosa succede al tuo corpo|salute spiegata|top alimenti",
    curiosidades: "fatti che|top 10 misteri|il mistero di",
    automotivo: "la storia del marchio|top 10 auto|come funziona il motore",
    animais: "documentario animali|fatti sugli animali|gli animali più",
    comida: "come si fa|la storia del cibo|top 10 cibi",
    religiao: "la storia biblica di|bibbia spiegata|personaggi della bibbia",
  },
  fr: {
    historia: "l'histoire de|documentaire complet|qu'est-il arrivé à",
    financas: "l'argent expliqué|top 10 investissements|grandeur et décadence",
    saude: "ce qui arrive à votre corps|santé expliquée|top aliments",
    curiosidades: "faits que|top 10 mystères|le mystère de",
    automotivo: "l'histoire de la marque|top 10 voitures|comment fonctionne un moteur",
    animais: "documentaire animalier|faits sur les animaux|les animaux les plus",
    comida: "comment c'est fait|l'histoire de la cuisine|top 10 plats",
    religiao: "l'histoire biblique de|la bible expliquée|personnages de la bible",
  },
  de: {
    historia: "die geschichte von|doku komplett|was geschah mit",
    financas: "geld erklärt|top 10 geldanlagen|aufstieg und fall von",
    saude: "was mit deinem körper passiert|gesundheit erklärt|top lebensmittel",
    curiosidades: "fakten die|top 10 mysterien|das geheimnis von",
    automotivo: "die geschichte der marke|top 10 autos|wie ein motor funktioniert",
    animais: "tierdokumentation|fakten über tiere|die gefährlichsten tiere",
    comida: "wie es gemacht wird|die geschichte des essens|top 10 gerichte",
    religiao: "biblische geschichte von|bibel erklärt|personen der bibel",
  },
};
