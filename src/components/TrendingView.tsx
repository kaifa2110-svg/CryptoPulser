import React from 'react';
import { Flame, TrendingDown, TrendingUp, Volume2 } from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface TrendingViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

export const TrendingView: React.FC<TrendingViewProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const liquidPool = coins.slice(0, 250).filter((c) => c.category !== 'Stablecoin');

  const topGainers = [...liquidPool].sort((a, b) => b.change24h - a.change24h).slice(0, 8);
  const topLosers = [...liquidPool].sort((a, b) => a.change24h - b.change24h).slice(0, 8);
  const topVolume = [...liquidPool].sort((a, b) => b.volume24hUsd - a.volume24hUsd).slice(0, 8);
  const momentum7d = [...liquidPool].sort((a, b) => b.change7d - a.change7d).slice(0, 8);

  const renderList = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    items: Coin[],
    metricMode: '24h' | '7d' | 'vol'
  ) => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {items.map((coin) => {
          const pct = metricMode === '7d' ? coin.change7d : coin.change24h;
          return (
            <button
              key={coin.id}
              type="button"
              onClick={() => onSelectCoin(coin)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs text-slate-400 w-6 shrink-0">#{coin.rank}</span>
                <CoinLogo coin={coin} size="md" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {coin.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {coin.symbol} · {coin.category}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(coin.priceUsd, currency, fxRates)}
                </div>
                {metricMode === 'vol' ? (
                  <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                    Vol {formatCompactCurrency(coin.volume24hUsd, currency, fxRates)}
                  </div>
                ) : (
                  <div
                    className={`font-mono tabular-nums text-[11px] font-semibold ${
                      pct >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatPercent(pct)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {renderList(
        'Top 24h Gainers',
        'Strongest daily price appreciation across Top 250 assets',
        <TrendingUp className="w-4 h-4 text-emerald-500" />,
        topGainers,
        '24h'
      )}
      {renderList(
        '7-Day Momentum Leaders',
        'Sustained weekly outperformers by capital inflow',
        <Flame className="w-4 h-4 text-amber-500" />,
        momentum7d,
        '7d'
      )}
      {renderList(
        'Highest 24h Volume',
        'Deepest spot & derivatives turnover',
        <Volume2 className="w-4 h-4 text-sky-500" />,
        topVolume,
        'vol'
      )}
      {renderList(
        'Top 24h Pullbacks',
        'Largest 24-hour drawdowns in liquid markets',
        <TrendingDown className="w-4 h-4 text-rose-500" />,
        topLosers,
        '24h'
      )}
    </div>
  );
};
