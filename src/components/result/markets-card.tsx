import type { Market } from "@/domain";
import { COUNTRY_FLAGS } from "@/lib/constants";
import { Card } from "../card";
import { ScoreBar } from "../score-bar";

/** Card "Melhores mercados" — ranking de 3 países. */
export function MarketsCard({ markets }: { markets: Market[] }) {
  return (
    <Card title="Melhores mercados">
      <ol className="space-y-4">
        {markets.map((market, index) => (
          <li key={market.country} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
              {index + 1}º
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-200">
                  {COUNTRY_FLAGS[market.country]} {market.countryName}
                </p>
                <p className="text-sm font-semibold tabular-nums text-zinc-300">
                  {market.score}
                  <span className="text-xs font-normal text-zinc-600">/100</span>
                </p>
              </div>
              <div className="mt-1.5">
                <ScoreBar value={market.score} colorClass="bg-sky-500" />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">{market.reason}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
