import React from 'react';
import {
  Activity,
  ArrowUpDown,
  Bookmark,
  CircleDot,
  Flame,
  Gauge,
  Landmark,
  MessageSquareText,
  Moon,
  Newspaper,
  Radar,
  RefreshCw,
  Rocket,
  Share2,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates, GlobalMarketStats, NavTab } from '../types/crypto';
import { formatCompactCurrency, formatPercent } from '../utils/formatters';
import { GlobalSearchBar } from './GlobalSearchBar';

interface MarketToolbarProps {
  coins: Coin[];
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
  onOpenShareModal: () => void;
  onSelectCoin: (coin: Coin) => void;
}

const TABS: Array<{ id: NavTab; label: string; pro?: boolean; icon: React.ReactNode }> = [
  { id: 'top1000', label: 'Top 1000', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'crypto-bubbles', label: 'Crypto Bubbles', icon: <CircleDot className="w-3.5 h-3.5" /> },
  { id: 'gainers-losers', label: 'Gainers & Losers', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
  { id: 'watchlist', label: 'Watchlist', icon: <Bookmark className="w-3.5 h-3.5" /> },
  { id: 'altcoins', label: 'Altcoins Index', icon: <Gauge className="w-3.5 h-3.5" /> },
  { id: 'rwa', label: 'RWA Hub', icon: <Landmark className="w-3.5 h-3.5" /> },
  { id: 'ipo-launchpad', label: 'IPO / Launchpad', icon: <Rocket className="w-3.5 h-3.5" /> },
  { id: 'news', label: 'Latest Crypto News', icon: <Newspaper className="w-3.5 h-3.5" /> },
  { id: 'pulser-square', label: 'Pulser Square', icon: <MessageSquareText className="w-3.5 h-3.5" /> },
  { id: 'bubble-radar', label: 'Bubble Radar', pro: true, icon: <Radar className="w-3.5 h-3.5" /> },
];

export const MarketToolbar: React.FC<MarketToolbarProps> = ({
  coins,
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
  onOpenShareModal,
  onSelectCoin,
}) => {
  const mcapPositive = globalStats.marketCapChange24h >= 0;

  return (
    <section className="w-full border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#0C111D] overflow-x-clip">
      <div className="w-full max-w-[1440px] mx-auto px-4">
        {/* Global Market Metrics & Controls */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/70 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Market Cap:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates)}
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
                {formatCompactCurrency(globalStats.totalVolume24hUsd, currency, fxRates)}
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

          {/* Right workspace controls: Currency & Theme */}
          <div className="flex items-center gap-2 shrink-0 max-w-full">
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

        {/* Global Search Bar + Manual Refresh + Share Page Command Strip */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/80 dark:border-slate-800/70">
          <GlobalSearchBar
            coins={coins}
            currency={currency}
            fxRates={fxRates}
            onSelectCoin={onSelectCoin}
          />

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh live market prices, volume, and derivatives telemetry"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-[#101624] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : 'text-cyan-500'}`}
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenShareModal}
              title="Share market link, QR code, or save snapshot"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-[#101624] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* 8 Main Navigation Tabs */}
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

