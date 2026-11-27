import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpDown,
  Award,
  Building2,
  CheckCircle2,
  Crown,
  ExternalLink,
  Globe2,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates, GlobalMarketStats } from '../types/crypto';
import { formatCompactCurrency, formatPercent } from '../utils/formatters';

interface GlobalExchangesViewProps {
  coins: Coin[];
  globalStats: GlobalMarketStats;
  currency: CurrencyCode;
  fxRates: FxRates;
}

type ExchangeFilter = 'all' | 'top10' | 'cex' | 'dex';
type SortField = 'volume' | 'btcVolume' | 'share' | 'trust' | 'name';

type PrimaryChain =
  | 'Ethereum'
  | 'Solana'
  | 'BNB Chain'
  | 'Base'
  | 'Arbitrum'
  | 'Optimism'
  | 'Multi-Chain';

interface ExchangeLeaderboardItem {
  id: string;
  geckoId?: string;
  name: string;
  type: 'CEX' | 'DEX';
  logo: string;
  primaryChain?: PrimaryChain;
  country?: string;
  subtitle: string;
  trustScore: number; // 1 - 10
  volume24hUsd: number;
  volume24hBtc: number;
  change24hPct?: number;
  liquidityUsd: number;
  liquidityLabel: string;
  healthStatus: 'Optimal' | 'Deep' | 'Healthy';
  launchUrl: string;
  isLiveFeed?: boolean;
  llamaSlugs?: string[];
  llamaNameIncludes?: string[];
}

interface CoinGeckoExchangeRow {
  id?: string;
  name?: string;
  year_established?: number | null;
  country?: string | null;
  url?: string;
  image?: string;
  trust_score?: number | null;
  trust_score_rank?: number | null;
  trade_volume_24h_btc?: number | null;
}

interface LlamaDexProtocol {
  name?: string;
  displayName?: string;
  slug?: string;
  total24h?: number | null;
  change_1d?: number | null;
  chains?: string[];
  logo?: string;
}

const CHAIN_BADGE_STYLES: Record<PrimaryChain, string> = {
  Ethereum: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
  Solana: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  'BNB Chain': 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  Base: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
  Arbitrum: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
  Optimism: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
  'Multi-Chain': 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30',
};

const BASE_CEX_EXCHANGES: ExchangeLeaderboardItem[] = [
  {
    id: 'cex-binance',
    geckoId: 'binance',
    name: 'Binance',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/270.png',
    country: 'Global',
    subtitle: 'Global Spot & Institutional Custody',
    trustScore: 10,
    volume24hUsd: 21_450_000_000,
    volume24hBtc: 227_513,
    liquidityUsd: 138_000_000_000,
    liquidityLabel: '$138.0B PoR Reserves',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.binance.com/en/markets/overview',
  },
  {
    id: 'cex-bybit',
    geckoId: 'bybit_spot',
    name: 'Bybit',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/521.png',
    country: 'UAE',
    subtitle: 'High-Throughput Spot & Liquidity',
    trustScore: 10,
    volume24hUsd: 5_620_000_000,
    volume24hBtc: 59_610,
    liquidityUsd: 19_400_000_000,
    liquidityLabel: '$19.4B PoR Reserves',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.bybit.com/en/markets/overview',
  },
  {
    id: 'cex-coinbase',
    geckoId: 'gdax',
    name: 'Coinbase Exchange',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/89.png',
    country: 'United States',
    subtitle: 'US Regulated USD Order Book',
    trustScore: 10,
    volume24hUsd: 4_890_000_000,
    volume24hBtc: 51_867,
    liquidityUsd: 89_500_000_000,
    liquidityLabel: '$89.5B Custody Depth',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.coinbase.com/advanced-trade',
  },
  {
    id: 'cex-okx',
    geckoId: 'okex',
    name: 'OKX',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/294.png',
    country: 'Seychelles',
    subtitle: 'Unified Multi-Asset Order Book',
    trustScore: 10,
    volume24hUsd: 4_310_000_000,
    volume24hBtc: 45_715,
    liquidityUsd: 24_800_000_000,
    liquidityLabel: '$24.8B PoR Reserves',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.okx.com/markets/prices',
  },
  {
    id: 'cex-upbit',
    geckoId: 'upbit',
    name: 'Upbit',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/351.png',
    country: 'South Korea',
    subtitle: 'KRW & Altcoin Liquidity Hub',
    trustScore: 9,
    volume24hUsd: 3_780_000_000,
    volume24hBtc: 40_093,
    liquidityUsd: 14_200_000_000,
    liquidityLabel: '$14.2B Reserve Depth',
    healthStatus: 'Deep',
    launchUrl: 'https://upbit.com/exchange',
  },
  {
    id: 'cex-gate',
    geckoId: 'gate',
    name: 'Gate.io',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/302.png',
    country: 'Cayman Islands',
    subtitle: 'Broad Spot Pair Discovery',
    trustScore: 9,
    volume24hUsd: 2_890_000_000,
    volume24hBtc: 30_653,
    liquidityUsd: 7_450_000_000,
    liquidityLabel: '$7.5B PoR Reserves',
    healthStatus: 'Deep',
    launchUrl: 'https://www.gate.io/marketlist',
  },
  {
    id: 'cex-bitget',
    geckoId: 'bitget',
    name: 'Bitget',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/513.png',
    country: 'Seychelles',
    subtitle: 'Copy-Trading & Deep Spot Books',
    trustScore: 9,
    volume24hUsd: 2_540_000_000,
    volume24hBtc: 26_941,
    liquidityUsd: 6_800_000_000,
    liquidityLabel: '$6.8B Protection + PoR',
    healthStatus: 'Deep',
    launchUrl: 'https://www.bitget.com/markets',
  },
  {
    id: 'cex-kraken',
    geckoId: 'kraken',
    name: 'Kraken',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/24.png',
    country: 'United States',
    subtitle: 'EUR / USD Institutional Spot',
    trustScore: 10,
    volume24hUsd: 1_940_000_000,
    volume24hBtc: 20_577,
    liquidityUsd: 17_600_000_000,
    liquidityLabel: '$17.6B PoR Audited',
    healthStatus: 'Optimal',
    launchUrl: 'https://pro.kraken.com',
  },
  {
    id: 'cex-htx',
    geckoId: 'huobi',
    name: 'HTX',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/102.png',
    country: 'Seychelles',
    subtitle: 'Global Multi-Market Exchange',
    trustScore: 8,
    volume24hUsd: 1_820_000_000,
    volume24hBtc: 19_304,
    liquidityUsd: 4_650_000_000,
    liquidityLabel: '$4.7B Merkle Reserves',
    healthStatus: 'Healthy',
    launchUrl: 'https://www.htx.com/markets',
  },
  {
    id: 'cex-kucoin',
    geckoId: 'kucoin',
    name: 'KuCoin',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/311.png',
    country: 'Seychelles',
    subtitle: 'Altcoin & Emerging Token Spot',
    trustScore: 9,
    volume24hUsd: 1_680_000_000,
    volume24hBtc: 17_819,
    liquidityUsd: 5_900_000_000,
    liquidityLabel: '$5.9B PoR Reserves',
    healthStatus: 'Deep',
    launchUrl: 'https://www.kucoin.com/markets',
  },
];

