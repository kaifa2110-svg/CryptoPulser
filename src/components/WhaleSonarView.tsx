import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  FileText,
  Loader2,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Wallet,
  Waves,
  X,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { buildFilteredWhaleSonar } from '../data/cryptoEngine';
import { Coin, CurrencyCode, FxRates, WhaleSignal, WhaleSignalType } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import {
  buildWalletXrayProfile,
  fetchLiveWalletRpc,
  hydrateLiveWalletProfile,
  LiveRpcWalletPayload,
  resolveLiveRpcAddress,
  validateWalletXrayQuery,
  WALLET_XRAY_PRESETS,
  WalletLedgerTimeframe,
  WalletLedgerTransaction,
  WalletLedgerTxType,
  WhaleTier,
} from '../utils/walletProfiler';
import { CoinLogo } from './CoinLogo';
import { StealthValue } from './StealthText';

interface WhaleSonarViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  isPro: boolean;
  onOpenProModal: () => void;
  onSelectCoin: (coin: Coin) => void;
  onOpenAlertForCoin: (coin: Coin, kind?: 'price_above' | 'price_below' | 'whale_transfer') => void;
  externalInspectWallet?: { address: string; nonce: number } | null;
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
  externalInspectWallet,
}) => {
  const { stealthMode, recordLookup, wipeVersion } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SignalFilter>('All Signals');
  const [isStreaming, setIsStreaming] = useState(true);
  const [tickOffset, setTickOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<20 | 25 | 30>(25);
  const [trailSignal, setTrailSignal] = useState<WhaleSignal | null>(null);

  // Wallet Address X-Ray / 1-Year Ledger state
  const [walletInput, setWalletInput] = useState<string>(
    externalInspectWallet?.address || WALLET_XRAY_PRESETS[0].ens || WALLET_XRAY_PRESETS[0].address
  );
  const [inspectedWalletQuery, setInspectedWalletQuery] = useState<string>(
    externalInspectWallet?.address || WALLET_XRAY_PRESETS[0].ens || WALLET_XRAY_PRESETS[0].address
  );
  const [walletError, setWalletError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isLoadingLiveWallet, setIsLoadingLiveWallet] = useState(false);
  const [liveRpcState, setLiveRpcState] = useState<{
    query: string;
    payload: LiveRpcWalletPayload | null;
  } | null>(null);

  // 1-Year Transaction History Ledger controls
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'All' | WalletLedgerTxType>('All');
  const [ledgerTimeframe, setLedgerTimeframe] = useState<WalletLedgerTimeframe>('1Y');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<WalletLedgerTransaction | null>(null);
  const [copiedTxHash, setCopiedTxHash] = useState(false);

  useEffect(() => {
    setSearchQuery('');
    setTrailSignal(null);
    setWalletInput('');
    setInspectedWalletQuery('');
    setWalletError(null);
    setLiveRpcState(null);
    setLedgerSearch('');
    setLedgerPage(1);
    setSelectedTx(null);
  }, [wipeVersion]);

  useEffect(() => {
    if (!externalInspectWallet?.address) return;
    setWalletInput(externalInspectWallet.address);
    setInspectedWalletQuery(externalInspectWallet.address);
    setWalletError(null);
    setLedgerPage(1);
    setSelectedTx(null);
  }, [externalInspectWallet?.address, externalInspectWallet?.nonce]);

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

  const isWalletSearch =
    searchQuery.trim().toLowerCase().startsWith('0x') || searchQuery.trim().length >= 16;

  const QUICK_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XMR'];

  // Fetch real live Ethereum & Solana RPC data whenever inspectedWalletQuery changes
  useEffect(() => {
    const query = inspectedWalletQuery.trim();
    if (!query || !resolveLiveRpcAddress(query)) {
      setLiveRpcState(null);
      setIsLoadingLiveWallet(false);
      return;
    }

    let cancelled = false;
    setIsLoadingLiveWallet(true);
    setLiveRpcState(null);

    fetchLiveWalletRpc(query).then((payload) => {
      if (cancelled) return;
      setLiveRpcState({ query, payload });
      setIsLoadingLiveWallet(false);
    });

    return () => {
      cancelled = true;
    };
  }, [inspectedWalletQuery]);

  const walletProfile = useMemo(() => {
    const q = inspectedWalletQuery.trim();
    if (!q) return null;
    if (liveRpcState && liveRpcState.query === q && liveRpcState.payload) {
      const hydrated = hydrateLiveWalletProfile(coins, q, liveRpcState.payload);
      if (hydrated) return hydrated;
    }
    return buildWalletXrayProfile(coins, q);
  }, [coins, inspectedWalletQuery, liveRpcState]);

  const handleInspectWallet = (rawAddress?: string) => {
    const candidate = (rawAddress ?? walletInput).trim();
    const check = validateWalletXrayQuery(candidate);
    if (!check.valid) {
      setWalletError(check.error || 'Please enter a valid wallet address.');
      return;
    }
    setWalletError(null);
    setWalletInput(candidate);
    setInspectedWalletQuery(candidate);
    setLedgerPage(1);
    setSelectedTx(null);
    recordLookup('Whale Sonar', candidate);
  };

  const handleClearWallet = () => {
    setWalletInput('');
    setInspectedWalletQuery('');
    setWalletError(null);
    setLiveRpcState(null);
    setSelectedTx(null);
  };

  const handleCopyWalletAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleCopyTxHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedTxHash(true);
      setTimeout(() => setCopiedTxHash(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const formatExactQuantity = (qty: number) => {
    if (!Number.isFinite(qty)) return '0';
    if (qty >= 1000) return qty.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (qty >= 1) return qty.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return qty.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  const formatLedgerDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart} · ${timePart}`;
  };

  const getTierClasses = (tier: WhaleTier) => {
    if (tier === 'Mega Whale') {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
    if (tier === 'Institutional') {
      return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
    }
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  };

  const getLedgerTxStyle = (action: WalletLedgerTxType) => {
    if (action === 'Inflow / Buy') {
      return {
        badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
        icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />,
      };
    }
    if (action === 'Outflow / Sell') {
      return {
        badge: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/25',
        icon: <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />,
      };
    }
    return {
      badge: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/25',
      icon: <RefreshCw className="w-3.5 h-3.5 text-sky-500" />,
    };
  };

  const TIMEFRAME_DAYS: Record<WalletLedgerTimeframe, number> = {
    '7D': 7,
    '30D': 30,
    '90D': 90,
    '1Y': 365,
  };

  const filteredLedgerTxs = useMemo(() => {
    if (!walletProfile) return [];
    const maxDays = TIMEFRAME_DAYS[ledgerTimeframe];
    const q = ledgerSearch.trim().toLowerCase();

    return walletProfile.ledgerTransactions.filter((tx) => {
      if (tx.daysAgo > maxDays) return false;
      if (ledgerTypeFilter !== 'All' && tx.action !== ledgerTypeFilter) return false;
      if (q) {
        const hay = `${tx.coin.symbol} ${tx.coin.name} ${tx.counterparty} ${tx.txHash} ${tx.action}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [walletProfile, ledgerTimeframe, ledgerTypeFilter, ledgerSearch]);

  const ledgerSummary = useMemo(() => {
    return filteredLedgerTxs.reduce(
      (acc, tx) => {
        if (tx.action === 'Inflow / Buy') acc.inflowUsd += tx.valueUsd;
        else if (tx.action === 'Outflow / Sell') acc.outflowUsd += tx.valueUsd;
        else acc.swapUsd += tx.valueUsd;
        return acc;
      },
      { inflowUsd: 0, outflowUsd: 0, swapUsd: 0 }
    );
  }, [filteredLedgerTxs]);

  const LEDGER_PAGE_SIZE = 10;
  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedgerTxs.length / LEDGER_PAGE_SIZE));
  const safeLedgerPage = Math.min(ledgerPage, ledgerTotalPages);
  const visibleLedgerTxs = filteredLedgerTxs.slice(
    (safeLedgerPage - 1) * LEDGER_PAGE_SIZE,
    safeLedgerPage * LEDGER_PAGE_SIZE
  );

  return (
    <div className="space-y-5 relative min-w-0">
      {/* Wallet Address X-Ray & 1-Year Transaction History Explorer */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Wallet className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>Wallet Address X-Ray &amp; 1-Year Transaction History</span>
              <span aria-hidden="true">·</span>
              <span>Live {currency} Valuation</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
              On-Chain Wallet Portfolio &amp; 365-Day Ledger Explorer
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {WALLET_XRAY_PRESETS.map((preset) => {
              const isActive =
                inspectedWalletQuery.trim().toLowerCase() === preset.address.toLowerCase() ||
                (preset.ens &&
                  inspectedWalletQuery.trim().toLowerCase() === preset.ens.toLowerCase());
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleInspectWallet(preset.ens || preset.address)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Direct Wallet Address Inspector Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInspectWallet();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={stealthMode ? 'password' : 'text'}
              value={walletInput}
              onChange={(e) => {
                setWalletInput(e.target.value);
                if (walletError) setWalletError(null);
              }}
              placeholder="Inspect any wallet address (0x742d..., Solana, BTC, or Vitalik.eth)"
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                stealthMode ? 'blur-[2px]' : ''
              }`}
            />
            {(walletInput || inspectedWalletQuery) && (
              <button
                type="button"
                onClick={handleClearWallet}
                aria-label="Clear wallet inspection"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoadingLiveWallet}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-70 text-slate-950 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            {isLoadingLiveWallet ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>{isLoadingLiveWallet ? 'Querying RPC...' : 'Inspect Wallet'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            Live zero-key RPC queries for any full Ethereum (<code className="font-mono">0x...</code>) or Solana base58 address.
          </span>
          <button
            type="button"
            onClick={() => handleInspectWallet('vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg')}
            className="font-mono text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            Test Live Solana Address
          </button>
        </div>

        {walletError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400">
            {walletError}
          </div>
        )}

        {/* 2. Complete Wallet Portfolio Holdings Card + 3. Full 1-Year Transaction Ledger */}
        {walletProfile && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101C] p-4 space-y-4 min-w-0">
            {/* Portfolio Summary Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isLoadingLiveWallet ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[11px] font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Fetching Live On-Chain RPC...</span>
                    </span>
                  ) : walletProfile.isLiveOnChain ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE ON-CHAIN DATA</span>
                      {walletProfile.liveSourceLabel && (
                        <span className="font-mono font-normal opacity-80">
                          · {walletProfile.liveSourceLabel}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                      Multi-Chain Model Fallback
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold">
                    <StealthValue>{walletProfile.entityTag}</StealthValue>
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getTierClasses(
                      walletProfile.tier
                    )}`}
                  >
                    {walletProfile.tier}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {walletProfile.network}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {walletProfile.ens && (
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      <StealthValue>{walletProfile.ens}</StealthValue>
                    </span>
                  )}
                  <span className="font-mono text-slate-500 dark:text-slate-400 break-all">
                    <StealthValue>{walletProfile.displayAddress}</StealthValue>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyWalletAddress(walletProfile.address)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total Net Worth ({currency})
                  </div>
                  <div className="font-mono tabular-nums text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatCompactCurrency(walletProfile.netWorthUsd, currency, fxRates)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    1Y Realized PnL ({currency})
                  </div>
                  <div
                    className={`font-mono tabular-nums text-base sm:text-lg font-bold mt-0.5 ${
                      walletProfile.realizedPnl1yUsd >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {walletProfile.realizedPnl1yUsd >= 0 ? '+' : ''}
                    {formatCompactCurrency(walletProfile.realizedPnl1yUsd, currency, fxRates)}
                    <span className="text-[11px] font-medium ml-1">
                      ({formatPercent(walletProfile.realizedPnl1yPct)})
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">24h PnL %</div>
                  <div
                    className={`font-mono tabular-nums text-base sm:text-lg font-bold mt-0.5 ${
                      walletProfile.pnl24hPct >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatPercent(walletProfile.pnl24hPct)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Held Assets</div>
                  <div className="font-mono tabular-nums text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {walletProfile.holdings.length} Tokens
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Holdings Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden min-w-0">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Asset Holdings Breakdown
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Synced with live 1,000-coin prices ({currency})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                      <th className="py-2.5 pl-4 pr-3">Token</th>
                      <th className="py-2.5 px-3 text-right">Exact Quantity</th>
                      <th className="py-2.5 px-3 text-right">Live Price</th>
                      <th className="py-2.5 px-3">Allocation %</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Total Value ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                    {walletProfile.holdings.map((holding) => (
                      <tr
                        key={holding.coin.id}
                        className="h-12 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="pl-4 pr-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectCoin(holding.coin)}
                            className="inline-flex items-center gap-2.5 text-left group cursor-pointer"
                          >
                            <CoinLogo coin={holding.coin} size="md" />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                                {holding.coin.name}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {holding.coin.symbol}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {formatExactQuantity(holding.quantity)} {holding.coin.symbol}
                        </td>
                        <td className="px-3 text-right whitespace-nowrap">
                          <div className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                            {formatPrice(holding.coin.priceUsd, currency, fxRates)}
                          </div>
                          <div
                            className={`font-mono tabular-nums text-[10px] ${
                              holding.coin.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {formatPercent(holding.coin.change24h)}
                          </div>
                        </td>
                        <td className="px-3 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-cyan-500"
                                style={{
                                  width: `${Math.min(100, Math.max(4, holding.allocationPct))}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300 w-12 text-right">
                              {holding.allocationPct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="pl-3 pr-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCompactCurrency(holding.valueUsd, currency, fxRates)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Full 1-Year (1Y) On-Chain Transaction History Ledger */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden min-w-0">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        1-Year On-Chain Transaction History Ledger
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        365-day indexed inflows, outflows &amp; DEX swaps · Click any Tx Hash (0x...) for receipt forensics
                      </p>
                    </div>
                  </div>

                  {/* Timeframe Pills (7D, 30D, 90D, 1Y) */}
                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1 self-start">
                    {(['7D', '30D', '90D', '1Y'] as WalletLedgerTimeframe[]).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          setLedgerTimeframe(tf);
                          setLedgerPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold cursor-pointer transition-colors ${
                          ledgerTimeframe === tf
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter Pills + Search Box */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['All', 'Inflow / Buy', 'Outflow / Sell', 'DEX Swap'] as const).map(
                      (typeOpt) => (
                        <button
                          key={typeOpt}
                          type="button"
                          onClick={() => {
                            setLedgerTypeFilter(typeOpt);
                            setLedgerPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                            ledgerTypeFilter === typeOpt
                              ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold'
                              : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {typeOpt}
                        </button>
                      )
                    )}
                  </div>

                  <div className="relative w-full md:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => {
                        setLedgerSearch(e.target.value);
                        setLedgerPage(1);
                      }}
                      placeholder="Filter token, DEX, or Tx Hash (0x...)"
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {ledgerSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setLedgerSearch('');
                          setLedgerPage(1);
                        }}
                        aria-label="Clear ledger filter"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Window Volume Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Matched Txs ({ledgerTimeframe})
                    </span>
                    <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {filteredLedgerTxs.length}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Inflow / Buy Volume
                    </span>
                    <div className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCompactCurrency(ledgerSummary.inflowUsd, currency, fxRates)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Outflow / Sell Volume
                    </span>
                    <div className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      {formatCompactCurrency(ledgerSummary.outflowUsd, currency, fxRates)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      DEX Swap Volume
                    </span>
                    <div className="font-mono tabular-nums font-semibold text-sky-600 dark:text-sky-400">
                      {formatCompactCurrency(ledgerSummary.swapUsd, currency, fxRates)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                      <th className="py-2.5 pl-4 pr-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Tx Type</th>
                      <th className="py-2.5 px-3">Token &amp; Amount</th>
                      <th className="py-2.5 px-3 text-right">Value ({currency})</th>
                      <th className="py-2.5 px-3">Counterparty / DEX</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                    {visibleLedgerTxs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                        >
                          No transactions matched your current {ledgerTimeframe} filter. Try expanding to 1Y or clearing search.
                        </td>
                      </tr>
                    ) : (
                      visibleLedgerTxs.map((tx) => {
                        const style = getLedgerTxStyle(tx.action);
                        return (
                          <tr
                            key={tx.id}
                            className="h-12 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="pl-4 pr-3 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatLedgerDateTime(tx.timestamp)}
                            </td>
                            <td className="px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${style.badge}`}
                              >
                                {style.icon}
                                <span>{tx.action}</span>
                              </span>
                            </td>
                            <td className="px-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onSelectCoin(tx.coin)}
                                className="inline-flex items-center gap-2 text-left group cursor-pointer"
                              >
                                <CoinLogo coin={tx.coin} size="sm" />
                                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                                  {formatExactQuantity(tx.quantity)} {tx.coin.symbol}
                                </span>
                                {tx.swapTargetSymbol && (
                                  <span className="font-mono text-[10px] text-slate-400">
                                    → {tx.swapTargetSymbol}
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatCompactCurrency(tx.valueUsd, currency, fxRates)}
                            </td>
                            <td className="px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {tx.counterparty}
                            </td>
                            <td className="pl-3 pr-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedTx(tx)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400 font-mono text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              >
                                <FileText className="w-3 h-3 text-cyan-500" />
                                <span>
                                  <StealthValue>{tx.shortTxHash}</StealthValue>
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ledger Pagination */}
              {filteredLedgerTxs.length > LEDGER_PAGE_SIZE && (
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Showing {(safeLedgerPage - 1) * LEDGER_PAGE_SIZE + 1}–
                    {Math.min(safeLedgerPage * LEDGER_PAGE_SIZE, filteredLedgerTxs.length)} of{' '}
                    {filteredLedgerTxs.length} transactions ({ledgerTimeframe})
                  </span>

                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeLedgerPage <= 1}
                      onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                      {safeLedgerPage} / {ledgerTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safeLedgerPage >= ledgerTotalPages}
                      onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

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
              type={stealthMode && isWalletSearch ? 'password' : 'text'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search coin symbol/name (e.g. BTC, ETH, SOL, XMR, DOGE) or paste wallet address (0x...)"
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                stealthMode && isWalletSearch ? 'blur-[2px]' : ''
              }`}
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
              {summary.mode === 'wallet' ? <StealthValue>{summary.title}</StealthValue> : summary.title}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {summary.mode === 'wallet' ? (
                <StealthValue>{summary.subtitle}</StealthValue>
              ) : (
                summary.subtitle
              )}
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Traced Volume</div>
              <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                {formatCompactCurrency(summary.totalVolumeUsd, currency, fxRates)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Exchange Inflow</div>
              <div className="font-mono tabular-nums font-semibold text-rose-500 mt-0.5">
                {formatCompactCurrency(summary.inflowUsd, currency, fxRates)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Cold Outflow</div>
              <div className="font-mono tabular-nums font-semibold text-emerald-500 mt-0.5">
                {formatCompactCurrency(summary.outflowUsd, currency, fxRates)}
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
                          {matchedCoin ? formatPrice(matchedCoin.priceUsd, currency, fxRates) : ''}
                        </span>
                      </button>
                    </td>
                    <td className={`px-3 font-semibold whitespace-nowrap ${getSignalColor(sig.signalType)}`}>
                      {sig.signalType}
                    </td>
                    <td className="px-3">
                      <button
                        type="button"
                        onClick={() => handleInspectWallet(sig.walletAddress)}
                        title="Inspect in Wallet Address X-Ray"
                        className="text-left group cursor-pointer"
                      >
                        <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-500 transition-colors">
                          {summary.mode === 'wallet' ? (
                            <StealthValue>{sig.walletTag}</StealthValue>
                          ) : (
                            sig.walletTag
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 group-hover:text-cyan-400 transition-colors">
                          {summary.mode === 'wallet' ? (
                            <StealthValue>{sig.walletAddress}</StealthValue>
                          ) : (
                            sig.walletAddress
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{sig.counterpartyTag}</div>
                      <div className="font-mono text-[11px] text-slate-400">{sig.counterpartyAddress}</div>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {sig.amountTokens >= 1000
                        ? sig.amountTokens.toLocaleString('en-US', { maximumFractionDigits: 0 })
                        : sig.amountTokens.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                      {sig.symbol}
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCompactCurrency(sig.amountUsd, currency, fxRates)}
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
                    {trailSignal.symbol} · {formatCompactCurrency(trailSignal.amountUsd, currency, fxRates)}
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
                      <span className="truncate">
                        {summary.mode === 'wallet' && step.step === 1 ? (
                          <StealthValue>{step.fromLabel}</StealthValue>
                        ) : (
                          step.fromLabel
                        )}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{step.toLabel}</span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {summary.mode === 'wallet' && step.step === 1 ? (
                          <StealthValue>{step.fromAddress}</StealthValue>
                        ) : (
                          step.fromAddress
                        )}
                      </span>
                      <span>{step.toAddress}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono tabular-nums text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">
                        {formatCompactCurrency(step.amountUsd, currency, fxRates)}
                      </span>
                      <span className="text-slate-400">
                        Tx {step.txHash.slice(0, 14)}... · Fee {formatPrice(step.feeUsd, currency, fxRates)}
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

      {/* Clickable Tx Hash On-Chain Receipt Inspector Drawer */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-sm"
          onClick={() => setSelectedTx(null)}
        >
          <aside
            className="w-full max-w-md h-full bg-white dark:bg-[#0E1422] border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    On-Chain Tx Receipt · Block #{selectedTx.blockNumber.toLocaleString('en-US')}
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedTx.action} · {formatExactQuantity(selectedTx.quantity)}{' '}
                    {selectedTx.coin.symbol}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  aria-label="Close transaction receipt"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131B2E] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                    <Check className="w-3.5 h-3.5" />
                    Confirmed
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Timestamp</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {formatLedgerDateTime(selectedTx.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Counterparty / DEX</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTx.counterparty}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Live Spot Value ({currency})</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    {formatCompactCurrency(selectedTx.valueUsd, currency, fxRates)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Historical Execution Price</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {formatPrice(selectedTx.executionPriceUsd, currency, fxRates)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Network Gas Fee</span>
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatPrice(selectedTx.gasFeeUsd, currency, fxRates)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111829] space-y-2 text-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Execution Summary
                </div>
                <p className="text-slate-700 dark:text-slate-200">{selectedTx.routeSummary}</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111829] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Full Transaction Hash
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTxHash(selectedTx.txHash)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    {copiedTxHash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <StealthValue>{selectedTx.txHash}</StealthValue>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="mt-6 w-full py-2.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Close Tx Receipt
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};
