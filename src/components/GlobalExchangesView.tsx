import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Crown,
  ExternalLink,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent } from '../utils/formatters';

interface GlobalExchangesViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  totalMarketVol24hUsd?: number;
}

type ExchangeFilter = 'all' | 'cex' | 'dex' | 'top10';
type SortField = 'volume' | 'share' | 'liquidity' | 'name';

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
  name: string;
  type: 'CEX' | 'DEX';
  logo: string;
  primaryChain?: PrimaryChain;
  subtitle: string;
  volume24hUsd: number;
  change24hPct: number;
  liquidityUsd: number;
  liquidityLabel: string;
  healthStatus: 'Optimal' | 'Deep' | 'Healthy';
  launchUrl: string;
  isLiveDexFeed?: boolean;
  /** DefiLlama slug prefixes/exact slugs used to match live 24h volumes */
  llamaSlugs?: string[];
  llamaNameIncludes?: string[];
}

const CHAIN_BADGE_STYLES: Record<PrimaryChain, string> = {
  Ethereum:
    'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
  Solana:
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  'BNB Chain':
    'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  Base: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
  Arbitrum:
    'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
  Optimism:
    'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
  'Multi-Chain':
    'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30',
};

const BASE_CEX_EXCHANGES: ExchangeLeaderboardItem[] = [
  {
    id: 'cex-binance',
    name: 'Binance',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/270.png',
    subtitle: 'Global Spot & Institutional Custody',
    volume24hUsd: 21_450_000_000,
    change24hPct: 4.28,
    liquidityUsd: 138_000_000_000,
    liquidityLabel: '$138.0B PoR Reserves',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.binance.com/en/markets/overview',
  },
  {
    id: 'cex-coinbase',
    name: 'Coinbase',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/89.png',
    subtitle: 'US Regulated USD Spot Order Book',
    volume24hUsd: 4_890_000_000,
    change24hPct: 2.94,
    liquidityUsd: 89_500_000_000,
    liquidityLabel: '$89.5B Custody Depth',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.coinbase.com/advanced-trade',
  },
  {
    id: 'cex-bybit',
    name: 'Bybit',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/521.png',
    subtitle: 'High-Throughput Spot & Perps',
    volume24hUsd: 5_620_000_000,
    change24hPct: 5.12,
    liquidityUsd: 19_400_000_000,
    liquidityLabel: '$19.4B PoR Reserves',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.bybit.com/en/markets/overview',
  },
  {
    id: 'cex-okx',
    name: 'OKX',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/294.png',
    subtitle: 'Unified Multi-Asset Order Book',
    volume24hUsd: 4_310_000_000,
    change24hPct: 3.15,
    liquidityUsd: 24_800_000_000,
    liquidityLabel: '$24.8B PoR Reserves',
    healthStatus: 'Optimal',
    launchUrl: 'https://www.okx.com/markets/prices',
  },
  {
    id: 'cex-upbit',
    name: 'Upbit',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/351.png',
    subtitle: 'KRW & Altcoin Liquidity Hub',
    volume24hUsd: 3_780_000_000,
    change24hPct: 6.45,
    liquidityUsd: 14_200_000_000,
    liquidityLabel: '$14.2B Reserve Depth',
    healthStatus: 'Deep',
    launchUrl: 'https://upbit.com/exchange',
  },
  {
    id: 'cex-kraken',
    name: 'Kraken',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/24.png',
    subtitle: 'EUR / USD Institutional Spot',
    volume24hUsd: 1_940_000_000,
    change24hPct: 1.84,
    liquidityUsd: 17_600_000_000,
    liquidityLabel: '$17.6B PoR Audited',
    healthStatus: 'Optimal',
    launchUrl: 'https://pro.kraken.com',
  },
  {
    id: 'cex-kucoin',
    name: 'KuCoin',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/311.png',
    subtitle: 'Altcoin & Emerging Token Spot',
    volume24hUsd: 1_680_000_000,
    change24hPct: -1.12,
    liquidityUsd: 5_900_000_000,
    liquidityLabel: '$5.9B PoR Reserves',
    healthStatus: 'Deep',
    launchUrl: 'https://www.kucoin.com/markets',
  },
  {
    id: 'cex-gate',
    name: 'Gate.io',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/302.png',
    subtitle: 'Broad Spot Pair Discovery',
    volume24hUsd: 2_890_000_000,
    change24hPct: 2.31,
    liquidityUsd: 7_450_000_000,
    liquidityLabel: '$7.5B PoR Reserves',
    healthStatus: 'Deep',
    launchUrl: 'https://www.gate.io/marketlist',
  },
  {
    id: 'cex-bitget',
    name: 'Bitget',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/513.png',
    subtitle: 'Copy-Trading & Deep Spot Books',
    volume24hUsd: 2_540_000_000,
    change24hPct: 3.74,
    liquidityUsd: 6_800_000_000,
    liquidityLabel: '$6.8B Protection + PoR',
    healthStatus: 'Deep',
    launchUrl: 'https://www.bitget.com/markets',
  },
  {
    id: 'cex-htx',
    name: 'HTX',
    type: 'CEX',
    logo: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/102.png',
    subtitle: 'Global Multi-Market Exchange',
    volume24hUsd: 1_820_000_000,
    change24hPct: -0.68,
    liquidityUsd: 4_650_000_000,
    liquidityLabel: '$4.7B Merkle Reserves',
    healthStatus: 'Healthy',
    launchUrl: 'https://www.htx.com/markets',
  },
];