const BASE_DEX_EXCHANGES: ExchangeLeaderboardItem[] = [
  {
    id: 'dex-uniswap-v3',
    geckoId: 'uniswap_v3',
    name: 'Uniswap v3',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/uniswap-v3',
    primaryChain: 'Ethereum',
    subtitle: 'Concentrated Liquidity AMM',
    trustScore: 10,
    volume24hUsd: 1_980_000_000,
    volume24hBtc: 21_001,
    change24hPct: 6.18,
    liquidityUsd: 3_840_000_000,
    liquidityLabel: '$3.84B On-Chain TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://app.uniswap.org/swap',
    llamaSlugs: ['uniswap-v3'],
    llamaNameIncludes: ['uniswap v3'],
  },
  {
    id: 'dex-hyperliquid',
    name: 'Hyperliquid',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/hyperliquid',
    primaryChain: 'Multi-Chain',
    subtitle: 'On-Chain CLOB Spot & Orderbook L1',
    trustScore: 9,
    volume24hUsd: 1_640_000_000,
    volume24hBtc: 17_395,
    change24hPct: 11.42,
    liquidityUsd: 1_920_000_000,
    liquidityLabel: '$1.92B Vault TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://app.hyperliquid.xyz/trade',
    llamaSlugs: ['hyperliquid-spot-orderbook', 'hyperliquid'],
    llamaNameIncludes: ['hyperliquid spot', 'hyperliquid'],
  },
  {
    id: 'dex-raydium',
    geckoId: 'raydium',
    name: 'Raydium',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/raydium',
    primaryChain: 'Solana',
    subtitle: 'Solana CLMM & Order-Book AMM',
    trustScore: 9,
    volume24hUsd: 1_280_000_000,
    volume24hBtc: 13_577,
    change24hPct: 8.75,
    liquidityUsd: 1_480_000_000,
    liquidityLabel: '$1.48B Pool TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://raydium.io/swap/',
    llamaSlugs: ['raydium-amm', 'raydium-clmm', 'raydium'],
    llamaNameIncludes: ['raydium'],
  },
  {
    id: 'dex-pancakeswap-v3',
    geckoId: 'pancakeswap_new',
    name: 'PancakeSwap v3',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/pancakeswap-amm-v3',
    primaryChain: 'BNB Chain',
    subtitle: 'Multi-Chain V3 AMM & Infinity',
    trustScore: 9,
    volume24hUsd: 940_000_000,
    volume24hBtc: 9_970,
    change24hPct: 3.92,
    liquidityUsd: 1_760_000_000,
    liquidityLabel: '$1.76B Pool TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://pancakeswap.finance/swap',
    llamaSlugs: ['pancakeswap-amm-v3', 'pancakeswap-amm', 'pancakeswap-infinity'],
    llamaNameIncludes: ['pancakeswap amm v3', 'pancakeswap v3'],
  },
  {
    id: 'dex-uniswap-v4',
    name: 'Uniswap v4',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/uniswap-v4',
    primaryChain: 'Ethereum',
    subtitle: 'Singleton Hook-Enabled Pools',
    trustScore: 9,
    volume24hUsd: 715_000_000,
    volume24hBtc: 7_584,
    change24hPct: 9.35,
    liquidityUsd: 1_120_000_000,
    liquidityLabel: '$1.12B Hook TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://app.uniswap.org/explore',
    llamaSlugs: ['uniswap-v4'],
    llamaNameIncludes: ['uniswap v4'],
  },
  {
    id: 'dex-aerodrome',
    name: 'Aerodrome',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/aerodrome',
    primaryChain: 'Base',
    subtitle: 'Base Liquidity & Slipstream Hub',
    trustScore: 9,
    volume24hUsd: 620_000_000,
    volume24hBtc: 6_576,
    change24hPct: 5.44,
    liquidityUsd: 940_000_000,
    liquidityLabel: '$940M Base TVL',
    healthStatus: 'Deep',
    launchUrl: 'https://aerodrome.finance/swap',
    llamaSlugs: ['aerodrome-slipstream', 'aerodrome-v1', 'aerodrome'],
    llamaNameIncludes: ['aerodrome'],
  },
  {
    id: 'dex-orca',
    geckoId: 'orca',
    name: 'Orca',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/orca-dex',
    primaryChain: 'Solana',
    subtitle: 'Solana Concentrated Whirlpools',
    trustScore: 9,
    volume24hUsd: 545_000_000,
    volume24hBtc: 5_781,
    change24hPct: 4.11,
    liquidityUsd: 425_000_000,
    liquidityLabel: '$425M Pool TVL',
    healthStatus: 'Deep',
    launchUrl: 'https://www.orca.so/',
    llamaSlugs: ['orca-dex', 'orca'],
    llamaNameIncludes: ['orca dex', 'orca'],
  },
  {
    id: 'dex-jupiter',
    name: 'Jupiter',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/jupiter-aggregator',
    primaryChain: 'Solana',
    subtitle: 'Solana Liquidity & Routing Engine',
    trustScore: 9,
    volume24hUsd: 510_000_000,
    volume24hBtc: 5_409,
    change24hPct: 7.28,
    liquidityUsd: 780_000_000,
    liquidityLabel: '$780M Router TVL',
    healthStatus: 'Deep',
    launchUrl: 'https://jup.ag/swap',
    llamaSlugs: ['jupiterz', 'jupiter', 'jupiter-aggregator'],
    llamaNameIncludes: ['jupiterz', 'jupiter'],
  },
  {
    id: 'dex-meteora',
    name: 'Meteora',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/meteora',
    primaryChain: 'Solana',
    subtitle: 'Dynamic DLMM & Liquidity Vaults',
    trustScore: 8,
    volume24hUsd: 465_000_000,
    volume24hBtc: 4_932,
    change24hPct: 6.02,
    liquidityUsd: 615_000_000,
    liquidityLabel: '$615M DLMM TVL',
    healthStatus: 'Deep',
    launchUrl: 'https://app.meteora.ag/',
    llamaSlugs: ['meteora-dlmm', 'meteora-damm-v2', 'meteora-damm-v1'],
    llamaNameIncludes: ['meteora'],
  },
  {
    id: 'dex-dydx-v4',
    name: 'dYdX v4',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/dydx',
    primaryChain: 'Multi-Chain',
    subtitle: 'Decentralized Cosmos Order Book',
    trustScore: 9,
    volume24hUsd: 430_000_000,
    volume24hBtc: 4_561,
    change24hPct: 2.18,
    liquidityUsd: 520_000_000,
    liquidityLabel: '$520M Chain Depth',
    healthStatus: 'Deep',
    launchUrl: 'https://dydx.trade/',
    llamaSlugs: ['dydx-v4', 'dydx'],
    llamaNameIncludes: ['dydx'],
  },
  {
    id: 'dex-curve',
    geckoId: 'curve',
    name: 'Curve DEX',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/curve',
    primaryChain: 'Ethereum',
    subtitle: 'StableSwap & Tricrypto Pools',
    trustScore: 10,
    volume24hUsd: 315_000_000,
    volume24hBtc: 3_341,
    change24hPct: -1.45,
    liquidityUsd: 2_180_000_000,
    liquidityLabel: '$2.18B Pool TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://curve.fi/#/ethereum/swap',
    llamaSlugs: ['curve-dex', 'curve'],
    llamaNameIncludes: ['curve dex'],
  },
  {
    id: 'dex-sushiswap',
    geckoId: 'sushiswap',
    name: 'SushiSwap',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/sushiswap',
    primaryChain: 'Multi-Chain',
    subtitle: 'Cross-Chain AMM & RouteProcessor',
    trustScore: 8,
    volume24hUsd: 168_000_000,
    volume24hBtc: 1_782,
    change24hPct: 1.94,
    liquidityUsd: 295_000_000,
    liquidityLabel: '$295M Pool TVL',
    healthStatus: 'Healthy',
    launchUrl: 'https://www.sushi.com/swap',
    llamaSlugs: ['sushiswap-v3', 'sushiswap'],
    llamaNameIncludes: ['sushiswap'],
  },
  {
    id: 'dex-camelot',
    name: 'Camelot',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/camelot',
    primaryChain: 'Arbitrum',
    subtitle: 'Arbitrum Native DEX & Nitro Pools',
    trustScore: 8,
    volume24hUsd: 142_000_000,
    volume24hBtc: 1_506,
    change24hPct: 3.41,
    liquidityUsd: 185_000_000,
    liquidityLabel: '$185M Arb TVL',
    healthStatus: 'Healthy',
    launchUrl: 'https://app.camelot.exchange/',
    llamaSlugs: ['camelot-v3', 'camelot-v2', 'camelot'],
    llamaNameIncludes: ['camelot'],
  },
  {
    id: 'dex-balancer-v2',
    name: 'Balancer v2',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/balancer',
    primaryChain: 'Ethereum',
    subtitle: 'Programmable Weighted & LST Pools',
    trustScore: 9,
    volume24hUsd: 118_000_000,
    volume24hBtc: 1_252,
    change24hPct: 0.87,
    liquidityUsd: 890_000_000,
    liquidityLabel: '$890M Vault TVL',
    healthStatus: 'Deep',
    launchUrl: 'https://balancer.fi/swap',
    llamaSlugs: ['balancer-v2', 'balancer-v3', 'balancer'],
    llamaNameIncludes: ['balancer v2', 'balancer'],
  },
  {
    id: 'dex-velodrome',
    name: 'Velodrome',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/velodrome',
    primaryChain: 'Optimism',
    subtitle: 'Superchain ve(3,3) Liquidity Hub',
    trustScore: 8,
    volume24hUsd: 96_000_000,
    volume24hBtc: 1_018,
    change24hPct: 4.65,
    liquidityUsd: 210_000_000,
    liquidityLabel: '$210M OP TVL',
    healthStatus: 'Healthy',
    launchUrl: 'https://velodrome.finance/swap',
    llamaSlugs: ['velodrome-v3', 'velodrome-v2', 'velodrome-v1', 'velodrome'],
    llamaNameIncludes: ['velodrome'],
  },
  {
    id: 'dex-trader-joe',
    name: 'Trader Joe',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/trader-joe',
    primaryChain: 'Arbitrum',
    subtitle: 'Liquidity Book Zero-Slippage Bins',
    trustScore: 8,
    volume24hUsd: 84_000_000,
    volume24hBtc: 891,
    change24hPct: 2.52,
    liquidityUsd: 145_000_000,
    liquidityLabel: '$145M LB TVL',
    healthStatus: 'Healthy',
    launchUrl: 'https://lfj.gg/',
    llamaSlugs: ['trader-joe', 'trader-joe-v2.1', 'lfj'],
    llamaNameIncludes: ['trader joe', 'lfj'],
  },
];

