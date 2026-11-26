import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  Clock,
  Rocket,
  Search,
  Sparkles,
} from 'lucide-react';
import { BlockchainNetwork, Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface IpoLaunchpadViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

type LaunchpadStatus = 'LIVE NOW' | 'UPCOMING' | 'LISTED';
type LaunchpadExchange =
  | 'Binance Launchpool'
  | 'Bybit ByStarter'
  | 'OKX Jumpstart'
  | 'Coinbase Pre-Launch'
  | 'Gate Startup';
type LaunchpadSortKey = 'fundraisingTargetUsd' | 'salePriceUsd' | 'targetOffsetHours';

interface LaunchpadItemSeed {
  id: string;
  name: string;
  symbol: string;
  cmcId?: number;
  sector: string;
  network: Exclude<BlockchainNetwork, 'All Networks'>;
  fundraisingTargetUsd: number;
  salePriceUsd: number;
  status: LaunchpadStatus;
  exchange: LaunchpadExchange;
  targetOffsetHours: number;
  listedSpotPriceUsd?: number;
  listedChange24h?: number;
}

const LAUNCHPAD_SEEDS: LaunchpadItemSeed[] = [
  {
    id: 'ipo-monad',
    name: 'Monad',
    symbol: 'MON',
    sector: 'Parallel EVM L1',
    network: 'Ethereum',
    fundraisingTargetUsd: 225_000_000,
    salePriceUsd: 0.45,
    status: 'LIVE NOW',
    exchange: 'Coinbase Pre-Launch',
    targetOffsetHours: 38,
  },
  {
    id: 'ipo-megaeth',
    name: 'MegaETH',
    symbol: 'MEGA',
    sector: 'Real-Time L2',
    network: 'Ethereum',
    fundraisingTargetUsd: 84_000_000,
    salePriceUsd: 0.32,
    status: 'LIVE NOW',
    exchange: 'Binance Launchpool',
    targetOffsetHours: 19,
  },
  {
    id: 'ipo-initia',
    name: 'Initia',
    symbol: 'INIT',
    sector: 'Modular Rollup Network',
    network: 'Cosmos',
    fundraisingTargetUsd: 42_500_000,
    salePriceUsd: 0.28,
    status: 'LIVE NOW',
    exchange: 'Binance Launchpool',
    targetOffsetHours: 52,
  },
  {
    id: 'ipo-succinct',
    name: 'Succinct Prover',
    symbol: 'PROVE',
    sector: 'ZK Infrastructure',
    network: 'Ethereum',
    fundraisingTargetUsd: 55_000_000,
    salePriceUsd: 0.41,
    status: 'LIVE NOW',
    exchange: 'OKX Jumpstart',
    targetOffsetHours: 27,
  },
  {
    id: 'ipo-eclipse',
    name: 'Eclipse',
    symbol: 'ECLIPSE',
    sector: 'SVM Ethereum L2',
    network: 'Solana',
    fundraisingTargetUsd: 65_000_000,
    salePriceUsd: 0.36,
    status: 'LIVE NOW',
    exchange: 'Bybit ByStarter',
    targetOffsetHours: 64,
  },
  {
    id: 'ipo-abstract',
    name: 'Abstract Chain',
    symbol: 'ABS',
    sector: 'Consumer ZK L2',
    network: 'Ethereum',
    fundraisingTargetUsd: 48_000_000,
    salePriceUsd: 0.18,
    status: 'LIVE NOW',
    exchange: 'Gate Startup',
    targetOffsetHours: 14,
  },
  {
    id: 'ipo-somnia',
    name: 'Somnia Network',
    symbol: 'SOMI',
    sector: 'High-TPS Gaming L1',
    network: 'Base',
    fundraisingTargetUsd: 39_000_000,
    salePriceUsd: 0.22,
    status: 'UPCOMING',
    exchange: 'Bybit ByStarter',
    targetOffsetHours: 96,
  },
  {
    id: 'ipo-sahara',
    name: 'Sahara AI',
    symbol: 'SAHARA',
    sector: 'AI Data & Agents',
    network: 'Ethereum',
    fundraisingTargetUsd: 49_000_000,
    salePriceUsd: 0.29,
    status: 'UPCOMING',
    exchange: 'Binance Launchpool',
    targetOffsetHours: 128,
  },
  {
    id: 'ipo-aztec',
    name: 'Aztec Network',
    symbol: 'AZTEC',
    sector: 'ZK Privacy Rollup',
    network: 'Ethereum',
    fundraisingTargetUsd: 119_000_000,
    salePriceUsd: 0.74,
    status: 'UPCOMING',
    exchange: 'Coinbase Pre-Launch',
    targetOffsetHours: 174,
  },
  {
    id: 'ipo-farcaster',
    name: 'Warpcast Protocol',
    symbol: 'WARP',
    sector: 'SocialFi / Consumer',
    network: 'Base',
    fundraisingTargetUsd: 180_000_000,
    salePriceUsd: 0.62,
    status: 'UPCOMING',
    exchange: 'Coinbase Pre-Launch',
    targetOffsetHours: 218,
  },
  {
    id: 'ipo-symbiotic',
    name: 'Symbiotic',
    symbol: 'SYMB',
    sector: 'Shared Restaking',
    network: 'Ethereum',
    fundraisingTargetUsd: 34_800_000,
    salePriceUsd: 0.54,
    status: 'UPCOMING',
    exchange: 'OKX Jumpstart',
    targetOffsetHours: 146,
  },
  {
    id: 'ipo-polymarket',
    name: 'Polymarket',
    symbol: 'POLY',
    sector: 'Prediction Markets',
    network: 'Polygon',
    fundraisingTargetUsd: 74_000_000,
    salePriceUsd: 0.85,
    status: 'UPCOMING',
    exchange: 'Coinbase Pre-Launch',
    targetOffsetHours: 264,
  },
  {
    id: 'ipo-bera',
    name: 'Berachain',
    symbol: 'BERA',
    cmcId: 24647,
    sector: 'Proof-of-Liquidity L1',
    network: 'Ethereum',
    fundraisingTargetUsd: 142_000_000,
    salePriceUsd: 1.25,
    status: 'LISTED',
    exchange: 'Binance Launchpool',
    targetOffsetHours: -120,
    listedSpotPriceUsd: 5.84,
    listedChange24h: 6.42,
  },
  {
    id: 'ipo-kaito',
    name: 'Kaito AI',
    symbol: 'KAITO',
    cmcId: 35660,
    sector: 'AI InfoFi Intelligence',
    network: 'Base',
    fundraisingTargetUsd: 18_500_000,
    salePriceUsd: 0.35,
    status: 'LISTED',
    exchange: 'Binance Launchpool',
    targetOffsetHours: -96,
    listedSpotPriceUsd: 1.62,
    listedChange24h: 9.18,
  },
  {
    id: 'ipo-story',
    name: 'Story Protocol',
    symbol: 'IP',
    cmcId: 35626,
    sector: 'Programmable IP Layer',
    network: 'Ethereum',
    fundraisingTargetUsd: 140_000_000,
    salePriceUsd: 0.95,
    status: 'LISTED',
    exchange: 'OKX Jumpstart',
    targetOffsetHours: -168,
    listedSpotPriceUsd: 4.92,
    listedChange24h: 4.35,
  },
  {
    id: 'ipo-bmt',
    name: 'Bubblemaps',
    symbol: 'BMT',
    cmcId: 35852,
    sector: 'On-Chain Forensics',
    network: 'Solana',
    fundraisingTargetUsd: 12_400_000,
    salePriceUsd: 0.04,
    status: 'LISTED',
    exchange: 'Binance Launchpool',
    targetOffsetHours: -72,
    listedSpotPriceUsd: 0.178,
    listedChange24h: 11.24,
  },
  {
    id: 'ipo-parti',
    name: 'Particle Network',
    symbol: 'PARTI',
    cmcId: 35920,
    sector: 'Chain Abstraction L1',
    network: 'BNB Smart Chain (BSC)',
    fundraisingTargetUsd: 25_000_000,
    salePriceUsd: 0.09,
    status: 'LISTED',
    exchange: 'Binance Launchpool',
    targetOffsetHours: -48,
    listedSpotPriceUsd: 0.312,
    listedChange24h: 7.65,
  },
  {
    id: 'ipo-red',
    name: 'RedStone Oracles',
    symbol: 'RED',
    cmcId: 35789,
    sector: 'Modular DeFi Oracles',
    network: 'Ethereum',
    fundraisingTargetUsd: 22_000_000,
    salePriceUsd: 0.16,
    status: 'LISTED',
    exchange: 'Binance Launchpool',
    targetOffsetHours: -144,
    listedSpotPriceUsd: 0.584,
    listedChange24h: 3.12,
  },
  {
    id: 'ipo-layer',
    name: 'Solayer',
    symbol: 'LAYER',
    cmcId: 35518,
    sector: 'Solana Hardware Restaking',
    network: 'Solana',
    fundraisingTargetUsd: 16_000_000,
    salePriceUsd: 0.24,
    status: 'LISTED',
    exchange: 'Bybit ByStarter',
    targetOffsetHours: -192,
    listedSpotPriceUsd: 0.89,
    listedChange24h: 5.4,
  },
  {
    id: 'ipo-nil',
    name: 'Nillion',
    symbol: 'NIL',
    cmcId: 35907,
    sector: 'Blind Compute / MPC',
    network: 'Ethereum',
    fundraisingTargetUsd: 50_000_000,
    salePriceUsd: 0.21,
    status: 'LISTED',
    exchange: 'Binance Launchpool',
    targetOffsetHours: -60,
    listedSpotPriceUsd: 0.618,
    listedChange24h: -2.14,
  },
  {
    id: 'ipo-move',
    name: 'Movement',
    symbol: 'MOVE',
    cmcId: 32452,
    sector: 'MoveVM Ethereum L2',
    network: 'Ethereum',
    fundraisingTargetUsd: 41_400_000,
    salePriceUsd: 0.15,
    status: 'LISTED',
    exchange: 'OKX Jumpstart',
    targetOffsetHours: -310,
    listedSpotPriceUsd: 0.512,
    listedChange24h: 2.88,
  },
  {
    id: 'ipo-shell',
    name: 'MyShell',
    symbol: 'SHELL',
    cmcId: 35664,
    sector: 'AI Consumer Agents',
    network: 'BNB Smart Chain (BSC)',
    fundraisingTargetUsd: 16_600_000,
    salePriceUsd: 0.11,
    status: 'LISTED',
    exchange: 'Gate Startup',
    targetOffsetHours: -210,
    listedSpotPriceUsd: 0.348,
    listedChange24h: 4.19,
  },
];

const STATUS_FILTERS: Array<'All' | LaunchpadStatus> = ['All', 'LIVE NOW', 'UPCOMING', 'LISTED'];
const EXCHANGE_FILTERS: Array<'All Platforms' | LaunchpadExchange> = [
  'All Platforms',
  'Binance Launchpool',
  'Bybit ByStarter',
  'OKX Jumpstart',
  'Coinbase Pre-Launch',
  'Gate Startup',
];

function formatCountdown(targetMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
}

function getStatusBadgeClasses(status: LaunchpadStatus): string {
  if (status === 'LIVE NOW') {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  }
  if (status === 'UPCOMING') {
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  }
  return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
}

function buildSynthesizedCoin(
  seed: LaunchpadItemSeed,
  spotPriceUsd: number,
  change24h: number
): Coin {
  const start = spotPriceUsd / (1 + change24h / 100);
  const sparkline7d = Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    const wave = Math.sin(i * 1.1) * 0.015 * spotPriceUsd;
    return Math.max(0.0001, start + (spotPriceUsd - start) * t + wave);
  });
  const mcap = seed.fundraisingTargetUsd * 4.5;
  const vol = mcap * 0.18;

  return {
    id: seed.id,
    rank: 240,
    symbol: seed.symbol,
    name: seed.name,
    image: seed.cmcId
      ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${seed.cmcId}.png`
      : undefined,
    category: seed.sector,
    priceUsd: spotPriceUsd,
    marketCapUsd: mcap,
    fdvUsd: mcap * 3.1,
    volume24hUsd: vol,
    vol24hChangePct: 12.4,
    high24hUsd: spotPriceUsd * 1.07,
    low24hUsd: spotPriceUsd * 0.94,
    circulatingSupply: Math.round(mcap / Math.max(spotPriceUsd, 0.01)),
    maxSupply: Math.round((mcap * 3.1) / Math.max(spotPriceUsd, 0.01)),
    change1h: change24h * 0.25,
    change24h,
    change7d: change24h * 1.8,
    change30d: ((spotPriceUsd - seed.salePriceUsd) / seed.salePriceUsd) * 100,
    change1y: ((spotPriceUsd - seed.salePriceUsd) / seed.salePriceUsd) * 100,
    dominancePct: 0.02,
    sparkline7d,
    networks: [seed.network],
    contracts: [],
    openInterestUsd: vol * 0.3,
    oiChange24hPct: 6.2,
    derivativesVol24hUsd: vol * 0.7,
    fundingRatePct: 0.015,
    longLiq24hUsd: vol * 0.01,
    shortLiq24hUsd: vol * 0.012,
    totalLiq24hUsd: vol * 0.022,
    isLiveApi: false,
  };
}

export const IpoLaunchpadView: React.FC<IpoLaunchpadViewProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | LaunchpadStatus>('All');
  const [exchangeFilter, setExchangeFilter] = useState<'All Platforms' | LaunchpadExchange>(
    'All Platforms'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<LaunchpadSortKey>('targetOffsetHours');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [mountBaseMs] = useState<number>(() => Date.now());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const coinMap = useMemo(() => {
    const map = new Map<string, Coin>();
    for (const c of coins) {
      const sym = c.symbol.toUpperCase();
      if (!map.has(sym)) map.set(sym, c);
    }
    return map;
  }, [coins]);

  const enrichedItems = useMemo(() => {
    return LAUNCHPAD_SEEDS.map((seed) => {
      const matched = coinMap.get(seed.symbol.toUpperCase());
      const spotPriceUsd = matched
        ? matched.priceUsd
        : seed.listedSpotPriceUsd ?? seed.salePriceUsd;
      const change24h = matched ? matched.change24h : seed.listedChange24h ?? 0;
      const roiMultiple =
        seed.status === 'LISTED' && seed.salePriceUsd > 0
          ? spotPriceUsd / seed.salePriceUsd
          : null;
      const targetTimestampMs = mountBaseMs + seed.targetOffsetHours * 3600 * 1000;
      const coinObj = matched || buildSynthesizedCoin(seed, spotPriceUsd, change24h);

      return {
        ...seed,
        matchedCoin: matched || null,
        coin: coinObj,
        spotPriceUsd,
        change24h,
        roiMultiple,
        targetTimestampMs,
      };
    });
  }, [coinMap, mountBaseMs]);

  const summary = useMemo(() => {
    const liveCount = enrichedItems.filter((i) => i.status === 'LIVE NOW').length;
    const upcomingCount = enrichedItems.filter((i) => i.status === 'UPCOMING').length;
    const totalTargetUsd = enrichedItems.reduce((sum, i) => sum + i.fundraisingTargetUsd, 0);
    const listedItems = enrichedItems.filter((i) => i.roiMultiple !== null);
    const avgRoiX =
      listedItems.length > 0
        ? listedItems.reduce((sum, i) => sum + (i.roiMultiple || 1), 0) / listedItems.length
        : 0;
    return {
      liveCount,
      upcomingCount,
      totalTargetUsd,
      avgRoiX,
    };
  }, [enrichedItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const mult = sortDir === 'asc' ? 1 : -1;

    return enrichedItems
      .filter((item) => {
        if (statusFilter !== 'All' && item.status !== statusFilter) return false;
        if (exchangeFilter !== 'All Platforms' && item.exchange !== exchangeFilter) return false;
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q) ||
          item.network.toLowerCase().includes(q) ||
          item.exchange.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a[sortKey] - b[sortKey]) * mult);
  }, [enrichedItems, statusFilter, exchangeFilter, searchQuery, sortKey, sortDir]);

  const handleSort = (key: LaunchpadSortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const renderSortArrow = (key: LaunchpadSortKey) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Crypto IPOs, Token Launchpads &amp; TGE Calendar
              </h2>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[10px] font-mono font-bold uppercase whitespace-nowrap">
                {enrichedItems.length} Launches Tracked
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live subscription pools, pre-market TGE countdowns, fundraising targets, and exchange launchpads across Binance Launchpool, Bybit ByStarter, OKX Jumpstart, Coinbase Pre-Launch, and Gate Startup.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project, ticker, sector..."
              className="pl-8 pr-3 py-1.5 w-56 sm:w-64 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Live Launchpools Now
            </div>
            <div className="mt-1 font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white">
              {summary.liveCount} Active Subscriptions
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Upcoming TGE Queue
            </div>
            <div className="mt-1 font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white">
              {summary.upcomingCount} Scheduled Launches
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Tracked Raise Target
            </div>
            <div className="mt-1 font-mono tabular-nums text-lg font-bold text-cyan-600 dark:text-cyan-400">
              {formatCompactCurrency(summary.totalTargetUsd, currency, fxRates)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Avg Listed Post-IPO ROI</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <div className="mt-1 font-mono tabular-nums text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {summary.avgRoiX.toFixed(2)}x vs IPO Price
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {STATUS_FILTERS.map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {EXCHANGE_FILTERS.map((ex) => {
              const active = exchangeFilter === ex;
              return (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setExchangeFilter(ex)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ex}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/50">
                <th className="py-3 pl-4 pr-2 w-10">#</th>
                <th className="py-3 px-2">Project &amp; Ticker</th>
                <th className="py-3 px-2">Sector &amp; Chain</th>
                <th className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('fundraisingTargetUsd')}
                    className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Fundraising Target {renderSortArrow('fundraisingTargetUsd')}
                  </button>
                </th>
                <th className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('salePriceUsd')}
                    className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    IPO / Sale Price {renderSortArrow('salePriceUsd')}
                  </button>
                </th>
                <th className="py-3 px-2">
                  <button
                    type="button"
                    onClick={() => handleSort('targetOffsetHours')}
                    className="inline-flex items-center hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Live Countdown / Post-TGE {renderSortArrow('targetOffsetHours')}
                  </button>
                </th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Expected Exchange</th>
                <th className="py-3 pl-2 pr-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No launchpad or IPO events match your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectCoin(item.coin)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 pl-4 pr-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5 min-w-[175px]">
                        <CoinLogo
                          coin={item.matchedCoin}
                          symbol={item.symbol}
                          name={item.name}
                          cmcId={item.cmcId}
                          size="md"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            ${item.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="min-w-[155px]">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.sector}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.network}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCompactCurrency(item.fundraisingTargetUsd, currency, fxRates)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatPrice(item.salePriceUsd, currency, fxRates)}
                      </div>
                      {item.status === 'LISTED' && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Spot {formatPrice(item.spotPriceUsd, currency, fxRates)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      {item.status === 'LISTED' ? (
                        <div className="flex items-center gap-2 font-mono tabular-nums">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.roiMultiple ? `${item.roiMultiple.toFixed(2)}x` : 'Trading Live'}
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              item.change24h >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ({formatPercent(item.change24h)})
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                          <Clock className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          <span>{formatCountdown(item.targetTimestampMs, nowMs)}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase ${getStatusBadgeClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.exchange}
                      </span>
                    </td>
                    <td className="py-3 pl-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCoin(item.coin);
                        }}
                        title={`Inspect ${item.symbol} market profile`}
                        className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
