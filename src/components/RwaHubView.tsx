import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  Building2,
  Landmark,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { BlockchainNetwork, Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface RwaHubViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

type RwaAssetClass =
  | 'All Classes'
  | 'US Treasuries'
  | 'Physical Gold'
  | 'Real Estate'
  | 'Private Credit'
  | 'Institutional DeFi';

type RwaSortKey = 'marketCapUsd' | 'tokenizedTvlUsd' | 'priceUsd' | 'change24h' | 'change7d';

interface RwaAssetSeed {
  symbol: string;
  name: string;
  cmcId: number;
  assetClass: Exclude<RwaAssetClass, 'All Classes'>;
  backingDetail: string;
  tokenizedTvlUsd: number;
  chain: Exclude<BlockchainNetwork, 'All Networks'>;
  issuerOrProtocol: string;
  fallbackPriceUsd: number;
  fallbackMarketCapUsd: number;
  fallbackVolume24hUsd: number;
  fallbackChange1h: number;
  fallbackChange24h: number;
  fallbackChange7d: number;
  fallbackSupply: number;
}

const RWA_SEEDS: RwaAssetSeed[] = [
  {
    symbol: 'ONDO',
    name: 'Ondo Finance',
    cmcId: 21159,
    assetClass: 'US Treasuries',
    backingDetail: 'OUSG / USDY Short-Term US T-Bills & BlackRock BUIDL',
    tokenizedTvlUsd: 985_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Ondo / BlackRock BUIDL',
    fallbackPriceUsd: 1.08,
    fallbackMarketCapUsd: 3_410_000_000,
    fallbackVolume24hUsd: 265_000_000,
    fallbackChange1h: 0.42,
    fallbackChange24h: 4.85,
    fallbackChange7d: 11.4,
    fallbackSupply: 3_159_107_529,
  },
  {
    symbol: 'OM',
    name: 'MANTRA',
    cmcId: 6536,
    assetClass: 'Institutional DeFi',
    backingDetail: 'Regulated Dubai / UAE Real-Estate & Sovereign RWA L1',
    tokenizedTvlUsd: 620_000_000,
    chain: 'Cosmos',
    issuerOrProtocol: 'MANTRA Chain (VARA)',
    fallbackPriceUsd: 5.42,
    fallbackMarketCapUsd: 5_290_000_000,
    fallbackVolume24hUsd: 194_000_000,
    fallbackChange1h: 0.65,
    fallbackChange24h: 3.12,
    fallbackChange7d: 8.92,
    fallbackSupply: 976_000_000,
  },
  {
    symbol: 'PENDLE',
    name: 'Pendle',
    cmcId: 9481,
    assetClass: 'Institutional DeFi',
    backingDetail: 'Tokenized Fixed-Yield Principal & RWA Interest Swaps',
    tokenizedTvlUsd: 3_420_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Pendle Citadels',
    fallbackPriceUsd: 3.64,
    fallbackMarketCapUsd: 604_000_000,
    fallbackVolume24hUsd: 112_000_000,
    fallbackChange1h: 0.31,
    fallbackChange24h: 6.18,
    fallbackChange7d: 14.25,
    fallbackSupply: 165_840_000,
  },
  {
    symbol: 'PAXG',
    name: 'PAX Gold',
    cmcId: 4705,
    assetClass: 'Physical Gold',
    backingDetail: '1:1 London Good Delivery Physical Gold (Brink’s Vaults)',
    tokenizedTvlUsd: 685_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Paxos Trust (NYDFS)',
    fallbackPriceUsd: 2918.4,
    fallbackMarketCapUsd: 685_000_000,
    fallbackVolume24hUsd: 48_500_000,
    fallbackChange1h: 0.08,
    fallbackChange24h: 0.94,
    fallbackChange7d: 2.35,
    fallbackSupply: 234_717,
  },
  {
    symbol: 'XAUT',
    name: 'Tether Gold',
    cmcId: 5176,
    assetClass: 'Physical Gold',
    backingDetail: '1 Fine Troy Oz LBMA Gold Stored in Swiss Vaults',
    tokenizedTvlUsd: 718_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'TG Commodities / Tether',
    fallbackPriceUsd: 2915.1,
    fallbackMarketCapUsd: 718_000_000,
    fallbackVolume24hUsd: 29_400_000,
    fallbackChange1h: 0.05,
    fallbackChange24h: 0.88,
    fallbackChange7d: 2.18,
    fallbackSupply: 246_524,
  },
  {
    symbol: 'USUAL',
    name: 'Usual',
    cmcId: 34375,
    assetClass: 'US Treasuries',
    backingDetail: 'USD0 Treasury-Backed Stablecoin Revenue Share Token',
    tokenizedTvlUsd: 1_140_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Usual Labs / Hashnote USYC',
    fallbackPriceUsd: 0.245,
    fallbackMarketCapUsd: 184_000_000,
    fallbackVolume24hUsd: 54_200_000,
    fallbackChange1h: 0.74,
    fallbackChange24h: 5.42,
    fallbackChange7d: 9.15,
    fallbackSupply: 751_000_000,
  },
  {
    symbol: 'POLYX',
    name: 'Polymesh',
    cmcId: 20362,
    assetClass: 'Institutional DeFi',
    backingDetail: 'Permissioned Layer-1 for Regulated Security Tokens',
    tokenizedTvlUsd: 410_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Polymesh Association',
    fallbackPriceUsd: 0.214,
    fallbackMarketCapUsd: 242_000_000,
    fallbackVolume24hUsd: 18_700_000,
    fallbackChange1h: -0.18,
    fallbackChange24h: 2.34,
    fallbackChange7d: 5.8,
    fallbackSupply: 1_130_000_000,
  },
  {
    symbol: 'CFG',
    name: 'Centrifuge',
    cmcId: 6748,
    assetClass: 'Private Credit',
    backingDetail: 'Tokenized Trade Finance, Invoices & Janus Henderson Anemoy',
    tokenizedTvlUsd: 512_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Centrifuge DAO / Anemoy',
    fallbackPriceUsd: 0.238,
    fallbackMarketCapUsd: 129_000_000,
    fallbackVolume24hUsd: 9_800_000,
    fallbackChange1h: 0.25,
    fallbackChange24h: 3.62,
    fallbackChange7d: 7.44,
    fallbackSupply: 542_000_000,
  },
  {
    symbol: 'MPL',
    name: 'Maple',
    cmcId: 9417,
    assetClass: 'Private Credit',
    backingDetail: 'Institutional Undercollateralized & Treasury Credit Pools',
    tokenizedTvlUsd: 590_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Maple Finance / Syrup',
    fallbackPriceUsd: 17.85,
    fallbackMarketCapUsd: 141_000_000,
    fallbackVolume24hUsd: 7_450_000,
    fallbackChange1h: 0.55,
    fallbackChange24h: 4.18,
    fallbackChange7d: 12.1,
    fallbackSupply: 7_900_000,
  },
  {
    symbol: 'SYRUP',
    name: 'Syrup (Maple)',
    cmcId: 33824,
    assetClass: 'Private Credit',
    backingDetail: 'Permissionless Institutional High-Yield Lending Vaults',
    tokenizedTvlUsd: 475_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Maple Institutional',
    fallbackPriceUsd: 0.194,
    fallbackMarketCapUsd: 162_000_000,
    fallbackVolume24hUsd: 14_300_000,
    fallbackChange1h: 0.92,
    fallbackChange24h: 7.25,
    fallbackChange7d: 16.4,
    fallbackSupply: 835_000_000,
  },
  {
    symbol: 'CPOOL',
    name: 'Clearpool',
    cmcId: 18691,
    assetClass: 'Private Credit',
    backingDetail: 'Dynamic Institutional Borrower Pools & Ozean RWA L2',
    tokenizedTvlUsd: 188_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Clearpool / Ozean',
    fallbackPriceUsd: 0.186,
    fallbackMarketCapUsd: 138_000_000,
    fallbackVolume24hUsd: 11_900_000,
    fallbackChange1h: 0.44,
    fallbackChange24h: 5.1,
    fallbackChange7d: 13.8,
    fallbackSupply: 742_000_000,
  },
  {
    symbol: 'TRU',
    name: 'TrueFi',
    cmcId: 7725,
    assetClass: 'Private Credit',
    backingDetail: 'On-Chain Uncollateralized Credit & Treasury Bills (tfBILL)',
    tokenizedTvlUsd: 142_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'TrueFi Governance',
    fallbackPriceUsd: 0.058,
    fallbackMarketCapUsd: 74_200_000,
    fallbackVolume24hUsd: 8_950_000,
    fallbackChange1h: -0.32,
    fallbackChange24h: 1.92,
    fallbackChange7d: -2.4,
    fallbackSupply: 1_280_000_000,
  },
  {
    symbol: 'GFI',
    name: 'Goldfinch',
    cmcId: 13967,
    assetClass: 'Private Credit',
    backingDetail: 'Emerging-Market Real-World Business & Fintech Loans',
    tokenizedTvlUsd: 118_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Warbler Labs',
    fallbackPriceUsd: 0.98,
    fallbackMarketCapUsd: 92_100_000,
    fallbackVolume24hUsd: 5_620_000,
    fallbackChange1h: 0.19,
    fallbackChange24h: 2.84,
    fallbackChange7d: 6.15,
    fallbackSupply: 94_000_000,
  },
  {
    symbol: 'CTC',
    name: 'Creditcoin',
    cmcId: 4747,
    assetClass: 'Private Credit',
    backingDetail: 'Cross-Chain RWA Credit History & Fintech Loan Ledger',
    tokenizedTvlUsd: 165_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Gluwa / Creditcoin',
    fallbackPriceUsd: 0.72,
    fallbackMarketCapUsd: 306_000_000,
    fallbackVolume24hUsd: 16_400_000,
    fallbackChange1h: -0.14,
    fallbackChange24h: 1.65,
    fallbackChange7d: 4.3,
    fallbackSupply: 425_000_000,
  },
  {
    symbol: 'RIO',
    name: 'Realio Network',
    cmcId: 4166,
    assetClass: 'Real Estate',
    backingDetail: 'Tokenized Commercial Real Estate Equity & Venture Funds',
    tokenizedTvlUsd: 94_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Realio SEC-Regulated Issuer',
    fallbackPriceUsd: 0.442,
    fallbackMarketCapUsd: 58_400_000,
    fallbackVolume24hUsd: 7_120_000,
    fallbackChange1h: 0.85,
    fallbackChange24h: 4.92,
    fallbackChange7d: 10.6,
    fallbackSupply: 132_000_000,
  },
  {
    symbol: 'PRO',
    name: 'Propy',
    cmcId: 1974,
    assetClass: 'Real Estate',
    backingDetail: 'On-Chain Property Deeds, Title Registry & Real Estate Escrow',
    tokenizedTvlUsd: 126_000_000,
    chain: 'Base',
    issuerOrProtocol: 'Propy Title & Keys',
    fallbackPriceUsd: 0.915,
    fallbackMarketCapUsd: 91_500_000,
    fallbackVolume24hUsd: 6_340_000,
    fallbackChange1h: -0.22,
    fallbackChange24h: 2.1,
    fallbackChange7d: -1.85,
    fallbackSupply: 100_000_000,
  },
  {
    symbol: 'PRCL',
    name: 'Parcl',
    cmcId: 30495,
    assetClass: 'Real Estate',
    backingDetail: 'Solana Perpetual Real Estate Price Index & City Markets',
    tokenizedTvlUsd: 82_000_000,
    chain: 'Solana',
    issuerOrProtocol: 'Parcl Labs',
    fallbackPriceUsd: 0.168,
    fallbackMarketCapUsd: 42_300_000,
    fallbackVolume24hUsd: 9_840_000,
    fallbackChange1h: 0.62,
    fallbackChange24h: 3.75,
    fallbackChange7d: 8.1,
    fallbackSupply: 252_000_000,
  },
  {
    symbol: 'TOKEN',
    name: 'TokenFi',
    cmcId: 28299,
    assetClass: 'Institutional DeFi',
    backingDetail: 'No-Code Asset Tokenization & Institutional Launchpad',
    tokenizedTvlUsd: 78_000_000,
    chain: 'BNB Smart Chain (BSC)',
    issuerOrProtocol: 'Floki / TokenFi RWA',
    fallbackPriceUsd: 0.0248,
    fallbackMarketCapUsd: 62_400_000,
    fallbackVolume24hUsd: 13_200_000,
    fallbackChange1h: -0.45,
    fallbackChange24h: -1.35,
    fallbackChange7d: 3.9,
    fallbackSupply: 2_516_000_000,
  },
  {
    symbol: 'BOSON',
    name: 'Boson Protocol',
    cmcId: 8827,
    assetClass: 'Institutional DeFi',
    backingDetail: 'Decentralized Physical Commerce & Luxury Asset Redemption NFTs',
    tokenizedTvlUsd: 54_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Boson rNFT Settlement',
    fallbackPriceUsd: 0.192,
    fallbackMarketCapUsd: 26_800_000,
    fallbackVolume24hUsd: 3_420_000,
    fallbackChange1h: 0.15,
    fallbackChange24h: 1.48,
    fallbackChange7d: -3.2,
    fallbackSupply: 139_500_000,
  },
  {
    symbol: 'NXRA',
    name: 'Nexera',
    cmcId: 23953,
    assetClass: 'Institutional DeFi',
    backingDetail: 'Compliant DeFi & Tokenized Capital Markets Infrastructure',
    tokenizedTvlUsd: 64_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'Nexera Foundation',
    fallbackPriceUsd: 0.0294,
    fallbackMarketCapUsd: 24_900_000,
    fallbackVolume24hUsd: 2_890_000,
    fallbackChange1h: -0.11,
    fallbackChange24h: -2.14,
    fallbackChange7d: -4.8,
    fallbackSupply: 847_000_000,
  },
  {
    symbol: 'TRADE',
    name: 'Polytrade',
    cmcId: 11330,
    assetClass: 'US Treasuries',
    backingDetail: 'Multi-Chain RWA Marketplace (T-Bills, Real Estate, Credit)',
    tokenizedTvlUsd: 69_000_000,
    chain: 'Polygon',
    issuerOrProtocol: 'Polytrade Marketplace',
    fallbackPriceUsd: 0.285,
    fallbackMarketCapUsd: 11_800_000,
    fallbackVolume24hUsd: 1_950_000,
    fallbackChange1h: 0.38,
    fallbackChange24h: 2.95,
    fallbackChange7d: 5.4,
    fallbackSupply: 41_400_000,
  },
  {
    symbol: 'SMT',
    name: 'Swarm Markets',
    cmcId: 18332,
    assetClass: 'US Treasuries',
    backingDetail: 'BaFin-Regulated Tokenized US Equities, Bonds & T-Bills',
    tokenizedTvlUsd: 48_000_000,
    chain: 'Ethereum',
    issuerOrProtocol: 'SwarmX (BaFin)',
    fallbackPriceUsd: 0.218,
    fallbackMarketCapUsd: 16_900_000,
    fallbackVolume24hUsd: 1_480_000,
    fallbackChange1h: 0.27,
    fallbackChange24h: 3.35,
    fallbackChange7d: 7.2,
    fallbackSupply: 77_500_000,
  },
];

const ASSET_CLASSES: RwaAssetClass[] = [
  'All Classes',
  'US Treasuries',
  'Physical Gold',
  'Real Estate',
  'Private Credit',
  'Institutional DeFi',
];

function buildSparkline(price: number, change7d: number): number[] {
  const safePrice = price > 0 ? price : 1;
  const start = safePrice / (1 + change7d / 100);
  const points: number[] = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const wave = Math.sin(i * 1.15) * 0.012 * safePrice;
    points.push(Math.max(0.0001, start + (safePrice - start) * t + wave));
  }
  return points;
}

