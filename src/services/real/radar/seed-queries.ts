import type { LanguageCode, NicheCategory } from "@/domain";

/**
 * Consultas-semente do Radar: 1 por categoria de nicho, por idioma.
 * O "|" é OR na busca do YouTube — cada consulta cobre a categoria
 * com 2–3 termos amplos. CADA consulta custa 100 unidades de quota,
 * então o nº de categorias é o principal fator de custo da varredura.
 */
export const RADAR_SEED_QUERIES: Record<
  LanguageCode,
  Record<NicheCategory, string>
> = {
  "pt-BR": {
    historia: "história|guerra mundial|civilização antiga",
    financas: "investimentos|renda extra|finanças pessoais",
    saude: "saúde|emagrecer|treino",
    curiosidades: "curiosidades|mistérios|fatos incríveis",
    automotivo: "carros|motos|mecânica",
    animais: "animais|pets|cachorro",
    comida: "receitas|comida|cozinha",
    religiao: "bíblia|estudo bíblico|oração",
  },
  en: {
    historia: "history|ancient civilization|world war",
    financas: "investing|personal finance|money",
    saude: "health|fitness|weight loss",
    curiosidades: "mysteries|amazing facts|unexplained",
    automotivo: "cars|motorcycles|mechanic",
    animais: "animals|pets|dogs",
    comida: "recipes|cooking|food",
    religiao: "bible|prayer|faith",
  },
  es: {
    historia: "historia|guerra mundial|civilizaciones antiguas",
    financas: "inversiones|finanzas personales|dinero",
    saude: "salud|bajar de peso|ejercicio",
    curiosidades: "curiosidades|misterios|datos increíbles",
    automotivo: "autos|coches|motos",
    animais: "animales|mascotas|perros",
    comida: "recetas|cocina|comida",
    religiao: "biblia|oración|fe",
  },
  it: {
    historia: "storia|guerra mondiale|civiltà antiche",
    financas: "investimenti|finanza personale|soldi",
    saude: "salute|dimagrire|allenamento",
    curiosidades: "curiosità|misteri|fatti incredibili",
    automotivo: "auto|moto|meccanica",
    animais: "animali|cani|gatti",
    comida: "ricette|cucina|cibo",
    religiao: "bibbia|preghiera|fede",
  },
  fr: {
    historia: "histoire|guerre mondiale|civilisations anciennes",
    financas: "investissement|finances personnelles|argent",
    saude: "santé|maigrir|musculation",
    curiosidades: "curiosités|mystères|faits incroyables",
    automotivo: "voitures|motos|mécanique",
    animais: "animaux|chiens|chats",
    comida: "recettes|cuisine|nourriture",
    religiao: "bible|prière|foi",
  },
  de: {
    historia: "geschichte|weltkrieg|antike zivilisationen",
    financas: "geldanlage|finanzen|geld verdienen",
    saude: "gesundheit|abnehmen|fitness",
    curiosidades: "kurioses|mysterien|unglaubliche fakten",
    automotivo: "autos|motorräder|werkstatt",
    animais: "tiere|hunde|katzen",
    comida: "rezepte|kochen|essen",
    religiao: "bibel|gebet|glaube",
  },
};