const BASE_DEX_EXCHANGES: ExchangeLeaderboardItem[] = [
  {
    id: 'dex-uniswap-v3',
    name: 'Uniswap v3',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/uniswap-v3',
    primaryChain: 'Ethereum',
    subtitle: 'Concentrated Liquidity AMM',
    volume24hUsd: 1_980_000_000,
    change24hPct: 6.18,
    liquidityUsd: 3_840_000_000,
    liquidityLabel: '$3.84B TVL',
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
    subtitle: 'On-Chain CLOB Spot & Perps L1',
    volume24hUsd: 1_640_000_000,
    change24hPct: 11.42,
    liquidityUsd: 1_920_000_000,
    liquidityLabel: '$1.92B TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://app.hyperliquid.xyz/trade',
    llamaSlugs: ['hyperliquid-spot-orderbook', 'hyperliquid'],
    llamaNameIncludes: ['hyperliquid spot', 'hyperliquid'],
  },
  {
    id: 'dex-raydium',
    name: 'Raydium',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/raydium',
    primaryChain: 'Solana',
    subtitle: 'Solana CLMM & Order-Book AMM',
    volume24hUsd: 1_280_000_000,
    change24hPct: 8.75,
    liquidityUsd: 1_480_000_000,
    liquidityLabel: '$1.48B TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://raydium.io/swap/',
    llamaSlugs: ['raydium-amm', 'raydium-clmm', 'raydium'],
    llamaNameIncludes: ['raydium'],
  },
  {
    id: 'dex-pancakeswap-v3',
    name: 'PancakeSwap v3',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/pancakeswap-amm-v3',
    primaryChain: 'BNB Chain',
    subtitle: 'Multi-Chain V3 AMM & Infinity',
    volume24hUsd: 940_000_000,
    change24hPct: 3.92,
    liquidityUsd: 1_760_000_000,
    liquidityLabel: '$1.76B TVL',
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
    volume24hUsd: 715_000_000,
    change24hPct: 9.35,
    liquidityUsd: 1_120_000_000,
    liquidityLabel: '$1.12B TVL',
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
    volume24hUsd: 620_000_000,
    change24hPct: 5.44,
    liquidityUsd: 940_000_000,
    liquidityLabel: '$940M TVL',
    healthStatus: 'Deep',
    launchUrl: 'https://aerodrome.finance/swap',
    llamaSlugs: ['aerodrome-slipstream', 'aerodrome-v1', 'aerodrome'],
    llamaNameIncludes: ['aerodrome'],
  },
  {
    id: 'dex-orca',
    name: 'Orca',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/orca-dex',
    primaryChain: 'Solana',
    subtitle: 'Solana Concentrated Whirlpools',
    volume24hUsd: 545_000_000,
    change24hPct: 4.11,
    liquidityUsd: 425_000_000,
    liquidityLabel: '$425M TVL',
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
    volume24hUsd: 510_000_000,
    change24hPct: 7.28,
    liquidityUsd: 780_000_000,
    liquidityLabel: '$780M TVL',
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
    volume24hUsd: 465_000_000,
    change24hPct: 6.02,
    liquidityUsd: 615_000_000,
    liquidityLabel: '$615M TVL',
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
    volume24hUsd: 430_000_000,
    change24hPct: 2.18,
    liquidityUsd: 520_000_000,
    liquidityLabel: '$520M TVL',
    healthStatus: 'Deep',
    launchUrl: 'https://dydx.trade/',
    llamaSlugs: ['dydx-v4', 'dydx'],
    llamaNameIncludes: ['dydx'],
  },
  {
    id: 'dex-curve',
    name: 'Curve DEX',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/curve',
    primaryChain: 'Ethereum',
    subtitle: 'StableSwap & Tricrypto Pools',
    volume24hUsd: 315_000_000,
    change24hPct: -1.45,
    liquidityUsd: 2_180_000_000,
    liquidityLabel: '$2.18B TVL',
    healthStatus: 'Optimal',
    launchUrl: 'https://curve.fi/#/ethereum/swap',
    llamaSlugs: ['curve-dex', 'curve'],
    llamaNameIncludes: ['curve dex'],
  },
  {
    id: 'dex-sushiswap',
    name: 'SushiSwap',
    type: 'DEX',
    logo: 'https://icons.llamao.fi/icons/protocols/sushiswap',
    primaryChain: 'Multi-Chain',
    subtitle: 'Cross-Chain AMM & RouteProcessor',
    volume24hUsd: 168_000_000,
    change24hPct: 1.94,
    liquidityUsd: 295_000_000,
    liquidityLabel: '$295M TVL',
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
    volume24hUsd: 142_000_000,
    change24hPct: 3.41,
    liquidityUsd: 185_000_000,
    liquidityLabel: '$185M TVL',
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
    volume24hUsd: 118_000_000,
    change24hPct: 0.87,
    liquidityUsd: 890_000_000,
    liquidityLabel: '$890M TVL',
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
    volume24hUsd: 96_000_000,
    change24hPct: 4.65,
    liquidityUsd: 210_000_000,
    liquidityLabel: '$210M TVL',
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
    volume24hUsd: 84_000_000,
    change24hPct: 2.52,
    liquidityUsd: 145_000_000,
    liquidityLabel: '$145M TVL',
    healthStatus: 'Healthy',
    launchUrl: 'https://lfj.gg/',
    llamaSlugs: ['trader-joe', 'trader-joe-v2.1', 'lfj'],
    llamaNameIncludes: ['trader joe', 'lfj'],
  },
];

