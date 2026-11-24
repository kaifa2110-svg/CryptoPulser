import React from 'react';
import { Bookmark, Star, ArrowRight } from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';

interface WatchlistViewProps {
  coins: Coin[];
  watchlistIds: string[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onToggleWatchlist: (coinId: string) => void;
  onSelectCoin: (coin: Coin) => void;
  onExploreMarkets: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  coins,
  watchlistIds,
  currency,
  fxRates,
  onToggleWatchlist,
  onSelectCoin,
  onExploreMarkets,
}) => {
  const watchedCoins = coins.filter((c) => watchlistIds.includes(c.id));

  if (watchedCoins.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Bookmark className="w-5 h-5" />
        </div>
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
          Your Watchlist is Empty
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 mb-5">
          Star any asset in the Top 1000 table or inside a Coin Detail Modal to track its live price, dominance, and 24h momentum here.
        </p>
        <button
          type="button"
          onClick={onExploreMarkets}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-semibold cursor-pointer hover:opacity-90"
        >
          <span>Explore Top 1000</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Tracked Watchlist
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {watchedCoins.length} starred assets · Persisted locally in your browser
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
              <th className="py-2.5 pl-4 pr-2 w-9" aria-label="Remove" />
              <th className="py-2.5 px-2">#</th>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3 text-right">Price ({currency})</th>
              <th className="py-2.5 px-3 text-right">24h %</th>
              <th className="py-2.5 px-3 text-right">7d %</th>
              <th className="py-2.5 px-3 text-right">Market Cap</th>
              <th className="py-2.5 pl-3 pr-4 text-right">Volume (24h)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
            {watchedCoins.map((coin) => (
              <tr
                key={coin.id}
                onClick={() => onSelectCoin(coin)}
                className="h-11 hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors cursor-pointer"
              >
                <td
                  className="pl-4 pr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(coin.id);
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Remove ${coin.name} from watchlist`}
                    className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/60 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </button>
                </td>
                <td className="px-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {coin.rank}
                </td>
                <td className="px-3">
                  <div className="flex items-center gap-2">
                    {coin.image ? (
                      <img
                        src={coin.image}
                        alt={coin.symbol}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-mono text-[10px] font-bold">
                        {coin.symbol.slice(0, 2)}
                      </div>
                    )}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{coin.name}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{coin.symbol}</span>
                  </div>
                </td>
                <td className="px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(coin.priceUsd, currency, fxRates)}
                </td>
                <td
                  className={`px-3 text-right font-mono tabular-nums font-medium ${
                    coin.change24h >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPercent(coin.change24h)}
                </td>
                <td
                  className={`px-3 text-right font-mono tabular-nums ${
                    coin.change7d >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPercent(coin.change7d)}
                </td>
                <td className="px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {formatCompactCurrency(coin.marketCapUsd, currency, fxRates)}
                </td>
                <td className="pl-3 pr-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {formatCompactCurrency(coin.volume24hUsd, currency, fxRates)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
