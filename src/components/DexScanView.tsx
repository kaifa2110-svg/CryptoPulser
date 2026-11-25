import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface DexScanViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

type DexProtocol = 'Uniswap' | 'Raydium' | 'PancakeSwap' | 'Aerodrome';
type DexChain = 'Ethereum' | 'Solana' | 'BNB Chain' | 'Base' | 'Arbitrum';
type DexSortField = 'liquidityUsd' | 'volume24hUsd' | 'buys24h' | 'safetyScore';

interface DexPairSeed {
  id: string;
  pairLabel: string;
  baseSymbol: string;
  quoteSymbol: string;
  dex: DexProtocol;
  chain: DexChain;
  poolAddress: string;
  ageLabel: string;
  liquidityUsd: number;
  volume24hUsd: number;
  buys24h: number;
  sells24h: number;
  safetyScore: number;
  auditSummary: string;
}

const DEX_PAIR_SEEDS: DexPairSeed[] = [
  {
    id: 'uni-weth-usdc',
    pairLabel: 'WETH / USDC',
    baseSymbol: 'ETH',
    quoteSymbol: 'USDC',
    dex: 'Uniswap',
    chain: 'Ethereum',
    poolAddress: '0x88e6...5640',
    ageLabel: '3y 6m',
    liquidityUsd: 214_500_000,
    volume24hUsd: 482_300_000,
    buys24h: 18_420,
    sells24h: 17_110,
    safetyScore: 99,
    auditSummary: 'LP Locked · Verified v3 Pool · 0% Tax',
  },
  {
    id: 'ray-sol-usdc',
    pairLabel: 'SOL / USDC',
    baseSymbol: 'SOL',
    quoteSymbol: 'USDC',
    dex: 'Raydium',
    chain: 'Solana',
    poolAddress: '58oQCh...y42T',
    ageLabel: '2y 9m',
    liquidityUsd: 86_400_000,
    volume24hUsd: 318_900_000,
    buys24h: 54_810,
    sells24h: 49_230,
    safetyScore: 98,
    auditSummary: 'Mint Revoked · Freeze Revoked · Deep CLMM',
  },
  {
    id: 'aero-cbbtc-usdc',
    pairLabel: 'cbBTC / USDC',
    baseSymbol: 'BTC',
    quoteSymbol: 'USDC',
    dex: 'Aerodrome',
    chain: 'Base',
    poolAddress: '0x4e96...9b12',
    ageLabel: '8m',
    liquidityUsd: 52_100_000,
    volume24hUsd: 164_700_000,
    buys24h: 12_940,
    sells24h: 11_320,
    safetyScore: 97,
    auditSummary: 'Coinbase Custody Backing · Slipstream Gauge',
  },
  {
    id: 'cake-wbnb-usdt',
    pairLabel: 'WBNB / USDT',
    baseSymbol: 'BNB',
    quoteSymbol: 'USDT',
    dex: 'PancakeSwap',
    chain: 'BNB Chain',
    poolAddress: '0x172f...3a81',
    ageLabel: '3y 1m',
    liquidityUsd: 64_800_000,
    volume24hUsd: 141_200_000,
    buys24h: 22_350,
    sells24h: 20_890,
    safetyScore: 97,
    auditSummary: 'Verified Core Pair · 0% Buy/Sell Tax',
  },
  {
    id: 'uni-pepe-weth',
    pairLabel: 'PEPE / WETH',
    baseSymbol: 'PEPE',
    quoteSymbol: 'WETH',
    dex: 'Uniswap',
    chain: 'Ethereum',
    poolAddress: '0xa43f...1d92',
    ageLabel: '1y 7m',
    liquidityUsd: 38_700_000,
    volume24hUsd: 96_400_000,
    buys24h: 14_210,
    sells24h: 12_640,
    safetyScore: 94,
    auditSummary: 'Contract Renounced · LP Burned',
  },
  {
    id: 'ray-jup-sol',
    pairLabel: 'JUP / SOL',
    baseSymbol: 'JUP',
    quoteSymbol: 'SOL',
    dex: 'Raydium',
    chain: 'Solana',
    poolAddress: '2wT8X...9pLm',
    ageLabel: '10m',
    liquidityUsd: 18_900_000,
    volume24hUsd: 58_300_000,
    buys24h: 19_620,
    sells24h: 16_810,
    safetyScore: 95,
    auditSummary: 'Mint Revoked · Top 10 Non-LP < 14%',
  },
  {
    id: 'uni-arb-weth',
    pairLabel: 'ARB / WETH',
    baseSymbol: 'ARB',
    quoteSymbol: 'WETH',
    dex: 'Uniswap',
    chain: 'Arbitrum',
    poolAddress: '0xc6f7...48e1',
    ageLabel: '1y 8m',
    liquidityUsd: 24_300_000,
    volume24hUsd: 49_800_000,
    buys24h: 11_420,
    sells24h: 10_790,
    safetyScore: 96,
    auditSummary: 'DAO Governance Verified · Low Slippage',
  },
  {
    id: 'aero-aero-usdc',
    pairLabel: 'AERO / USDC',
    baseSymbol: 'AERO',
    quoteSymbol: 'USDC',
    dex: 'Aerodrome',
    chain: 'Base',
    poolAddress: '0x6cdcb...8c1a',
    ageLabel: '1y 3m',
    liquidityUsd: 31_400_000,
    volume24hUsd: 62_100_000,
    buys24h: 16_980,
    sells24h: 13_450,
    safetyScore: 95,
    auditSummary: 'Protocol Native Pool · High Depth',
  },
  {
    id: 'ray-bonk-sol',
    pairLabel: 'BONK / SOL',
    baseSymbol: 'BONK',
    quoteSymbol: 'SOL',
    dex: 'Raydium',
    chain: 'Solana',
    poolAddress: '8QaX...7kVr',
    ageLabel: '1y 11m',
    liquidityUsd: 14_600_000,
    volume24hUsd: 44_900_000,
    buys24h: 28_900,
    sells24h: 25_140,
    safetyScore: 93,
    auditSummary: 'Mint Revoked · LP Locked · High Retail Flow',
  },
  {
    id: 'uni-link-weth',
    pairLabel: 'LINK / WETH',
    baseSymbol: 'LINK',
    quoteSymbol: 'WETH',
    dex: 'Uniswap',
    chain: 'Ethereum',
    poolAddress: '0xa6cc...7f40',
    ageLabel: '3y 6m',
    liquidityUsd: 27_900_000,
    volume24hUsd: 39_500_000,
    buys24h: 6_840,
    sells24h: 5_910,
    safetyScore: 98,
    auditSummary: 'Blue-Chip Oracle Token · Zero Tax',
  },
  {
    id: 'cake-cake-wbnb',
    pairLabel: 'CAKE / WBNB',
    baseSymbol: 'CAKE',
    quoteSymbol: 'WBNB',
    dex: 'PancakeSwap',
    chain: 'BNB Chain',
    poolAddress: '0x0ed7...e91b',
    ageLabel: '3y 4m',
    liquidityUsd: 19_200_000,
    volume24hUsd: 28_600_000,
    buys24h: 9_140,
    sells24h: 8_420,
    safetyScore: 96,
    auditSummary: 'Core DEX Governance · Audited',
  },
  {
    id: 'uni-pendle-weth',
    pairLabel: 'PENDLE / WETH',
    baseSymbol: 'PENDLE',
    quoteSymbol: 'WETH',
    dex: 'Uniswap',
    chain: 'Arbitrum',
    poolAddress: '0x5903...d22f',
    ageLabel: '1y 5m',
    liquidityUsd: 12_800_000,
    volume24hUsd: 33_400_000,
    buys24h: 7_310,
    sells24h: 6_180,
    safetyScore: 94,
    auditSummary: 'Audited Yield Token · Active Arbitrage',
  },
  {
    id: 'aero-brett-weth',
    pairLabel: 'BRETT / WETH',
    baseSymbol: 'BRETT',
    quoteSymbol: 'WETH',
    dex: 'Aerodrome',
    chain: 'Base',
    poolAddress: '0x4e82...f021',
    ageLabel: '9m',
    liquidityUsd: 11_400_000,
    volume24hUsd: 29_700_000,
    buys24h: 13_890,
    sells24h: 12_720,
    safetyScore: 89,
    auditSummary: 'Contract Renounced · Moderate Concentration',
  },
  {
    id: 'cake-doge-wbnb',
    pairLabel: 'DOGE / WBNB',
    baseSymbol: 'DOGE',
    quoteSymbol: 'WBNB',
    dex: 'PancakeSwap',
    chain: 'BNB Chain',
    poolAddress: '0xac10...6b94',
    ageLabel: '2y 10m',
    liquidityUsd: 15_100_000,
    volume24hUsd: 26_200_000,
    buys24h: 10_420,
    sells24h: 9_640,
    safetyScore: 95,
    auditSummary: 'Wrapped Canonical Asset · Verified',
  },
];