const DEX_KEYWORDS = [
  'uniswap',
  'pancakeswap',
  'raydium',
  'orca',
  'meteora',
  'aerodrome',
  'curve',
  'sushiswap',
  'balancer',
  'camelot',
  'velodrome',
  'hyperliquid',
  'dydx',
  'jupiter',
  'trader joe',
];

function isDexIdOrName(id: string, name: string): boolean {
  const hay = `${id} ${name}`.toLowerCase();
  return DEX_KEYWORDS.some((kw) => hay.includes(kw));
}

function mapLlamaChainToPrimary(
  chains: string[] | undefined,
  fallback: PrimaryChain
): PrimaryChain {
  if (!Array.isArray(chains) || chains.length === 0) return fallback;
  if (fallback === 'Multi-Chain') return 'Multi-Chain';
  const normalized = chains.map((c) => c.toLowerCase());
  if (normalized.includes('solana') && fallback === 'Solana') return 'Solana';
  if (normalized.includes('base') && fallback === 'Base') return 'Base';
  if (normalized.includes('arbitrum') && fallback === 'Arbitrum') return 'Arbitrum';
  if (normalized.includes('op mainnet') && fallback === 'Optimism') return 'Optimism';
  if (normalized.includes('bsc') && fallback === 'BNB Chain') return 'BNB Chain';
  if (normalized.includes('ethereum') && fallback === 'Ethereum') return 'Ethereum';
  return fallback;
}

