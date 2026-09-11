import type { LanguageCode, RpmTier } from "@/domain";

/**
 * Categorias padrão do Radar — semeadas no SQLite na primeira leitura
 * e, a partir daí, gerenciadas pela tela ⚙️ Categorias (este arquivo
 * NÃO é mais lido pelas varreduras). Sementes no fraseado dark da
 * operação; tiers CALIBRÁVEIS com números reais do AdSense.
 */
export interface DefaultRadarCategory {
  slug: string;
  name: string;
  rpmTier: RpmTier;
  seeds: Record<LanguageCode, string>;
}

export const DEFAULT_RADAR_CATEGORIES: readonly DefaultRadarCategory[] = [
  {
    slug: "historia",
    name: "História",
    rpmTier: "high",
    seeds: {
      "pt-BR": "a história de|documentário completo|o que aconteceu com",
      en: "the history of|full documentary|what happened to",
      es: "la historia de|documental completo|qué pasó con",
      it: "la storia di|documentario completo|cosa è successo a",
      fr: "l'histoire de|documentaire complet|qu'est-il arrivé à",
      de: "die geschichte von|doku komplett|was geschah mit",
    },
  },
  {
    slug: "financas",
    name: "Finanças",
    rpmTier: "high",
    seeds: {
      "pt-BR": "dinheiro explicado|top 10 investimentos|ascensão e queda",
      en: "money explained|top 10 investments|rise and fall of",
      es: "dinero explicado|top 10 inversiones|auge y caída de",
      it: "soldi spiegati|top 10 investimenti|ascesa e caduta di",
      fr: "l'argent expliqué|top 10 investissements|grandeur et décadence",
      de: "geld erklärt|top 10 geldanlagen|aufstieg und fall von",
    },
  },
  {
    slug: "saude",
    name: "Saúde & fitness",
    rpmTier: "high",
    seeds: {
      "pt-BR": "o que acontece com seu corpo|saúde explicada|top alimentos",
      en: "what happens to your body|health explained|top foods",
      es: "qué le pasa a tu cuerpo|salud explicada|top alimentos",
      it: "cosa succede al tuo corpo|salute spiegata|top alimenti",
      fr: "ce qui arrive à votre corps|santé expliquée|top aliments",
      de: "was mit deinem körper passiert|gesundheit erklärt|top lebensmittel",
    },
  },
  {
    slug: "marcas-consumo",
    name: "Marcas & consumo",
    rpmTier: "high",
    seeds: {
      "pt-BR": "melhores e piores marcas de|quais marcas evitar|vale a pena essa marca",
      en: "best and worst brands|brands to avoid|worst products ranked",
      es: "mejores y peores marcas|qué marcas evitar|marcas que no valen la pena",
      it: "migliori e peggiori marche|marche da evitare|marche a confronto",
      fr: "meilleures et pires marques|marques à éviter|comparatif de marques",
      de: "beste und schlechteste marken|welche marken vermeiden|marken im vergleich",
    },
  },
  {
    slug: "casa-manutencao",
    name: "Casa & manutenção",
    rpmTier: "high",
    seeds: {
      "pt-BR": "climatização residencial|segurança residencial|melhor sistema para casa",
      en: "home security explained|hvac explained|best system for your home",
      es: "climatización para casa|seguridad para el hogar|mejor sistema para casa",
      it: "climatizzazione casa|sicurezza domestica|miglior impianto per casa",
      fr: "climatisation maison|sécurité maison|meilleur système pour la maison",
      de: "klimaanlage haus|sicherheit zuhause|bestes system fürs haus",
    },
  },
  {
    slug: "curiosidades",
    name: "Curiosidades & mistérios",
    rpmTier: "medium",
    seeds: {
      "pt-BR": "fatos que|top 10 mistérios|o mistério de",
      en: "facts about|top 10 mysteries|the mystery of",
      es: "datos que|top 10 misterios|el misterio de",
      it: "fatti che|top 10 misteri|il mistero di",
      fr: "faits que|top 10 mystères|le mystère de",
      de: "fakten die|top 10 mysterien|das geheimnis von",
    },
  },
  {
    slug: "automotivo",
    name: "Automotivo",
    rpmTier: "medium",
    seeds: {
      "pt-BR": "a história da marca|top 10 carros|como funciona o motor",
      en: "car brand history|top 10 cars|how engines work",
      es: "la historia de la marca|top 10 autos|cómo funciona el motor",
      it: "la storia del marchio|top 10 auto|come funziona il motore",
      fr: "l'histoire de la marque|top 10 voitures|comment fonctionne un moteur",
      de: "die geschichte der marke|top 10 autos|wie ein motor funktioniert",
    },
  },
  {
    slug: "animais",
    name: "Animais",
    rpmTier: "medium",
    seeds: {
      "pt-BR": "documentário animais|fatos sobre animais|os animais mais",
      en: "animal documentary|facts about animals|most dangerous animals",
      es: "documental animales|datos de animales|los animales más",
      it: "documentario animali|fatti sugli animali|gli animali più",
      fr: "documentaire animalier|faits sur les animaux|les animaux les plus",
      de: "tierdokumentation|fakten über tiere|die gefährlichsten tiere",
    },
  },
  {
    slug: "comida",
    name: "Comida & receitas",
    rpmTier: "medium",
    seeds: {
      "pt-BR": "como é feito|a história da comida|top 10 comidas",
      en: "how it's made food|food history|top 10 foods",
      es: "cómo se hace|la historia de la comida|top 10 comidas",
      it: "come si fa|la storia del cibo|top 10 cibi",
      fr: "comment c'est fait|l'histoire de la cuisine|top 10 plats",
      de: "wie es gemacht wird|die geschichte des essens|top 10 gerichte",
    },
  },
  {
    slug: "religiao",
    name: "Religião",
    rpmTier: "medium",
    seeds: {
      "pt-BR": "a história bíblica de|bíblia explicada|personagens da bíblia",
      en: "bible story of|bible explained|bible characters",
      es: "la historia bíblica de|biblia explicada|personajes de la biblia",
      it: "la storia biblica di|bibbia spiegata|personaggi della bibbia",
      fr: "l'histoire biblique de|la bible expliquée|personnages de la bible",
      de: "biblische geschichte von|bibel erklärt|personen der bibel",
    },
  },
];