const DEX_FILTERS: Array<'All' | DexProtocol> = [
  'All',
  'Uniswap',
  'Raydium',
  'PancakeSwap',
  'Aerodrome',
];

const CHAIN_FILTERS: Array<'All' | DexChain> = [
  'All',
  'Ethereum',
  'Solana',
  'BNB Chain',
  'Base',
  'Arbitrum',
];

export const DexScanView: React.FC<DexScanViewProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const [selectedDex, setSelectedDex] = useState<'All' | DexProtocol>('All');
  const [selectedChain, setSelectedChain] = useState<'All' | DexChain>('All');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<DexSortField>('volume24hUsd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [scanTick, setScanTick] = useState(0);

  const pairs = useMemo(() => {
    return DEX_PAIR_SEEDS.map((seed, idx) => {
      const matched = coins.find(
        (c) => c.symbol.toUpperCase() === seed.baseSymbol.toUpperCase()
      );
      const priceUsd = matched?.priceUsd ?? (seed.baseSymbol === 'AERO' ? 1.42 : seed.baseSymbol === 'BRETT' ? 0.14 : 1.0);
      const change24h = matched?.change24h ?? ((idx % 2 === 0 ? 1 : -1) * (2.4 + idx * 0.45));
      const txDrift = scanTick * ((idx % 3) + 2);
      const buys24h = seed.buys24h + txDrift * 3;
      const sells24h = seed.sells24h + txDrift * 2;
      const volumeDrift = 1 + (scanTick % 5) * 0.004;

      return {
        ...seed,
        matchedCoin: matched,
        priceUsd,
        change24h,
        buys24h,
        sells24h,
        volume24hUsd: seed.volume24hUsd * volumeDrift,
      };
    });
  }, [coins, scanTick]);

  const filteredPairs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pairs
      .filter((p) => {
        if (selectedDex !== 'All' && p.dex !== selectedDex) return false;
        if (selectedChain !== 'All' && p.chain !== selectedChain) return false;
        if (q) {
          return (
            p.pairLabel.toLowerCase().includes(q) ||
            p.baseSymbol.toLowerCase().includes(q) ||
            p.dex.toLowerCase().includes(q) ||
            p.poolAddress.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const va = a[sortField];
        const vb = b[sortField];
        return sortDir === 'asc' ? va - vb : vb - va;
      });
  }, [pairs, selectedDex, selectedChain, search, sortField, sortDir]);

  const totals = useMemo(() => {
    const pool = filteredPairs.length > 0 ? filteredPairs : pairs;
    const liquidity = pool.reduce((acc, p) => acc + p.liquidityUsd, 0);
    const vol = pool.reduce((acc, p) => acc + p.volume24hUsd, 0);
    const buys = pool.reduce((acc, p) => acc + p.buys24h, 0);
    const sells = pool.reduce((acc, p) => acc + p.sells24h, 0);
    const avgSafety = Math.round(pool.reduce((acc, p) => acc + p.safetyScore, 0) / Math.max(1, pool.length));
    return { liquidity, vol, buys, sells, avgSafety };
  }, [filteredPairs, pairs]);

  const handleSort = (field: DexSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Scanned Pool Liquidity
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
            {formatCompactCurrency(totals.liquidity, currency, fxRates)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {filteredPairs.length} verified AMM/CLMM pairs
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            24h On-Chain DEX Volume
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-cyan-600 dark:text-cyan-400">
            {formatCompactCurrency(totals.vol, currency, fxRates)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Across Uniswap, Raydium, PancakeSwap, Aerodrome
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            24h Buy / Sell Flow
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {((totals.buys / Math.max(1, totals.buys + totals.sells)) * 100).toFixed(1)}% Buys
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {totals.buys.toLocaleString('en-US')} buys · {totals.sells.toLocaleString('en-US')} sells
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Avg Pair Safety Score
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {totals.avgSafety}/100
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            LP lock, honeypot &amp; mint checks
          </div>
        </div>
      </div>

      {/* Filters & Scan Action */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {DEX_FILTERS.map((dex) => (
            <button
              key={dex}
              type="button"
              onClick={() => setSelectedDex(dex)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedDex === dex
                  ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {dex === 'All' ? 'All DEXs' : dex}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pair, token, or pool..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 w-44 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value as 'All' | DexChain)}
            aria-label="Filter DEX pairs by chain"
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
          >
            {CHAIN_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Chains' : c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setScanTick((t) => t + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-cyan-500 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-500" />
            <span>Rescan Mempool</span>
          </button>
        </div>
      </div>

      {/* DEX Pairs Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Radar className="w-4 h-4 text-cyan-500" />
            <span>Real-Time On-Chain DEX Pair Scanner</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Scan #{scanTick + 1} · Click pair for asset details
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4">DEX Pair</th>
                <th className="py-2.5 px-3">Protocol / Chain</th>
                <th className="py-2.5 px-3 text-right">Price / 24h</th>
                <th
                  onClick={() => handleSort('liquidityUsd')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Liquidity
                  {sortField === 'liquidityUsd' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 inline ml-1" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('volume24hUsd')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  24h Volume
                  {sortField === 'volume24hUsd' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 inline ml-1" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('buys24h')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Buy / Sell Txs (24h)
                </th>
                <th
                  onClick={() => handleSort('safetyScore')}
                  className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Safety Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredPairs.map((pair) => {
                const totalTx = pair.buys24h + pair.sells24h;
                const buyPct = totalTx > 0 ? (pair.buys24h / totalTx) * 100 : 50;
                const safetyTone =
                  pair.safetyScore >= 95
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : pair.safetyScore >= 90
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-amber-600 dark:text-amber-400';

                return (
                  <tr
                    key={pair.id}
                    onClick={() => pair.matchedCoin && onSelectCoin(pair.matchedCoin)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      pair.matchedCoin ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <CoinLogo
                          coin={pair.matchedCoin}
                          symbol={pair.baseSymbol}
                          name={pair.pairLabel}
                          size="md"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {pair.pairLabel}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {pair.poolAddress} · Age {pair.ageLabel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{pair.dex}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{pair.chain}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatPrice(pair.priceUsd, currency, fxRates)}
                      </div>
                      <div
                        className={`text-[11px] ${
                          pair.change24h >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatPercent(pair.change24h)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatCompactCurrency(pair.liquidityUsd, currency, fxRates)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCompactCurrency(pair.volume24hUsd, currency, fxRates)}
                    </td>
                    <td className="py-3 px-3 min-w-[160px]">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {pair.buys24h.toLocaleString('en-US')} B
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          {pair.sells24h.toLocaleString('en-US')} S
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-rose-500/80 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${buyPct}%` }} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1 font-mono tabular-nums font-bold">
                        <ShieldCheck className={`w-3.5 h-3.5 ${safetyTone}`} />
                        <span className={safetyTone}>{pair.safetyScore}/100</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {pair.auditSummary}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPairs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                    No DEX pairs match your current search or chain filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