interface LlamaDexProtocol {
  name?: string;
  displayName?: string;
  slug?: string;
  total24h?: number | null;
  change_1d?: number | null;
  chains?: string[];
  logo?: string;
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
  currency,
  fxRates,
  totalMarketVol24hUsd,
}) => {
  const [filterMode, setFilterMode] = useState<ExchangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('volume');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [dexItems, setDexItems] = useState<ExchangeLeaderboardItem[]>(BASE_DEX_EXCHANGES);
  const [isSyncingDex, setIsSyncingDex] = useState<boolean>(false);
  const [liveDexMatchCount, setLiveDexMatchCount] = useState<number>(0);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>('Baseline Ready');
  const [logoErrorMap, setLogoErrorMap] = useState<Record<string, boolean>>({});

  // Reconcile live BTC price from our existing live coins array (0 extra CMC credits)
  const liveBtcPriceUsd = useMemo(() => {
    const btc = coins.find((c) => c.symbol.toUpperCase() === 'BTC');
    return btc && btc.priceUsd > 0 ? btc.priceUsd : 94_280;
  }, [coins]);

  // Gently scale CEX spot baselines proportionally when global market volume updates
  const cexItems = useMemo(() => {
    const baselineCexSum = BASE_CEX_EXCHANGES.reduce((acc, e) => acc + e.volume24hUsd, 0);
    const targetMarketCexVol =
      totalMarketVol24hUsd && totalMarketVol24hUsd > 10_000_000_000
        ? totalMarketVol24hUsd * 0.72
        : baselineCexSum;
    const scale = Math.min(2.2, Math.max(0.55, targetMarketCexVol / baselineCexSum));
    return BASE_CEX_EXCHANGES.map((e) => ({
      ...e,
      volume24hUsd: Math.round(e.volume24hUsd * scale),
    }));
  }, [totalMarketVol24hUsd]);

  const fetchLiveDexVolumes = useCallback(async () => {
    setIsSyncingDex(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(
        'https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
        { signal: controller.signal }
      );
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`DefiLlama returned HTTP ${res.status}`);
      }

      const data = (await res.json()) as { protocols?: LlamaDexProtocol[] };
      const protocols = Array.isArray(data?.protocols) ? data.protocols : [];

      if (protocols.length === 0) {
        return;
      }

      let matchedCount = 0;
      const mergedDexes = BASE_DEX_EXCHANGES.map((dex) => {
        const slugs = dex.llamaSlugs || [];
        const nameIncludes = dex.llamaNameIncludes || [];

        const matchingProtocols = protocols.filter((p) => {
          const pSlug = String(p.slug || '').toLowerCase();
          const pName = String(p.name || p.displayName || '').toLowerCase();
          if (slugs.includes(pSlug)) return true;
          return nameIncludes.some((kw) => pName === kw || pSlug === kw);
        });

        // Sum positive 24h volumes across matched version pools (e.g. Aerodrome v1 + Slipstream)
        const validMatches = matchingProtocols.filter(
          (m) => typeof m.total24h === 'number' && Number.isFinite(m.total24h) && m.total24h > 0
        );

        if (validMatches.length === 0) {
          return dex;
        }

        const liveVol24h = validMatches.reduce((sum, m) => sum + (m.total24h || 0), 0);
        const primaryMatch = validMatches.sort(
          (a, b) => (b.total24h || 0) - (a.total24h || 0)
        )[0];

        if (liveVol24h > 0) {
          matchedCount += 1;
          const liveChange =
            typeof primaryMatch.change_1d === 'number' &&
            Number.isFinite(primaryMatch.change_1d)
              ? primaryMatch.change_1d
              : dex.change24hPct;

          return {
            ...dex,
            volume24hUsd: Math.round(liveVol24h),
            change24hPct: Number(liveChange.toFixed(2)),
            primaryChain: mapLlamaChainToPrimary(
              primaryMatch.chains,
              dex.primaryChain || 'Multi-Chain'
            ),
            logo: primaryMatch.logo || dex.logo,
            isLiveDexFeed: true,
          };
        }

        return dex;
      });

      setDexItems(mergedDexes);
      setLiveDexMatchCount(matchedCount);
      setLastUpdatedLabel(
        matchedCount > 0
          ? `DefiLlama Live (${matchedCount}/${BASE_DEX_EXCHANGES.length} DEXs)`
          : 'Synced'
      );
    } catch {
      // Built-in realistic fallback volumes remain active so 15+ DEXs always render cleanly
      setLastUpdatedLabel('Built-in Snapshot (Offline Safe)');
    } finally {
      setIsSyncingDex(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDexVolumes();
  }, [fetchLiveDexVolumes]);

  // Combined list strictly sorted by 24h Volume descending for global ranking & share calculation
  const allRankedExchanges = useMemo(() => {
    const combined = [...cexItems, ...dexItems].sort(
      (a, b) => b.volume24hUsd - a.volume24hUsd
    );
    const globalTotalVol = combined.reduce((acc, item) => acc + item.volume24hUsd, 0) || 1;
    return combined.map((item, idx) => ({
      ...item,
      globalRank: idx + 1,
      sharePct: (item.volume24hUsd / globalTotalVol) * 100,
      volumeBtc: item.volume24hUsd / liveBtcPriceUsd,
    }));
  }, [cexItems, dexItems, liveBtcPriceUsd]);

  const counts = useMemo(() => {
    const cexCount = allRankedExchanges.filter((e) => e.type === 'CEX').length;
    const dexCount = allRankedExchanges.filter((e) => e.type === 'DEX').length;
    return {
      all: allRankedExchanges.length,
      cex: cexCount,
      dex: dexCount,
    };
  }, [allRankedExchanges]);

  const summaryStats = useMemo(() => {
    const totalGlobalVol = allRankedExchanges.reduce((acc, e) => acc + e.volume24hUsd, 0);
    const totalCexVol = allRankedExchanges
      .filter((e) => e.type === 'CEX')
      .reduce((acc, e) => acc + e.volume24hUsd, 0);
    const totalDexVol = allRankedExchanges
      .filter((e) => e.type === 'DEX')
      .reduce((acc, e) => acc + e.volume24hUsd, 0);
    const top10Vol = allRankedExchanges
      .slice(0, 10)
      .reduce((acc, e) => acc + e.volume24hUsd, 0);
    const dexSharePct = totalGlobalVol > 0 ? (totalDexVol / totalGlobalVol) * 100 : 0;
    const top10SharePct = totalGlobalVol > 0 ? (top10Vol / totalGlobalVol) * 100 : 0;
    const topDex = allRankedExchanges.find((e) => e.type === 'DEX');
    return {
      totalGlobalVol,
      totalCexVol,
      totalDexVol,
      dexSharePct,
      top10SharePct,
      topDex,
    };
  }, [allRankedExchanges]);

  const displayedExchanges = useMemo(() => {
    let list = [...allRankedExchanges];

    if (filterMode === 'cex') {
      list = list.filter((e) => e.type === 'CEX');
    } else if (filterMode === 'dex') {
      list = list.filter((e) => e.type === 'DEX');
    } else if (filterMode === 'top10') {
      list = list.slice(0, 10);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          (e.primaryChain && e.primaryChain.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'volume') {
        diff = b.volume24hUsd - a.volume24hUsd;
      } else if (sortBy === 'share') {
        diff = b.sharePct - a.sharePct;
      } else if (sortBy === 'liquidity') {
        diff = b.liquidityUsd - a.liquidityUsd;
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

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-[#0D1322]/90 backdrop-blur-md p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Global Exchanges &amp; Liquidity Share
                </h2>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{liveDexMatchCount > 0 ? 'Live DefiLlama DEX Feed' : '0 Extra CMC Credits'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Unified 24h spot volume &amp; liquidity ranking across {counts.cex} top Centralized Exchanges and {counts.dex} Decentralized Protocols · Reconciled at BTC ={' '}
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                  ${liveBtcPriceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg">
              <Activity className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>{lastUpdatedLabel}</span>
            </span>
            <button
              type="button"
              onClick={fetchLiveDexVolumes}
              disabled={isSyncingDex}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDex ? 'animate-spin' : ''}`} />
              <span>{isSyncingDex ? 'Syncing DEXs...' : 'Refresh DEXs'}</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182B]">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Combined 24h Volume</span>
            </div>
            <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white mt-1">
              {formatCompactCurrency(summaryStats.totalGlobalVol, currency, fxRates)}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {formatBtcVol(summaryStats.totalGlobalVol / liveBtcPriceUsd)} · {counts.all} Venues
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182B]">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>CEX 24h Volume ({counts.cex})</span>
            </div>
            <div className="font-mono tabular-nums text-base font-bold text-cyan-600 dark:text-cyan-300 mt-1">
              {formatCompactCurrency(summaryStats.totalCexVol, currency, fxRates)}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {(100 - summaryStats.dexSharePct).toFixed(1)}% of Global Share
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182B]">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
              <span>DEX 24h Volume ({counts.dex})</span>
            </div>
            <div className="font-mono tabular-nums text-base font-bold text-fuchsia-600 dark:text-fuchsia-300 mt-1">
              {formatCompactCurrency(summaryStats.totalDexVol, currency, fxRates)}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {summaryStats.dexSharePct.toFixed(1)}% DEX Share · Leader:{' '}
              {summaryStats.topDex?.name || 'Uniswap v3'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182B]">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Top 10 Venue Dominance</span>
            </div>
            <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white mt-1">
              {summaryStats.top10SharePct.toFixed(1)}%
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1.5 overflow-hidden flex">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${Math.max(5, 100 - summaryStats.dexSharePct)}%` }}
              />
              <div
                className="h-full bg-fuchsia-500"
                style={{ width: `${Math.max(5, summaryStats.dexSharePct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Bar + Search */}
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
            <button
              type="button"
              onClick={() => setFilterMode('top10')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'top10'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/35 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-400'
              }`}
            >
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Top 10 Dominance</span>
            </button>
          </div>

          <div className="relative flex-1 min-w-[230px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter exchange or chain (Uniswap, Solana, Base)..."
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

      {/* Leaderboard Table */}
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
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Exchange / Protocol</span>
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
                  <th className="py-3 px-3 text-right">24h Vol (BTC)</th>
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
                    onClick={() => toggleSort('liquidity')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Liquidity / TVL Health</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right pr-4">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                {displayedExchanges.map((ex) => {
                  const isDex = ex.type === 'DEX';
                  const hasImgErr = logoErrorMap[ex.id];
                  const changePositive = ex.change24hPct >= 0;

                  return (
                    <tr
                      key={ex.id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Global Rank */}
                      <td className="py-3.5 px-3 text-center font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {ex.globalRank}
                      </td>

                      {/* Exchange + Logo + Type Badge + Primary Chain */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          {!hasImgErr ? (
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
                              {ex.isLiveDexFeed && (
                                <span
                                  title="Live 24h Volume synced from DefiLlama"
                                  className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  LIVE
                                </span>
                              )}
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

                      {/* 24h Volume (USD + Fiat) */}
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
                          <span
                            className={
                              changePositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {formatPercent(ex.change24hPct)}
                          </span>
                        </div>
                      </td>

                      {/* 24h Volume in BTC */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {formatBtcVol(ex.volumeBtc)}
                      </td>

                      {/* % Share Progress Bar */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {ex.sharePct.toFixed(2)}%
                          </span>
                          <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isDex
                                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-400'
                                  : 'bg-gradient-to-r from-cyan-500 to-sky-400'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(4, ex.sharePct * 2.4))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Liquidity / TVL Health Indicator */}
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

                      {/* Launch Action */}
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
                          <span>{isDex ? 'Launch DEX' : 'Visit CEX'}</span>
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
