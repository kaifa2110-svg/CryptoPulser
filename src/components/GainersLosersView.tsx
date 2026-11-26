import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  Flame,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface GainersLosersViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

type ChangeTimeframe = '1h' | '24h' | '7d';
type BoardSortKey = 'change' | 'price' | 'volume' | 'marketCap';

function getChangeByTimeframe(coin: Coin, timeframe: ChangeTimeframe): number {
  if (timeframe === '1h') return Number.isFinite(coin.change1h) ? coin.change1h : 0;
  if (timeframe === '7d') return Number.isFinite(coin.change7d) ? coin.change7d : 0;
  return Number.isFinite(coin.change24h) ? coin.change24h : 0;
}

const MIN_24H_VOLUME_USD = 1_000_000;
const STABLECOIN_SYMBOLS = new Set([
  'USDT',
  'USDC',
  'FDUSD',
  'TUSD',
  'USDP',
  'DAI',
  'BUSD',
  'PYUSD',
  'USDE',
  'USD1',
  'RLUSD',
  'EURC',
]);

export const GainersLosersView: React.FC<GainersLosersViewProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const [timeframe, setTimeframe] = useState<ChangeTimeframe>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [gainerSort, setGainerSort] = useState<{ key: BoardSortKey; dir: 'asc' | 'desc' }>({
    key: 'change',
    dir: 'desc',
  });
  const [loserSort, setLoserSort] = useState<{ key: BoardSortKey; dir: 'asc' | 'desc' }>({
    key: 'change',
    dir: 'asc',
  });

  const eligibleRealCoins = useMemo(() => {
    return coins.filter((coin) => {
      if (!Number.isFinite(coin.priceUsd) || coin.priceUsd <= 0) return false;
      if (!Number.isFinite(coin.volume24hUsd) || coin.volume24hUsd < MIN_24H_VOLUME_USD) {
        return false;
      }
      if (
        coin.category === 'Stablecoin' ||
        STABLECOIN_SYMBOLS.has(coin.symbol.toUpperCase())
      ) {
        return false;
      }
      return true;
    });
  }, [coins]);

  const activePool = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return eligibleRealCoins.filter((coin) => {
      if (!q) return true;
      return (
        coin.name.toLowerCase().includes(q) ||
        coin.symbol.toLowerCase().includes(q) ||
        coin.category.toLowerCase().includes(q)
      );
    });
  }, [eligibleRealCoins, searchQuery]);

  const breadthStats = useMemo(() => {
    if (eligibleRealCoins.length === 0) {
      return {
        greenCount: 0,
        redCount: 0,
        greenPct: 0,
        topGainer: null as Coin | null,
        topLoser: null as Coin | null,
        avgTopGainerPct: 0,
        avgTopLoserPct: 0,
      };
    }

    let greenCount = 0;
    let redCount = 0;
    for (const c of eligibleRealCoins) {
      const val = getChangeByTimeframe(c, timeframe);
      if (val >= 0) greenCount += 1;
      else redCount += 1;
    }

    const sortedDesc = [...eligibleRealCoins].sort(
      (a, b) => getChangeByTimeframe(b, timeframe) - getChangeByTimeframe(a, timeframe)
    );
    const sortedAsc = [...eligibleRealCoins].sort(
      (a, b) => getChangeByTimeframe(a, timeframe) - getChangeByTimeframe(b, timeframe)
    );

    const top25G = sortedDesc.filter((c) => getChangeByTimeframe(c, timeframe) > 0).slice(0, 25);
    const top25L = sortedAsc.filter((c) => getChangeByTimeframe(c, timeframe) < 0).slice(0, 25);

    const avgTopGainerPct =
      top25G.length > 0
        ? top25G.reduce((acc, c) => acc + getChangeByTimeframe(c, timeframe), 0) / top25G.length
        : 0;
    const avgTopLoserPct =
      top25L.length > 0
        ? top25L.reduce((acc, c) => acc + getChangeByTimeframe(c, timeframe), 0) / top25L.length
        : 0;

    return {
      greenCount,
      redCount,
      greenPct: (greenCount / eligibleRealCoins.length) * 100,
      topGainer: top25G[0] || sortedDesc[0] || null,
      topLoser: top25L[0] || sortedAsc[0] || null,
      avgTopGainerPct,
      avgTopLoserPct,
    };
  }, [eligibleRealCoins, timeframe]);

  const sortRows = (
    list: Coin[],
    sortState: { key: BoardSortKey; dir: 'asc' | 'desc' }
  ): Coin[] => {
    const mult = sortState.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortState.key === 'price') return (a.priceUsd - b.priceUsd) * mult;
      if (sortState.key === 'volume') return (a.volume24hUsd - b.volume24hUsd) * mult;
      if (sortState.key === 'marketCap') return (a.marketCapUsd - b.marketCapUsd) * mult;
      return (getChangeByTimeframe(a, timeframe) - getChangeByTimeframe(b, timeframe)) * mult;
    });
  };

  const top25Gainers = useMemo(() => {
    const onlyPositive = activePool.filter((c) => getChangeByTimeframe(c, timeframe) > 0);
    const pool = onlyPositive.length > 0 ? onlyPositive : activePool;
    const positiveFirst = [...pool]
      .sort((a, b) => getChangeByTimeframe(b, timeframe) - getChangeByTimeframe(a, timeframe))
      .slice(0, 25);
    return sortRows(positiveFirst, gainerSort);
  }, [activePool, timeframe, gainerSort]);

  const top25Losers = useMemo(() => {
    const onlyNegative = activePool.filter((c) => getChangeByTimeframe(c, timeframe) < 0);
    const pool = onlyNegative.length > 0 ? onlyNegative : activePool;
    const negativeFirst = [...pool]
      .sort((a, b) => getChangeByTimeframe(a, timeframe) - getChangeByTimeframe(b, timeframe))
      .slice(0, 25);
    return sortRows(negativeFirst, loserSort);
  }, [activePool, timeframe, loserSort]);

  const toggleSort = (
    side: 'gainer' | 'loser',
    key: BoardSortKey
  ) => {
    const setter = side === 'gainer' ? setGainerSort : setLoserSort;
    setter((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
      }
      if (side === 'loser' && key === 'change') {
        return { key, dir: 'asc' };
      }
      return { key, dir: 'desc' };
    });
  };

  const renderSortIcon = (
    current: { key: BoardSortKey; dir: 'asc' | 'desc' },
    key: BoardSortKey
  ) => {
    if (current.key !== key) return null;
    return current.dir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  const tfLabel = timeframe.toUpperCase();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Top Gainers &amp; Top Losers Leaderboard
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-mono font-bold uppercase whitespace-nowrap">
                Top 25 Each · Min $1M 24h Vol · {eligibleRealCoins.length} Verified Coins
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time momentum scanners ranked strictly across {eligibleRealCoins.length.toLocaleString()} verified cryptocurrencies with &ge;$1M 24h liquidity. Click any coin for its live chart.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-0.5">
              {(['1h', '24h', '7d'] as ChangeTimeframe[]).map((tf) => {
                const active = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter ticker or name..."
                className="pl-8 pr-3 py-1.5 w-48 sm:w-56 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => breadthStats.topGainer && onSelectCoin(breadthStats.topGainer)}
            className="text-left rounded-lg border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 p-3 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>#1 {tfLabel} Gainer</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            {breadthStats.topGainer ? (
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CoinLogo coin={breadthStats.topGainer} size="sm" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {breadthStats.topGainer.symbol}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {formatPercent(getChangeByTimeframe(breadthStats.topGainer, timeframe))}
                </span>
              </div>
            ) : (
              <div className="mt-1.5 text-xs text-slate-400">--</div>
            )}
          </button>

          <button
            type="button"
            onClick={() => breadthStats.topLoser && onSelectCoin(breadthStats.topLoser)}
            className="text-left rounded-lg border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 p-3 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <span>#1 {tfLabel} Loser</span>
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            {breadthStats.topLoser ? (
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CoinLogo coin={breadthStats.topLoser} size="sm" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {breadthStats.topLoser.symbol}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-sm text-rose-600 dark:text-rose-400">
                  {formatPercent(getChangeByTimeframe(breadthStats.topLoser, timeframe))}
                </span>
              </div>
            ) : (
              <div className="mt-1.5 text-xs text-slate-400">--</div>
            )}
          </button>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Top 25 Avg Gain vs Loss ({tfLabel})
            </div>
            <div className="mt-1.5 flex items-center gap-3 font-mono tabular-nums text-sm font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatPercent(breadthStats.avgTopGainerPct)}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-rose-600 dark:text-rose-400">
                {formatPercent(breadthStats.avgTopLoserPct)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Market Breadth ({tfLabel})</span>
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {breadthStats.greenPct.toFixed(1)}% Green
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-rose-500/30 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, breadthStats.greenPct))}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>{breadthStats.greenCount} Advancing</span>
              <span>{breadthStats.redCount} Declining</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top 25 Gainers Leaderboard */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-emerald-500/5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top 25 Gainers ({tfLabel})
              </h3>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
              {top25Gainers.length} Assets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                  <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                  <th className="py-2.5 px-2">Asset</th>
                  <th className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('gainer', 'price')}
                      className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      Price {renderSortIcon(gainerSort, 'price')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('gainer', 'change')}
                      className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      {tfLabel} % {renderSortIcon(gainerSort, 'change')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('gainer', 'volume')}
                      className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      24h Vol {renderSortIcon(gainerSort, 'volume')}
                    </button>
                  </th>
                  <th className="py-2.5 pl-2 pr-4 text-right w-14">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {top25Gainers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No matching assets found for "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  top25Gainers.map((coin, index) => {
                    const pct = getChangeByTimeframe(coin, timeframe);
                    const isPos = pct >= 0;
                    return (
                      <tr
                        key={coin.id}
                        onClick={() => onSelectCoin(coin)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 pl-4 pr-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CoinLogo coin={coin} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                                  {coin.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{coin.rank}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {coin.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPrice(coin.priceUsd, currency, fxRates)}
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-mono tabular-nums font-bold text-[11px] ${
                              isPos
                                ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatPercent(pct)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatCompactCurrency(coin.volume24hUsd, currency, fxRates)}
                        </td>
                        <td className="py-2.5 pl-2 pr-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCoin(coin);
                            }}
                            title={`Open ${coin.symbol} chart`}
                            className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top 25 Losers Leaderboard */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-rose-500/5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top 25 Losers ({tfLabel})
              </h3>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
              {top25Losers.length} Assets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                  <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                  <th className="py-2.5 px-2">Asset</th>
                  <th className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('loser', 'price')}
                      className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      Price {renderSortIcon(loserSort, 'price')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('loser', 'change')}
                      className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      {tfLabel} % {renderSortIcon(loserSort, 'change')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('loser', 'volume')}
                      className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      24h Vol {renderSortIcon(loserSort, 'volume')}
                    </button>
                  </th>
                  <th className="py-2.5 pl-2 pr-4 text-right w-14">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {top25Losers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No matching assets found for "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  top25Losers.map((coin, index) => {
                    const pct = getChangeByTimeframe(coin, timeframe);
                    const isPos = pct >= 0;
                    return (
                      <tr
                        key={coin.id}
                        onClick={() => onSelectCoin(coin)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 pl-4 pr-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CoinLogo coin={coin} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                                  {coin.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{coin.rank}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {coin.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPrice(coin.priceUsd, currency, fxRates)}
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-mono tabular-nums font-bold text-[11px] ${
                              isPos
                                ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatPercent(pct)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatCompactCurrency(coin.volume24hUsd, currency, fxRates)}
                        </td>
                        <td className="py-2.5 pl-2 pr-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCoin(coin);
                            }}
                            title={`Open ${coin.symbol} chart`}
                            className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
