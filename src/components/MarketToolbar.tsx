import React from 'react';
import {
  Activity,
  Bookmark,
  Flame,
  Gauge,
  MessageSquareText,
  Moon,
  Newspaper,
  Radar,
  RefreshCw,
  Sun,
  TrendingUp,
  Waves,
} from 'lucide-react';
import { CurrencyCode, FxRates, GlobalMarketStats, NavTab } from '../types/crypto';
import { formatCompactCurrency, formatPercent } from '../utils/formatters';
import { StealthValue } from './StealthText';

interface MarketToolbarProps {
  globalStats: GlobalMarketStats;
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  fxRates: FxRates;
  isDark: boolean;
  onToggleTheme: () => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  watchlistCount: number;
  isPro: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const TABS: Array<{ id: NavTab; label: string; pro?: boolean; icon: React.ReactNode }> = [
  { id: 'top1000', label: 'Top 1000', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'watchlist', label: 'Watchlist', icon: <Bookmark className="w-3.5 h-3.5" /> },
  { id: 'altcoins', label: 'Altcoins Index', icon: <Gauge className="w-3.5 h-3.5" /> },
  { id: 'news', label: 'Latest Crypto News', icon: <Newspaper className="w-3.5 h-3.5" /> },
  { id: 'pulser-square', label: 'Pulser Square', icon: <MessageSquareText className="w-3.5 h-3.5" /> },
  { id: 'bubble-radar', label: 'Bubble Radar', pro: true, icon: <Radar className="w-3.5 h-3.5" /> },
  { id: 'whale-sonar', label: 'Whale Sonar', pro: true, icon: <Waves className="w-3.5 h-3.5" /> },
];

export const MarketToolbar: React.FC<MarketToolbarProps> = ({
  globalStats,
  currency,
  onChangeCurrency,
  fxRates,
  isDark,
  onToggleTheme,
  activeTab,
  onSelectTab,
  watchlistCount,
  isPro,
  isRefreshing,
  onRefresh,
}) => {
  const mcapPositive = globalStats.marketCapChange24h >= 0;

  return (
    <section className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#0C111D]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        {/* Global Market Metrics & Controls */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/70 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Market Cap:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                <StealthValue>
                  {formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates)}
                </StealthValue>
              </span>
              <span
                className={`font-mono tabular-nums font-medium ${
                  mcapPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatPercent(globalStats.marketCapChange24h)}
              </span>
            </div>

            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>

            <div className="flex items-center gap-1.5">
              <span>24h Vol:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                <StealthValue>
                  {formatCompactCurrency(globalStats.totalVolume24hUsd, currency, fxRates)}
                </StealthValue>
              </span>
            </div>

            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>

            <div className="flex items-center gap-1.5">
              <span>Dominance:</span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                BTC {globalStats.btcDominance.toFixed(1)}% · ETH {globalStats.ethDominance.toFixed(1)}%
              </span>
            </div>

            <span className="hidden lg:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>

            <div className="hidden lg:flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>Altcoin Season:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {globalStats.altcoinSeasonIndex}/100
              </span>
            </div>

            <span className="hidden xl:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>

            <div className="hidden xl:flex items-center gap-1.5">
              <span>Sentiment:</span>
              <span className="font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                {globalStats.fearGreedValue} ({globalStats.fearGreedLabel})
              </span>
            </div>
          </div>

          {/* Right workspace controls: Refresh, Currency, Theme */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh live prices"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
              <span>Sync</span>
            </button>

            <div
              className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-0.5"
              role="group"
              aria-label="Currency selector"
            >
              {(['USD', 'PKR', 'EUR', 'AED', 'INR'] as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeCurrency(code)}
                  className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currency === code
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 7 Main Navigation Tabs */}
        <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'watchlist' && watchlistCount > 0 && (
                  <span className="font-mono tabular-nums opacity-75">({watchlistCount})</span>
                )}
                {tab.pro && !isPro && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 dark:text-amber-400">
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
