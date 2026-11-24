import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Bell, ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import {
  formatCompactCurrency,
  formatPercent,
  formatPrice,
  formatSupply,
} from '../utils/formatters';
import { StealthValue } from './StealthText';

interface Top1000TableProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  watchlistIds: string[];
  onToggleWatchlist: (coinId: string) => void;
  onSelectCoin: (coin: Coin) => void;
  onOpenAlertForCoin: (coin: Coin) => void;
  isLoading: boolean;
}

type SortField = 'rank' | 'priceUsd' | 'change1h' | 'change24h' | 'change7d' | 'marketCapUsd' | 'volume24hUsd';

const SparklineSvg: React.FC<{ data: number[]; positive: boolean }> = ({ data, positive }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 104;
  const height = 28;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={positive ? '#10b981' : '#f43f5e'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const Top1000Table: React.FC<Top1000TableProps> = ({
  coins,
  currency,
  fxRates,
  watchlistIds,
  onToggleWatchlist,
  onSelectCoin,
  onOpenAlertForCoin,
  isLoading,
}) => {
  const { recordLookup, wipeVersion } = usePrivacy();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    setSearch('');
  }, [wipeVersion]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      recordLookup('Markets', q);
    }, 650);
    return () => clearTimeout(t);
  }, [search, recordLookup]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    coins.slice(0, 120).forEach((c) => set.add(c.category));
    return Array.from(set);
  }, [coins]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = coins.filter((c) => {
      const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        String(c.rank) === q
      );
    });

    return [...list].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [coins, search, categoryFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageCoins = filteredAndSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'rank' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-500" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-500" />
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Top 1000 Cryptocurrencies by Market Cap
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredAndSorted.length)} of{' '}
            <span className="font-mono tabular-nums">{filteredAndSorted.length}</span> assets · Click any row for live TradingView chart & stats
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search symbol, coin, rank..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by sector"
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Sectors' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
              <th className="py-2.5 pl-4 pr-2 w-9" aria-label="Watchlist" />
              <th
                onClick={() => handleSort('rank')}
                className="py-2.5 px-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
              >
                # <SortIndicator field="rank" />
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Asset</th>
              <th
                onClick={() => handleSort('priceUsd')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
              >
                Price ({currency}) <SortIndicator field="priceUsd" />
              </th>
              <th
                onClick={() => handleSort('change1h')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap hidden sm:table-cell"
              >
                1h % <SortIndicator field="change1h" />
              </th>
              <th
                onClick={() => handleSort('change24h')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
              >
                24h % <SortIndicator field="change24h" />
              </th>
              <th
                onClick={() => handleSort('change7d')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap hidden md:table-cell"
              >
                7d % <SortIndicator field="change7d" />
              </th>
              <th
                onClick={() => handleSort('marketCapUsd')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
              >
                Market Cap <SortIndicator field="marketCapUsd" />
              </th>
              <th
                onClick={() => handleSort('volume24hUsd')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap hidden lg:table-cell"
              >
                Volume (24h) <SortIndicator field="volume24hUsd" />
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap hidden xl:table-cell">
                Circulating Supply
              </th>
              <th className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap hidden md:table-cell">
                Last 7 Days
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
            {isLoading && coins.length === 0 ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="h-11 animate-pulse">
                  <td colSpan={11} className="px-4 py-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : pageCoins.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                  No assets matched your search filter. Try clearing your query or switching sectors.
                </td>
              </tr>
            ) : (
              pageCoins.map((coin) => {
                const isStarred = watchlistIds.includes(coin.id);
                return (
                  <tr
                    key={coin.id}
                    onClick={() => onSelectCoin(coin)}
                    className="h-11 hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors cursor-pointer group"
                  >
                    <td
                      className="pl-4 pr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onToggleWatchlist(coin.id)}
                          aria-label={isStarred ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`}
                          className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/60 cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 transition-colors ${
                              isStarred
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-400 group-hover:text-slate-500'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAlertForCoin(coin)}
                          aria-label={`Set price alert for ${coin.name}`}
                          title={`Set ${coin.symbol} Price Alert`}
                          className="p-1 rounded hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {coin.rank}
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2.5 min-w-[150px]">
                        {coin.image ? (
                          <img
                            src={coin.image}
                            alt={coin.symbol}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full shrink-0 bg-slate-800"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full shrink-0 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-[10px] font-bold">
                            {coin.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                              {coin.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {coin.symbol}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {coin.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <StealthValue>{formatPrice(coin.priceUsd, currency, fxRates)}</StealthValue>
                    </td>
                    <td
                      className={`px-3 text-right font-mono tabular-nums whitespace-nowrap hidden sm:table-cell ${
                        coin.change1h >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.change1h)}
                    </td>
                    <td
                      className={`px-3 text-right font-mono tabular-nums font-medium whitespace-nowrap ${
                        coin.change24h >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.change24h)}
                    </td>
                    <td
                      className={`px-3 text-right font-mono tabular-nums whitespace-nowrap hidden md:table-cell ${
                        coin.change7d >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.change7d)}
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      <StealthValue>{formatCompactCurrency(coin.marketCapUsd, currency, fxRates)}</StealthValue>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">
                      <StealthValue>{formatCompactCurrency(coin.volume24hUsd, currency, fxRates)}</StealthValue>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap hidden xl:table-cell">
                      <StealthValue>
                        {formatSupply(coin.circulatingSupply)} {coin.symbol}
                      </StealthValue>
                    </td>
                    <td className="pl-3 pr-4 text-right hidden md:table-cell">
                      <div className="inline-flex justify-end">
                        <SparklineSvg data={coin.sparkline7d} positive={coin.change7d >= 0} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (25 coins per page, up to 40 pages) */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          Page {safePage} of {totalPages} ({pageSize} rows/page)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
            let pageNum = idx + 1;
            if (totalPages > 5) {
              if (safePage <= 3) pageNum = idx + 1;
              else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + idx;
              else pageNum = safePage - 2 + idx;
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 rounded-md font-mono tabular-nums text-xs font-medium cursor-pointer transition-colors ${
                  safePage === pageNum
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
