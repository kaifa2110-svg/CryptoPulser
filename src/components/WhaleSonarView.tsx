import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Crown,
  Lock,
  Pause,
  Play,
  Route,
  Search,
  Waves,
  X,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { buildFilteredWhaleSonar } from '../data/cryptoEngine';
import { Coin, CurrencyCode, FxRates, WhaleSignal, WhaleSignalType } from '../types/crypto';
import { formatCompactCurrency, formatPrice } from '../utils/formatters';
import { StealthValue } from './StealthText';

interface WhaleSonarViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  isPro: boolean;
  onOpenProModal: () => void;
  onSelectCoin: (coin: Coin) => void;
  onOpenAlertForCoin: (coin: Coin, kind?: 'price_above' | 'price_below' | 'whale_transfer') => void;
}

type SignalFilter = 'All Signals' | 'Exchange Inflows' | 'Exchange Outflows' | 'Smart Money Swaps';

const FILTER_MAP: Record<SignalFilter, WhaleSignalType | null> = {
  'All Signals': null,
  'Exchange Inflows': 'Exchange Inflow',
  'Exchange Outflows': 'Exchange Outflow',
  'Smart Money Swaps': 'Smart Money Swap',
};

export const WhaleSonarView: React.FC<WhaleSonarViewProps> = ({
  coins,
  currency,
  fxRates,
  isPro,
  onOpenProModal,
  onSelectCoin,
  onOpenAlertForCoin,
}) => {
  const { recordLookup, wipeVersion } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SignalFilter>('All Signals');
  const [isStreaming, setIsStreaming] = useState(true);
  const [tickOffset, setTickOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<20 | 25 | 30>(25);
  const [trailSignal, setTrailSignal] = useState<WhaleSignal | null>(null);

  useEffect(() => {
    setSearchQuery('');
    setTrailSignal(null);
  }, [wipeVersion]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      recordLookup('Whale Sonar', q);
    }, 650);
    return () => clearTimeout(t);
  }, [searchQuery, recordLookup]);

  useEffect(() => {
    if (!isStreaming || !isPro) return;
    const id = setInterval(() => {
      setTickOffset((t) => t + 1);
    }, 6500);
    return () => clearInterval(id);
  }, [isStreaming, isPro]);

  const { signals: baseSignals, summary } = useMemo(() => {
    const result = buildFilteredWhaleSonar(coins, searchQuery, 84);
    if (tickOffset === 0 || result.signals.length === 0) return result;
    const shift = tickOffset % result.signals.length;
    const rotated = [...result.signals.slice(shift), ...result.signals.slice(0, shift)].map(
      (sig, i) => ({
        ...sig,
        timestamp: new Date(Date.now() - i * 3.5 * 60 * 1000).toISOString(),
      })
    );
    return { signals: rotated, summary: result.summary };
  }, [coins, searchQuery, tickOffset]);

  const filteredSignals = useMemo(() => {
    const targetType = FILTER_MAP[filter];
    if (!targetType) return baseSignals;
    return baseSignals.filter((s) => s.signalType === targetType);
  }, [baseSignals, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredSignals.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);

  const visibleSignals = isPro
    ? filteredSignals.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
    : filteredSignals.slice(0, 3);

  const formatTime = (iso: string) => {
    const secs = Math.max(5, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  };

  const getSignalColor = (type: WhaleSignalType) => {
    if (type === 'Exchange Inflow') return 'text-rose-600 dark:text-rose-400';
    if (type === 'Exchange Outflow') return 'text-emerald-600 dark:text-emerald-400';
    return 'text-sky-600 dark:text-sky-400';
  };

  const QUICK_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XMR'];

  return (
    <div className="space-y-5 relative">
      {/* Header + Coin/Wallet Search Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Waves className="w-3.5 h-3.5 text-emerald-500" />
              <span>Pulser Whale Sonar™</span>
              <span aria-hidden="true">·</span>
              <span>Synced to Live {currency} Prices</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
              Real-Time Whale &amp; Smart Money Flow Tracker
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsStreaming((s) => !s)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
            >
              {isStreaming ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pause Sonar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Resume Sonar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1. Prominent Coin & Wallet Address Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search coin symbol/name (e.g. BTC, ETH, SOL, XMR, DOGE) or paste wallet address (0x...)"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_COINS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setSearchQuery(sym);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-semibold border cursor-pointer transition-colors ${
                  searchQuery.toUpperCase() === sym
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Entity / Coin Summary Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0B101C] p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-500 font-semibold">
              {summary.mode === 'wallet'
                ? 'Wallet Entity Summary'
                : summary.mode === 'coin'
                ? 'Coin Whale Summary'
                : 'Global Sonar Summary'}
            </div>
            <div className="font-display text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {summary.title}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {summary.subtitle}
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Traced Volume</div>
              <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                <StealthValue>{formatCompactCurrency(summary.totalVolumeUsd, currency, fxRates)}</StealthValue>
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Exchange Inflow</div>
              <div className="font-mono tabular-nums font-semibold text-rose-500 mt-0.5">
                <StealthValue>{formatCompactCurrency(summary.inflowUsd, currency, fxRates)}</StealthValue>
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Cold Outflow</div>
              <div className="font-mono tabular-nums font-semibold text-emerald-500 mt-0.5">
                <StealthValue>{formatCompactCurrency(summary.outflowUsd, currency, fxRates)}</StealthValue>
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Net Bias</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                {summary.netBiasLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Buttons + Row Density Selector */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All Signals', 'Exchange Inflows', 'Exchange Outflows', 'Smart Money Swaps'] as SignalFilter[]).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filter === f
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f}
                </button>
              )
            )}
          </div>

          {isPro && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-[11px]">
              <span className="px-2 text-slate-500 dark:text-slate-400">Show:</span>
              {([20, 25, 30] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setRowsPerPage(n);
                    setPage(1);
                  }}
                  className={`px-2 py-1 rounded font-mono font-semibold cursor-pointer ${
                    rowsPerPage === n
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signals Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                <th className="py-2.5 pl-4 pr-3">Time</th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Signal Type</th>
                <th className="py-2.5 px-3">Origin Entity</th>
                <th className="py-2.5 px-3">Destination</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Value ({currency})</th>
                <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {visibleSignals.map((sig) => {
                const matchedCoin = coins.find((c) => c.id === sig.coinId);
                return (
                  <tr
                    key={sig.id}
                    className="h-12 hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors"
                  >
                    <td className="pl-4 pr-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatTime(sig.timestamp)}
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => matchedCoin && onSelectCoin(matchedCoin)}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-500 cursor-pointer"
                      >
                        {sig.symbol}{' '}
                        <span className="font-mono font-normal text-slate-500 dark:text-slate-400">
                          {matchedCoin ? (
                            <StealthValue>{formatPrice(matchedCoin.priceUsd, currency, fxRates)}</StealthValue>
                          ) : (
                            ''
                          )}
                        </span>
                      </button>
                    </td>
                    <td className={`px-3 font-semibold whitespace-nowrap ${getSignalColor(sig.signalType)}`}>
                      {sig.signalType}
                    </td>
                    <td className="px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{sig.walletTag}</div>
                      <div className="font-mono text-[11px] text-slate-400">{sig.walletAddress}</div>
                    </td>
                    <td className="px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{sig.counterpartyTag}</div>
                      <div className="font-mono text-[11px] text-slate-400">{sig.counterpartyAddress}</div>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <StealthValue>
                        {sig.amountTokens >= 1000
                          ? sig.amountTokens.toLocaleString('en-US', { maximumFractionDigits: 0 })
                          : sig.amountTokens.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                        {sig.symbol}
                      </StealthValue>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <StealthValue>{formatCompactCurrency(sig.amountUsd, currency, fxRates)}</StealthValue>
                    </td>
                    <td className="pl-3 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {matchedCoin && (
                          <button
                            type="button"
                            onClick={() => onOpenAlertForCoin(matchedCoin, 'whale_transfer')}
                            title={`Set ${sig.symbol} Whale Alert`}
                            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-cyan-500 hover:bg-cyan-500/10 cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => (isPro ? setTrailSignal(sig) : onOpenProModal())}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Route className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Inspect Trail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. Pagination Tabs (Page 1, Page 2, Page 3...) for Pro */}
        {isPro ? (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Showing {(safePage - 1) * rowsPerPage + 1}–
              {Math.min(safePage * rowsPerPage, filteredSignals.length)} of {filteredSignals.length} signals
            </span>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold cursor-pointer transition-colors ${
                      safePage === p
                        ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Page {p}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0D1320] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Showing 3 Preview Signals · Unlock Full Pulser Whale Sonar™
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Browse 25–30 live whale transactions per page across multi-page streams and inspect full Sonar Trails.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenProModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Unlock Pulser Pro</span>
            </button>
          </div>
        )}
      </div>

      {/* Inspect Sonar Trail Slide-Over Drawer */}
      {trailSignal && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-sm"
          onClick={() => setTrailSignal(null)}
        >
          <aside
            className="w-full max-w-lg h-full bg-white dark:bg-[#0E1422] border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Sonar Trail Forensics · Block #{trailSignal.blockNumber.toLocaleString('en-US')}
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {trailSignal.symbol} ·{' '}
                    <StealthValue>{formatCompactCurrency(trailSignal.amountUsd, currency, fxRates)}</StealthValue>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTrailSignal(null)}
                  aria-label="Close Sonar Trail"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131B2E] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Signal Classification</span>
                  <span className={`font-semibold ${getSignalColor(trailSignal.signalType)}`}>
                    {trailSignal.signalType}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Liquidity Impact Score</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    {trailSignal.impactScore}/100
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
                  {trailSignal.impactNote}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Multi-Hop Execution Path ({trailSignal.trail.length} Hops)
                </h4>

                {trailSignal.trail.map((step) => (
                  <div
                    key={step.step}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111829] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-emerald-500">
                        Hop 0{step.step}
                      </span>
                      <span className="font-mono">{new Date(step.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                      <span className="truncate">{step.fromLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{step.toLabel}</span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{step.fromAddress}</span>
                      <span>{step.toAddress}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono tabular-nums text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">
                        <StealthValue>{formatCompactCurrency(step.amountUsd, currency, fxRates)}</StealthValue>
                      </span>
                      <span className="text-slate-400">
                        Tx {step.txHash.slice(0, 14)}... · Fee{' '}
                        <StealthValue>{formatPrice(step.feeUsd, currency, fxRates)}</StealthValue>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTrailSignal(null)}
              className="mt-6 w-full py-2.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Close Sonar Trail
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};
