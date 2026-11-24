import React from 'react';
import { Gauge, PieChart } from 'lucide-react';
import { Coin, CurrencyCode, FxRates, GlobalMarketStats } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';

interface AltcoinsIndexViewProps {
  coins: Coin[];
  globalStats: GlobalMarketStats;
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

export const AltcoinsIndexView: React.FC<AltcoinsIndexViewProps> = ({
  coins,
  globalStats,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const btc = coins.find((c) => c.symbol === 'BTC');
  const btc30d = btc?.change30d ?? 18;
  const indexVal = globalStats.altcoinSeasonIndex;

  const seasonLabel =
    indexVal >= 75
      ? 'Altcoin Season'
      : indexVal <= 25
      ? 'Bitcoin Season'
      : 'Rotation / Neutral';

  const topAlts = coins
    .filter((c) => c.symbol !== 'BTC' && c.category !== 'Stablecoin')
    .slice(0, 20)
    .sort((a, b) => b.change30d - a.change30d);

  const stableDom = coins
    .filter((c) => c.category === 'Stablecoin')
    .slice(0, 10)
    .reduce((acc, c) => acc + c.dominancePct, 0);
  const altDom = Math.max(0, 100 - globalStats.btcDominance - globalStats.ethDominance - stableDom);

  // Gauge arc math
  const angleDeg = -180 + (indexVal / 100) * 180;
  const rad = (angleDeg * Math.PI) / 180;
  const needleX = 120 + Math.cos(rad) * 76;
  const needleY = 115 + Math.sin(rad) * 76;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Altcoin Season Gauge */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-6 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-500" />
              <span>Altcoin Season Index</span>
            </h2>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              Top 50 vs BTC
            </span>
          </div>

          <svg viewBox="0 0 240 135" className="w-full max-w-[290px] my-2">
            <defs>
              <linearGradient id="seasonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M 28 115 A 92 92 0 0 1 212 115"
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 28 115 A 92 92 0 0 1 212 115"
              fill="none"
              stroke="url(#seasonGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${(indexVal / 100) * 289} 289`}
            />
            <line
              x1="120"
              y1="115"
              x2={needleX}
              y2={needleY}
              stroke="currentColor"
              className="text-slate-900 dark:text-white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="120" cy="115" r="6" className="fill-slate-900 dark:fill-white" />
            <text
              x="120"
              y="88"
              textAnchor="middle"
              className="fill-slate-900 dark:fill-white font-mono text-2xl font-bold"
            >
              {indexVal}
            </text>
          </svg>

          <div className="w-full text-center space-y-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {seasonLabel}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Triggered when 75%+ of the top 50 non-stablecoin assets outperform Bitcoin ({formatPercent(btc30d)} benchmark).
            </p>
          </div>
        </div>

        {/* Market Cap Dominance Breakdown */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-500" />
              <span>Market Capitalization Dominance</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Share of {formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates)}{' '}
              total digital asset market cap
            </p>
          </div>

          <div className="my-6 space-y-4">
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${globalStats.btcDominance}%` }}
                title={`BTC ${globalStats.btcDominance.toFixed(1)}%`}
              />
              <div
                className="bg-sky-500 h-full"
                style={{ width: `${globalStats.ethDominance}%` }}
                title={`ETH ${globalStats.ethDominance.toFixed(1)}%`}
              />
              <div
                className="bg-slate-400 dark:bg-slate-500 h-full"
                style={{ width: `${stableDom}%` }}
                title={`Stablecoins ${stableDom.toFixed(1)}%`}
              />
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${altDom}%` }}
                title={`Altcoins ${altDom.toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Bitcoin (BTC)</div>
                <div className="font-mono tabular-nums text-lg font-bold text-amber-500">
                  {globalStats.btcDominance.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Ethereum (ETH)</div>
                <div className="font-mono tabular-nums text-lg font-bold text-sky-500">
                  {globalStats.ethDominance.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Stablecoins</div>
                <div className="font-mono tabular-nums text-lg font-bold text-slate-500 dark:text-slate-300">
                  {stableDom.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Other Altcoins</div>
                <div className="font-mono tabular-nums text-lg font-bold text-emerald-500">
                  {altDom.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
            <span>BTC 30D Benchmark: {formatPercent(btc30d)}</span>
            <span className="font-mono tabular-nums">
              {topAlts.filter((c) => c.change30d > btc30d).length} of top 20 alts beating BTC
            </span>
          </div>
        </div>
      </div>

      {/* Relative Performance Bars */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5">
        <div className="mb-4">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Top Altcoin 30-Day Relative Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any asset to inspect live TradingView candlestick & fundamentals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topAlts.map((coin) => {
            const maxAbs = Math.max(100, ...topAlts.map((a) => Math.abs(a.change30d)));
            const barWidth = Math.min(100, Math.max(6, (Math.abs(coin.change30d) / maxAbs) * 100));
            const beatingBtc = coin.change30d > btc30d;
            return (
              <button
                key={coin.id}
                type="button"
                onClick={() => onSelectCoin(coin)}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {coin.name}
                    </span>
                    <span className="font-mono text-slate-500">{coin.symbol}</span>
                    {beatingBtc && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        · Outperforms BTC
                      </span>
                    )}
                  </div>
                  <div className="font-mono tabular-nums flex items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatPrice(coin.priceUsd, currency, fxRates)}
                    </span>
                    <span
                      className={`font-semibold ${
                        coin.change30d >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.change30d)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      coin.change30d >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