function getAssetClassBadgeStyle(cls: Exclude<RwaAssetClass, 'All Classes'>): string {
  switch (cls) {
    case 'US Treasuries':
      return 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400 border-cyan-500/25';
    case 'Physical Gold':
      return 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25';
    case 'Real Estate':
      return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
    case 'Private Credit':
      return 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border-indigo-500/25';
    case 'Institutional DeFi':
      return 'bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25';
  }
}

export const RwaHubView: React.FC<RwaHubViewProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const [selectedClass, setSelectedClass] = useState<RwaAssetClass>('All Classes');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<RwaSortKey>('marketCapUsd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const coinMap = useMemo(() => {
    const map = new Map<string, Coin>();
    for (const c of coins) {
      const sym = c.symbol.toUpperCase();
      if (!map.has(sym)) map.set(sym, c);
    }
    return map;
  }, [coins]);

  const rows = useMemo(() => {
    return RWA_SEEDS.map((seed, index) => {
      const live = coinMap.get(seed.symbol.toUpperCase());
      const priceUsd = live ? live.priceUsd : seed.fallbackPriceUsd;
      const marketCapUsd = live ? live.marketCapUsd : seed.fallbackMarketCapUsd;
      const volume24hUsd = live ? live.volume24hUsd : seed.fallbackVolume24hUsd;
      const change24h = live ? live.change24h : seed.fallbackChange24h;
      const change7d = live ? live.change7d : seed.fallbackChange7d;
      const change1h = live ? live.change1h : seed.fallbackChange1h;

      const coinObj: Coin = live
        ? live
        : {
            id: `rwa-${seed.symbol.toLowerCase()}`,
            rank: 120 + index * 11,
            symbol: seed.symbol,
            name: seed.name,
            image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${seed.cmcId}.png`,
            category: 'RWA',
            priceUsd,
            marketCapUsd,
            fdvUsd: marketCapUsd * 1.45,
            volume24hUsd,
            vol24hChangePct: 4.8,
            high24hUsd: priceUsd * 1.045,
            low24hUsd: priceUsd * 0.962,
            circulatingSupply: seed.fallbackSupply,
            maxSupply: Math.round(seed.fallbackSupply * 1.35),
            change1h,
            change24h,
            change7d,
            change30d: change7d * 2.1,
            change1y: change7d * 5.2,
            dominancePct: 0.04,
            sparkline7d: buildSparkline(priceUsd, change7d),
            networks: [seed.chain],
            contracts: [],
            openInterestUsd: volume24hUsd * 0.35,
            oiChange24hPct: 2.4,
            derivativesVol24hUsd: volume24hUsd * 0.85,
            fundingRatePct: 0.011,
            longLiq24hUsd: volume24hUsd * 0.008,
            shortLiq24hUsd: volume24hUsd * 0.009,
            totalLiq24hUsd: volume24hUsd * 0.017,
            isLiveApi: false,
          };

      return {
        ...seed,
        coin: coinObj,
        isLiveSynced: Boolean(live),
        priceUsd,
        marketCapUsd,
        volume24hUsd,
        change24h,
        change7d,
      };
    });
  }, [coinMap]);

  const summary = useMemo(() => {
    const totalMarketCap = rows.reduce((sum, r) => sum + r.marketCapUsd, 0);
    const totalTokenizedTvl = rows.reduce((sum, r) => sum + r.tokenizedTvlUsd, 0);
    const top24h = [...rows].sort((a, b) => b.change24h - a.change24h)[0] || null;
    const liveSyncedCount = rows.filter((r) => r.isLiveSynced).length;
    return {
      totalMarketCap,
      totalTokenizedTvl,
      top24h,
      liveSyncedCount,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const mult = sortDir === 'asc' ? 1 : -1;

    return rows
      .filter((r) => {
        if (selectedClass !== 'All Classes' && r.assetClass !== selectedClass) return false;
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q) ||
          r.assetClass.toLowerCase().includes(q) ||
          r.backingDetail.toLowerCase().includes(q) ||
          r.issuerOrProtocol.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a[sortKey] - b[sortKey]) * mult);
  }, [rows, selectedClass, searchQuery, sortKey, sortDir]);

  const handleSort = (key: RwaSortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const renderSortArrow = (key: RwaSortKey) => {
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
              <Landmark className="w-4 h-4 text-cyan-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                RWA — Real-World Assets Hub
              </h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 text-[10px] font-mono font-bold uppercase whitespace-nowrap">
                {rows.length} Tokenized Assets
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Institutional US Treasuries, LBMA physical gold, tokenized real estate, and private credit protocols synced with live CoinMarketCap pricing.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RWA asset or issuer..."
              className="pl-8 pr-3 py-1.5 w-56 sm:w-64 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Combined RWA Market Cap
            </div>
            <div className="mt-1 font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white">
              {formatCompactCurrency(summary.totalMarketCap, currency, fxRates)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tokenized TVL / Backing
            </div>
            <div className="mt-1 font-mono tabular-nums text-lg font-bold text-cyan-600 dark:text-cyan-400">
              {formatCompactCurrency(summary.totalTokenizedTvl, currency, fxRates)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => summary.top24h && onSelectCoin(summary.top24h.coin)}
            className="text-left rounded-lg border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 p-3 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Top 24H RWA Mover
            </div>
            {summary.top24h ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {summary.top24h.name} ({summary.top24h.symbol})
                </span>
                <span className="font-mono tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {formatPercent(summary.top24h.change24h)}
                </span>
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-400">--</div>
            )}
          </button>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Live Feed Coverage</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white">
              {summary.liveSyncedCount} Live CMC · {rows.length} Total Tracked
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {ASSET_CLASSES.map((cls) => {
            const active = selectedClass === cls;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cls}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/50">
                <th className="py-3 pl-4 pr-2 w-10">#</th>
                <th className="py-3 px-2">Tokenized Asset</th>
                <th className="py-3 px-2">Underlying Asset Class</th>
                <th className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('tokenizedTvlUsd')}
                    className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Tokenized TVL / Backing {renderSortArrow('tokenizedTvlUsd')}
                  </button>
                </th>
                <th className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('priceUsd')}
                    className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Price {renderSortArrow('priceUsd')}
                  </button>
                </th>
                <th className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('change24h')}
                    className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    24H % {renderSortArrow('change24h')}
                  </button>
                </th>
                <th className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('change7d')}
                    className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    7D % {renderSortArrow('change7d')}
                  </button>
                </th>
                <th className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('marketCapUsd')}
                    className="inline-flex items-center justify-end hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Market Cap {renderSortArrow('marketCapUsd')}
                  </button>
                </th>
                <th className="py-3 pl-2 pr-4 text-right">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No RWA assets match your current filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.symbol}
                    onClick={() => onSelectCoin(row.coin)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 pl-4 pr-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <CoinLogo coin={row.coin} cmcId={row.cmcId} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {row.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {row.symbol}
                            </span>
                            {row.isLiveSynced && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-bold">
                                LIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                            <Building2 className="w-3 h-3 inline mr-1 -mt-0.5 text-slate-400" />
                            {row.issuerOrProtocol} · {row.chain}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="space-y-1 min-w-[180px]">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${getAssetClassBadgeStyle(
                            row.assetClass
                          )}`}
                        >
                          {row.assetClass}
                        </span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                          {row.backingDetail}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCompactCurrency(row.tokenizedTvlUsd, currency, fxRates)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatPrice(row.priceUsd, currency, fxRates)}
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded font-mono tabular-nums font-bold text-[11px] ${
                          row.change24h >= 0
                            ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatPercent(row.change24h)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          row.change7d >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatPercent(row.change7d)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {formatCompactCurrency(row.marketCapUsd, currency, fxRates)}
                    </td>
                    <td className="py-3 pl-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCoin(row.coin);
                        }}
                        title={`Open ${row.symbol} chart`}
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
