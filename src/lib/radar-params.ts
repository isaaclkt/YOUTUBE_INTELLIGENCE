import type { CountryCode, LanguageCode, RadarWindow } from "@/domain";
import { RADAR_DEFAULT_WINDOW, RADAR_PAIRS, RADAR_WINDOWS } from "./constants";

export interface RadarParams {
  language: LanguageCode;
  country: CountryCode;
  window: RadarWindow;
}

/** Serializa um par para a query string (?pair=pt-BR~BR). */
export function pairKey(language: LanguageCode, country: CountryCode): string {
  return `${language}~${country}`;
}

/** Valida os searchParams do /radar, caindo nos defaults quando inválidos. */
export function parseRadarParams(searchParams: {
  pair?: string | string[];
  window?: string | string[];
}): RadarParams {
  const rawPair = Array.isArray(searchParams.pair)
    ? searchParams.pair[0]
    : searchParams.pair;
  const rawWindow = Array.isArray(searchParams.window)
    ? searchParams.window[0]
    : searchParams.window;

  const pair =
    RADAR_PAIRS.find((p) => pairKey(p.language, p.country) === rawPair) ??
    RADAR_PAIRS[0];
  const window =
    RADAR_WINDOWS.find((w) => w.key === rawWindow)?.key ??
    RADAR_DEFAULT_WINDOW;

  return { language: pair.language, country: pair.country, window };
}