export const GlobalExchangesView: React.FC<GlobalExchangesViewProps> = ({
  coins,
  globalStats,
  currency,
  fxRates,
}) => {
  const [filterMode, setFilterMode] = useState<ExchangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('volume');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [cexItems, setCexItems] = useState<ExchangeLeaderboardItem[]>(BASE_CEX_EXCHANGES);
  const [dexItems, setDexItems] = useState<ExchangeLeaderboardItem[]>(BASE_DEX_EXCHANGES);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [feedSourceLabel, setFeedSourceLabel] = useState<string>('CMC Global Anchor + Built-in Snapshot');
  const [logoErrorMap, setLogoErrorMap] = useState<Record<string, boolean>>({});

  // Live BTC price from existing live CMC coins feed (0 extra CMC credits)
  const liveBtcPriceUsd = useMemo(() => {
    const btc = coins.find((c) => c.symbol.toUpperCase() === 'BTC');
    return btc && btc.priceUsd > 0 ? btc.priceUsd : 94_280;
  }, [coins]);

  // Reconcile baseline volumes smoothly against live BTC price before or if external feeds are rate-limited
  useEffect(() => {
    setCexItems((prev) =>
      prev.map((item) =>
        item.isLiveFeed
          ? {
              ...item,
              volume24hUsd: Math.round(item.volume24hBtc * liveBtcPriceUsd),
            }
          : {
              ...item,
              volume24hBtc: item.volume24hUsd / liveBtcPriceUsd,
            }
      )
    );
    setDexItems((prev) =>
      prev.map((item) => ({
        ...item,
        volume24hBtc: item.volume24hUsd / liveBtcPriceUsd,
      }))
    );
  }, [liveBtcPriceUsd]);

  const syncLiveExchanges = useCallback(async () => {
    setIsSyncing(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      // Fetch CoinGecko Exchanges + DefiLlama DEX Overview in parallel (0 extra CMC credits)
      const [cgRes, llamaRes] = await Promise.allSettled([
        fetch('https://api.coingecko.com/api/v3/exchanges?per_page=30&page=1', {
          signal: controller.signal,
        }),
        fetch(
          'https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
          { signal: controller.signal }
        ),
      ]);

      clearTimeout(timer);

      let cgMatched = 0;
      let llamaMatched = 0;

      // 1. Process CoinGecko live exchanges
      if (cgRes.status === 'fulfilled' && cgRes.value.ok) {
        const rawCg = (await cgRes.value.json()) as CoinGeckoExchangeRow[];
        if (Array.isArray(rawCg) && rawCg.length > 0) {
          const baseMap = new Map<string, ExchangeLeaderboardItem>();
          for (const b of BASE_CEX_EXCHANGES) {
            if (b.geckoId) baseMap.set(b.geckoId.toLowerCase(), b);
            baseMap.set(b.name.toLowerCase(), b);
          }

          const updatedCex: ExchangeLeaderboardItem[] = [];
          const seenNames = new Set<string>();

          for (const row of rawCg) {
            const id = String(row.id || '').toLowerCase();
            const name = String(row.name || '').trim();
            if (!name) continue;
            const btcVol = Number(row.trade_volume_24h_btc) || 0;
            if (btcVol <= 0) continue;

            // Skip DEX entries in CoinGecko loop if handled cleanly by DefiLlama DEX table
            if (isDexIdOrName(id, name)) continue;

            const existing = baseMap.get(id) || baseMap.get(name.toLowerCase());
            const usdVol = Math.round(btcVol * liveBtcPriceUsd);
            const trust = Math.min(
              10,
              Math.max(1, Number(row.trust_score) || existing?.trustScore || 8)
            );
            const liqEst = existing?.liquidityUsd || Math.round(usdVol * 3.8);

            updatedCex.push({
              id: existing?.id || `cg-${id}`,
              geckoId: id,
              name: existing?.name || name,
              type: 'CEX',
              logo: row.image || existing?.logo || '',
              country: row.country || existing?.country || 'Global',
              subtitle:
                existing?.subtitle ||
                (row.country ? `${row.country} · Spot Order Book` : 'Spot Order Book'),
              trustScore: trust,
              volume24hUsd: usdVol,
              volume24hBtc: btcVol,
              liquidityUsd: liqEst,
              liquidityLabel:
                existing?.liquidityLabel || `${formatCompactCurrency(liqEst, 'USD', fxRates)} Est. Depth`,
              healthStatus: trust >= 9 ? 'Optimal' : trust >= 7 ? 'Deep' : 'Healthy',
              launchUrl: row.url || existing?.launchUrl || 'https://www.coingecko.com/en/exchanges',
              isLiveFeed: true,
            });
            seenNames.add((existing?.name || name).toLowerCase());
            cgMatched += 1;
          }

          // Ensure all 10 anchor CEXs remain included if absent from page 1
          for (const b of BASE_CEX_EXCHANGES) {
            if (!seenNames.has(b.name.toLowerCase())) {
              updatedCex.push({
                ...b,
                volume24hBtc: b.volume24hUsd / liveBtcPriceUsd,
              });
            }
          }

          // Keep top 12 CEXs cleanly sorted
          updatedCex.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
          setCexItems(updatedCex.slice(0, 14));
        }
      }

      // 2. Process DefiLlama live DEX volumes
      if (llamaRes.status === 'fulfilled' && llamaRes.value.ok) {
        const llamaJson = (await llamaRes.value.json()) as { protocols?: LlamaDexProtocol[] };
        const protocols = Array.isArray(llamaJson?.protocols) ? llamaJson.protocols : [];

        if (protocols.length > 0) {
          const mergedDexes = BASE_DEX_EXCHANGES.map((dex) => {
            const slugs = dex.llamaSlugs || [];
            const nameIncludes = dex.llamaNameIncludes || [];

            const matchingProtocols = protocols.filter((p) => {
              const pSlug = String(p.slug || '').toLowerCase();
              const pName = String(p.name || p.displayName || '').toLowerCase();
              if (slugs.includes(pSlug)) return true;
              return nameIncludes.some((kw) => pName === kw || pSlug === kw);
            });

            const validMatches = matchingProtocols.filter(
              (m) => typeof m.total24h === 'number' && Number.isFinite(m.total24h) && m.total24h > 0
            );

            if (validMatches.length === 0) {
              return {
                ...dex,
                volume24hBtc: dex.volume24hUsd / liveBtcPriceUsd,
              };
            }

            const liveVol24h = Math.round(
              validMatches.reduce((sum, m) => sum + (m.total24h || 0), 0)
            );
            const primaryMatch = validMatches.sort(
              (a, b) => (b.total24h || 0) - (a.total24h || 0)
            )[0];

            llamaMatched += 1;
            const liveChange =
              typeof primaryMatch.change_1d === 'number' &&
              Number.isFinite(primaryMatch.change_1d)
                ? Number(primaryMatch.change_1d.toFixed(2))
                : dex.change24hPct;

            return {
              ...dex,
              volume24hUsd: liveVol24h,
              volume24hBtc: liveVol24h / liveBtcPriceUsd,
              change24hPct: liveChange,
              primaryChain: mapLlamaChainToPrimary(
                primaryMatch.chains,
                dex.primaryChain || 'Multi-Chain'
              ),
              logo: primaryMatch.logo || dex.logo,
              isLiveFeed: true,
            };
          });

          setDexItems(mergedDexes);
        }
      }

      if (cgMatched > 0 && llamaMatched > 0) {
        setFeedSourceLabel(`Live CoinGecko (${cgMatched} CEX) + DefiLlama (${llamaMatched} DEX)`);
      } else if (cgMatched > 0) {
        setFeedSourceLabel(`Live CoinGecko (${cgMatched} CEXs) + DEX Baseline`);
      } else if (llamaMatched > 0) {
        setFeedSourceLabel(`Live DefiLlama (${llamaMatched} DEXs) + CEX Baseline`);
      } else {
        setFeedSourceLabel('Built-in Reconciled Snapshot (0 Extra CMC Credits)');
      }
    } catch {
      setFeedSourceLabel('Built-in Reconciled Snapshot (Offline Safe)');
    } finally {
      setIsSyncing(false);
    }
  }, [liveBtcPriceUsd, fxRates]);

  useEffect(() => {
    syncLiveExchanges();
  }, [syncLiveExchanges]);

  // Combined ranked list sorted highest 24h volume to lowest
  const allRankedExchanges = useMemo(() => {
    const combined = [...cexItems, ...dexItems].sort(
      (a, b) => b.volume24hUsd - a.volume24hUsd
    );
    const trackedSumVol = combined.reduce((acc, item) => acc + item.volume24hUsd, 0) || 1;
    // Anchor global volume denominator to CMC Global 24h Volume when valid & >= tracked sum, else tracked sum
    const globalVolDenominator = Math.max(
      trackedSumVol,
      globalStats.totalVolume24hUsd > 0 ? globalStats.totalVolume24hUsd : 0
    );

    return combined.map((item, idx) => ({
      ...item,
      globalRank: idx + 1,
      sharePct: (item.volume24hUsd / globalVolDenominator) * 100,
    }));
  }, [cexItems, dexItems, globalStats.totalVolume24hUsd]);

  const counts = useMemo(() => {
    const cexCount = allRankedExchanges.filter((e) => e.type === 'CEX').length;
    const dexCount = allRankedExchanges.filter((e) => e.type === 'DEX').length;
    return {
      all: allRankedExchanges.length,
      cex: cexCount,
      dex: dexCount,
    };
  }, [allRankedExchanges]);

  const kpiMetrics = useMemo(() => {
    const trackedSumVol = allRankedExchanges.reduce((acc, e) => acc + e.volume24hUsd, 0);
    const totalGlobalVolUsd = Math.max(
      trackedSumVol,
      globalStats.totalVolume24hUsd > 0 ? globalStats.totalVolume24hUsd : 0
    );
    const totalGlobalVolBtc = totalGlobalVolUsd / liveBtcPriceUsd;

    const totalCexVol = allRankedExchanges
      .filter((e) => e.type === 'CEX')
      .reduce((acc, e) => acc + e.volume24hUsd, 0);
    const totalDexVol = allRankedExchanges
      .filter((e) => e.type === 'DEX')
      .reduce((acc, e) => acc + e.volume24hUsd, 0);
    const flowTotal = totalCexVol + totalDexVol || 1;
    const cexFlowPct = (totalCexVol / flowTotal) * 100;
    const dexFlowPct = (totalDexVol / flowTotal) * 100;

    const leader = allRankedExchanges[0];

    return {
      totalGlobalMarketCapUsd: globalStats.totalMarketCapUsd,
      marketCapChange24h: globalStats.marketCapChange24h,
      totalGlobalVolUsd,
      totalGlobalVolBtc,
      leaderName: leader?.name || 'Binance',
      leaderSharePct: leader?.sharePct || 0,
      cexFlowPct,
      dexFlowPct,
    };
  }, [allRankedExchanges, globalStats.totalMarketCapUsd, globalStats.marketCapChange24h, globalStats.totalVolume24hUsd, liveBtcPriceUsd]);

  const displayedExchanges = useMemo(() => {
    let list = [...allRankedExchanges];

    if (filterMode === 'top10') {
      list = list.slice(0, 10);
    } else if (filterMode === 'cex') {
      list = list.filter((e) => e.type === 'CEX');
    } else if (filterMode === 'dex') {
      list = list.filter((e) => e.type === 'DEX');
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          (e.country && e.country.toLowerCase().includes(q)) ||
          (e.primaryChain && e.primaryChain.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'volume') {
        diff = b.volume24hUsd - a.volume24hUsd;
      } else if (sortBy === 'btcVolume') {
        diff = b.volume24hBtc - a.volume24hBtc;
      } else if (sortBy === 'share') {
        diff = b.sharePct - a.sharePct;
      } else if (sortBy === 'trust') {
        diff = b.trustScore - a.trustScore;
      } else if (sortBy === 'name') {
        diff = a.name.localeCompare(b.name);
      }
      return sortAsc ? -diff : diff;
    });

    return list;
  }, [allRankedExchanges, filterMode, searchQuery, sortBy, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const formatBtcVol = (btcVal: number): string => {
    if (!Number.isFinite(btcVal) || btcVal <= 0) return '0 BTC';
    if (btcVal >= 1000) {
      return `${Math.round(btcVal).toLocaleString('en-US')} BTC`;
    }
    return `${btcVal.toLocaleString('en-US', { maximumFractionDigits: 1 })} BTC`;
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-400 font-mono text-xs font-extrabold shadow-sm shadow-amber-500/10">
          #1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-300/20 border border-slate-300/45 text-slate-600 dark:text-slate-200 font-mono text-xs font-bold">
          #2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-400/45 text-orange-500 dark:text-orange-300 font-mono text-xs font-bold">
          #3
        </span>
      );
    }
    return (
      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header + 3 Top KPI Summary Cards */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#0D1322]/95 backdrop-blur-md p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/35 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Global Exchanges &amp; Liquidity Share
                </h2>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Market Data</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ranked dynamically by real-time 24h Spot Volume &amp; Global Capital Flow (Live Market Data)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{feedSourceLabel}</span>
            </span>
            <button
              type="button"
              onClick={syncLiveExchanges}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* 3 Top KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Total Global Market Cap */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#11182B]">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Total Global Market Cap</span>
              </span>
              <span
                className={`font-mono font-semibold ${
                  kpiMetrics.marketCapChange24h >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatPercent(kpiMetrics.marketCapChange24h)}
              </span>
            </div>
            <div className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white mt-1.5">
              {formatCompactCurrency(kpiMetrics.totalGlobalMarketCapUsd, currency, fxRates)}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              {currency !== 'USD'
                ? `${formatCompactCurrency(kpiMetrics.totalGlobalMarketCapUsd, 'USD', fxRates)} USD · `
                : ''}
              Anchored to Live CMC Global Metrics
            </div>
          </div>

          {/* Card 2: Total Global 24h Exchange Volume */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#11182B]">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total Global 24h Exchange Volume</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                BTC ${liveBtcPriceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white mt-1.5">
              {formatCompactCurrency(kpiMetrics.totalGlobalVolUsd, currency, fxRates)}
            </div>
            <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mt-1">
              {formatBtcVol(kpiMetrics.totalGlobalVolBtc)}
              {currency !== 'USD' && (
                <span className="text-slate-400 ml-1.5">
                  ({formatCompactCurrency(kpiMetrics.totalGlobalVolUsd, 'USD', fxRates)})
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Top Exchange Liquidity Concentration */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#11182B]">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Exchange Liquidity Concentration</span>
              </span>
              <span className="font-mono font-bold text-cyan-500 dark:text-cyan-300">
                #{1} {kpiMetrics.leaderName}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
                {kpiMetrics.leaderSharePct.toFixed(1)}%
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-300">
                <span className="text-cyan-500 font-semibold">
                  CEX {kpiMetrics.cexFlowPct.toFixed(1)}%
                </span>
                {' · '}
                <span className="text-fuchsia-500 font-semibold">
                  DEX {kpiMetrics.dexFlowPct.toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400"
                style={{ width: `${Math.max(4, kpiMetrics.cexFlowPct)}%` }}
                title={`CEX Capital Flow: ${kpiMetrics.cexFlowPct.toFixed(1)}%`}
              />
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-400"
                style={{ width: `${Math.max(4, kpiMetrics.dexFlowPct)}%` }}
                title={`DEX Capital Flow: ${kpiMetrics.dexFlowPct.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="inline-flex flex-wrap items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#090D16] p-1 gap-1">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Exchanges ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('top10')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'top10'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/35 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-400'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Top 10 Dominance</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('cex')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'cex'
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/35 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-cyan-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>CEX Only ({counts.cex})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('dex')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'dex'
                  ? 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/35 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-fuchsia-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
              <span>DEX Only ({counts.dex})</span>
            </button>
          </div>

          <div className="relative flex-1 min-w-[230px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exchange or chain (Binance, Uniswap, Solana)..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Exchanges Leaderboard Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1322] overflow-hidden">
        {displayedExchanges.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No exchanges matched your filter
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterMode('all');
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#12192A] border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-3 w-14 text-center">Rank</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Exchange &amp; Trust Score</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
                    onClick={() => toggleSort('volume')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>24h Volume ({currency === 'USD' ? 'USD' : `${currency} / USD`})</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
                    onClick={() => toggleSort('btcVolume')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>24h Volume (BTC)</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
                    onClick={() => toggleSort('share')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>% Global Share</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
                    onClick={() => toggleSort('trust')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Liquidity / Reserve Flow</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right pr-4">Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                {displayedExchanges.map((ex) => {
                  const isDex = ex.type === 'DEX';
                  const hasImgErr = logoErrorMap[ex.id];

                  return (
                    <tr
                      key={ex.id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Rank (#1, #2, #3 Gold/Silver/Bronze) */}
                      <td className="py-3.5 px-3 text-center">
                        {renderRankBadge(ex.globalRank)}
                      </td>

                      {/* Exchange Name, Logo, Type Badge, Trust Score (1-10), Primary Chain */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          {ex.logo && !hasImgErr ? (
                            <img
                              src={ex.logo}
                              alt={ex.name}
                              className="w-7 h-7 rounded-full object-contain shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                              onError={() =>
                                setLogoErrorMap((prev) => ({ ...prev, [ex.id]: true }))
                              }
                            />
                          ) : (
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isDex
                                  ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/35'
                                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/35'
                              }`}
                            >
                              {ex.name.charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {ex.name}
                              </span>
                              <span
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  isDex
                                    ? 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/35'
                                    : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/35'
                                }`}
                              >
                                {ex.type}
                              </span>
                              <span
                                title="Exchange Trust Score (1–10)"
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  ex.trustScore >= 9
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {ex.trustScore}/10
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {isDex && ex.primaryChain ? (
                                <span
                                  className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                    CHAIN_BADGE_STYLES[ex.primaryChain]
                                  }`}
                                >
                                  {ex.primaryChain}
                                </span>
                              ) : null}
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {ex.subtitle}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 24h Volume (USD + Currency) */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {formatCompactCurrency(ex.volume24hUsd, currency, fxRates)}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px] font-mono">
                          {currency !== 'USD' && (
                            <span className="text-slate-400">
                              {formatCompactCurrency(ex.volume24hUsd, 'USD', fxRates)}
                            </span>
                          )}
                          {typeof ex.change24hPct === 'number' && (
                            <span
                              className={
                                ex.change24hPct >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {formatPercent(ex.change24hPct)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 24h Volume (BTC) */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {formatBtcVol(ex.volume24hBtc)}
                      </td>

                      {/* % Share of Total Global Volume */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {ex.sharePct.toFixed(2)}%
                          </span>
                          <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isDex
                                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-400 shadow-[0_0_8px_rgba(217,70,239,0.5)]'
                                  : 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(4, ex.sharePct * 2.4))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Liquidity / Reserve Flow Indicator */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              ex.healthStatus === 'Optimal'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                : ex.healthStatus === 'Deep'
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/25'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25'
                            }`}
                          >
                            {ex.healthStatus === 'Optimal' ? (
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span>{ex.healthStatus}</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {ex.liquidityLabel}
                          </span>
                        </div>
                      </td>

                      {/* Visit / Launch DEX */}
                      <td className="py-3.5 px-3 text-right pr-4">
                        <a
                          href={ex.launchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                            isDex
                              ? 'bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/35'
                              : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-300 border-cyan-500/35'
                          }`}
                        >
                          <span>{isDex ? 'Launch DEX' : 'Visit'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
