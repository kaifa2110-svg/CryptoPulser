import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { BlockchainNetwork, Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { NetworkFilterBar } from './NetworkFilterBar';

interface DerivativesViewProps {
  allCoins: Coin[];
  filteredCoins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  selectedNetwork: BlockchainNetwork;
  onSelectNetwork: (net: BlockchainNetwork) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onSelectCoin: (coin: Coin) => void;
}

type DerivSortField =
  | 'openInterestUsd'
  | 'oiChange24hPct'
  | 'derivativesVol24hUsd'
  | 'fundingRatePct'
  | 'longLiq24hUsd'
  | 'shortLiq24hUsd'
  | 'totalLiq24hUsd'
  | 'rank';

type LiqWindow = '1h' | '4h' | '12h' | '24h';

const WINDOW_SCALE: Record<LiqWindow, number> = {
  '1h': 0.09,
  '4h': 0.28,
  '12h': 0.62,
  '24h': 1,
};

export const DerivativesView: React.FC<DerivativesViewProps> = ({
  allCoins,
  filteredCoins,
  currency,
  fxRates,
  selectedNetwork,
  onSelectNetwork,
  activeFilterCount,
  onOpenFilters,
  onSelectCoin,
}) => {
  const [liqWindow, setLiqWindow] = useState<LiqWindow>('24h');
  const [sortField, setSortField] = useState<DerivSortField>('openInterestUsd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [hoveredTileId, setHoveredTileId] = useState<string | null>(null);
  const pageSize = 20;

  const scale = WINDOW_SCALE[liqWindow];

  const stats = useMemo(() => {
    const base = filteredCoins.length > 0 ? filteredCoins : allCoins;
    const totalOi = base.reduce((acc, c) => acc + c.openInterestUsd, 0);
    const totalDerivVol = base.reduce((acc, c) => acc + c.derivativesVol24hUsd, 0);
    const totalLongLiq = base.reduce((acc, c) => acc + c.longLiq24hUsd, 0) * scale;
    const totalShortLiq = base.reduce((acc, c) => acc + c.shortLiq24hUsd, 0) * scale;
    const totalLiq = totalLongLiq + totalShortLiq;
    const avgFunding =
      base.slice(0, 50).reduce((acc, c) => acc + c.fundingRatePct, 0) /
      Math.max(1, Math.min(50, base.length));

    return {
      totalOi,
      totalDerivVol,
      totalLongLiq,
      totalShortLiq,
      totalLiq,
      longPct: totalLiq > 0 ? (totalLongLiq / totalLiq) * 100 : 50,
      avgFunding,
    };
  }, [filteredCoins, allCoins, scale]);

  const heatmapCoins = useMemo(() => {
    return [...filteredCoins]
      .filter((c) => c.category !== 'Stablecoin')
      .sort((a, b) => b.totalLiq24hUsd - a.totalLiq24hUsd)
      .slice(0, 18);
  }, [filteredCoins]);

  const sortedCoins = useMemo(() => {
    return [...filteredCoins].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [filteredCoins, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedCoins.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageCoins = sortedCoins.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (field: DerivSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'rank' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const SortIndicator: React.FC<{ field: DerivSortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-500" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-500" />
    );
  };

  const hoveredCoin = heatmapCoins.find((c) => c.id === hoveredTileId) ?? heatmapCoins[0];

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Total Open Interest (OI)
          </div>
          <div className="mt-1.5 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatCompactCurrency(stats.totalOi, currency, fxRates)}
          </div>
          <div className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">
            Across {filteredCoins.length} matched perpetual markets
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            24h Derivatives Volume
          </div>
          <div className="mt-1.5 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatCompactCurrency(stats.totalDerivVol, currency, fxRates)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Perps & Futures turnover
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {liqWindow} Total Liquidations
          </div>
          <div className="mt-1.5 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatCompactCurrency(stats.totalLiq, currency, fxRates)}
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#EF4444]/25 overflow-hidden flex">
            <div
              className="h-full bg-[#22C55E]"
              style={{ width: `${stats.longPct.toFixed(1)}%` }}
            />
            <div
              className="h-full bg-[#EF4444]"
              style={{ width: `${(100 - stats.longPct).toFixed(1)}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#22C55E] font-semibold">
              Longs {formatCompactCurrency(stats.totalLongLiq, currency, fxRates)}
            </span>
            <span className="text-[#EF4444] font-semibold">
              Shorts {formatCompactCurrency(stats.totalShortLiq, currency, fxRates)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Avg 8h Funding Rate
          </div>
          <div
            className={`mt-1.5 font-mono tabular-nums text-xl font-bold ${
              stats.avgFunding >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {stats.avgFunding >= 0 ? '+' : ''}
            {stats.avgFunding.toFixed(4)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {stats.avgFunding >= 0 ? 'Longs pay shorts (bullish bias)' : 'Shorts pay longs (hedged)'}
          </div>
        </div>
      </div>

      {/* Interactive 24h Liquidation Heatmap Grid */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {liqWindow} Liquidation Heatmap Grid
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tile intensity reflects forced liquidation dominance (Green = Longs · Red = Shorts). Click any tile to inspect live chart.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1 self-start">
            {(['1h', '4h', '12h', '24h'] as LiqWindow[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setLiqWindow(w)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  liqWindow === w
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {heatmapCoins.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No derivatives assets match your current network or filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {heatmapCoins.map((coin, idx) => {
              const longLiq = coin.longLiq24hUsd * scale;
              const shortLiq = coin.shortLiq24hUsd * scale;
              const totalLiq = longLiq + shortLiq;
              const longDom = longLiq >= shortLiq;
              const isLarge = idx < 2;
              const isMedium = idx >= 2 && idx < 6;

              return (
                <button
                  key={coin.id}
                  type="button"
                  onMouseEnter={() => setHoveredTileId(coin.id)}
                  onClick={() => onSelectCoin(coin)}
                  className={`text-left rounded-xl p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                    isLarge
                      ? 'col-span-2 row-span-2 min-h-[144px]'
                      : isMedium
                      ? 'col-span-1 sm:col-span-2 min-h-[96px]'
                      : 'min-h-[88px]'
                  } ${
                    longDom
                      ? 'bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border-[#22C55E]/40 text-emerald-950 dark:text-emerald-100'
                      : 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border-[#EF4444]/40 text-rose-950 dark:text-rose-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm">{coin.symbol}</span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        longDom
                          ? 'bg-[#22C55E]/20 text-emerald-700 dark:text-[#22C55E]'
                          : 'bg-[#EF4444]/20 text-rose-700 dark:text-[#EF4444]'
                      }`}
                    >
                      {longDom ? 'Longs Liq' : 'Shorts Liq'}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="font-mono tabular-nums font-bold text-sm sm:text-base">
                      {formatCompactCurrency(totalLiq, currency, fxRates)}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono opacity-80">
                      <span>24h {formatPercent(coin.change24h)}</span>
                      <span>Fund {coin.fundingRatePct >= 0 ? '+' : ''}{coin.fundingRatePct.toFixed(3)}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {hoveredCoin && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Focused Tile: {hoveredCoin.name} ({hoveredCoin.symbol})
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                Spot {formatPrice(hoveredCoin.priceUsd, currency, fxRates)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
              <span>
                OI:{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {formatCompactCurrency(hoveredCoin.openInterestUsd, currency, fxRates)}
                </strong>
              </span>
              <span className="text-[#22C55E] font-semibold">
                Long Liq ({liqWindow}): {formatCompactCurrency(hoveredCoin.longLiq24hUsd * scale, currency, fxRates)}
              </span>
              <span className="text-[#EF4444] font-semibold">
                Short Liq ({liqWindow}): {formatCompactCurrency(hoveredCoin.shortLiq24hUsd * scale, currency, fxRates)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Derivatives OI & Liquidations Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>Open Interest, Funding & Liquidations</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showing {sortedCoins.length} perpetual markets · Click column headers to sort or click any asset to inspect chart
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenFilters}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto ${
                activeFilterCount > 0
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-mono text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <NetworkFilterBar
            coins={allCoins}
            selectedNetwork={selectedNetwork}
            onSelectNetwork={(net) => {
              onSelectNetwork(net);
              setPage(1);
            }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                <th
                  onClick={() => handleSort('rank')}
                  className="py-2.5 pl-4 pr-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  # <SortIndicator field="rank" />
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Contract Asset</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Price</th>
                <th
                  onClick={() => handleSort('openInterestUsd')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  Open Interest (OI) <SortIndicator field="openInterestUsd" />
                </th>
                <th
                  onClick={() => handleSort('oiChange24hPct')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  OI 24h % <SortIndicator field="oiChange24hPct" />
                </th>
                <th
                  onClick={() => handleSort('derivativesVol24hUsd')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  24h Deriv Vol <SortIndicator field="derivativesVol24hUsd" />
                </th>
                <th
                  onClick={() => handleSort('fundingRatePct')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  Funding (8h) <SortIndicator field="fundingRatePct" />
                </th>
                <th
                  onClick={() => handleSort('longLiq24hUsd')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap hidden md:table-cell"
                >
                  Long Liq (24h) <SortIndicator field="longLiq24hUsd" />
                </th>
                <th
                  onClick={() => handleSort('shortLiq24hUsd')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap hidden md:table-cell"
                >
                  Short Liq (24h) <SortIndicator field="shortLiq24hUsd" />
                </th>
                <th
                  onClick={() => handleSort('totalLiq24hUsd')}
                  className="py-2.5 pl-3 pr-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  Total Liq (24h) <SortIndicator field="totalLiq24hUsd" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {pageCoins.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No perpetual markets matched your current network or Pro filters.
                  </td>
                </tr>
              ) : (
                pageCoins.map((coin) => (
                  <tr
                    key={coin.id}
                    onClick={() => onSelectCoin(coin)}
                    className="h-11 hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors cursor-pointer"
                  >
                    <td className="pl-4 pr-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {coin.rank}
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        {coin.image ? (
                          <img
                            src={coin.image}
                            alt={coin.symbol}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-mono text-[9px] font-bold">
                            {coin.symbol.slice(0, 2)}
                          </div>
                        )}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {coin.symbol}PERP
                        </span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[110px] hidden sm:inline">
                          {coin.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatPrice(coin.priceUsd, currency, fxRates)}
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCompactCurrency(coin.openInterestUsd, currency, fxRates)}
                    </td>
                    <td
                      className={`px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                        coin.oiChange24hPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.oiChange24hPct)}
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatCompactCurrency(coin.derivativesVol24hUsd, currency, fxRates)}
                    </td>
                    <td
                      className={`px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        coin.fundingRatePct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {coin.fundingRatePct >= 0 ? '+' : ''}
                      {coin.fundingRatePct.toFixed(4)}%
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-[#22C55E] font-medium whitespace-nowrap hidden md:table-cell">
                      {formatCompactCurrency(coin.longLiq24hUsd, currency, fxRates)}
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-[#EF4444] font-medium whitespace-nowrap hidden md:table-cell">
                      {formatCompactCurrency(coin.shortLiq24hUsd, currency, fxRates)}
                    </td>
                    <td className="pl-3 pr-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCompactCurrency(coin.totalLiq24hUsd, currency, fxRates)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-mono text-slate-500 dark:text-slate-400">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
