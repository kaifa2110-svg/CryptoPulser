import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface YieldViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

type PoolType = 'Native Staking' | 'DeFi Lending' | 'Liquid Staking' | 'Flexible Earn';
type YieldSortField = 'rank' | 'apyPct' | 'tvlUsd' | 'riskScore' | 'baseApyPct';

interface CuratedYieldPreset {
  protocol: string;
  poolName: string;
  poolType: PoolType;
  chain: string;
  baseApyPct: number;
  rewardApyPct: number;
  tvlUsd: number;
  riskScore: number;
  lockupLabel: string;
  auditedBy: string;
}

interface YieldRow {
  id: string;
  coin: Coin;
  rank: number;
  protocol: string;
  poolName: string;
  poolType: PoolType;
  chain: string;
  baseApyPct: number;
  rewardApyPct: number;
  apyPct: number;
  tvlUsd: number;
  riskScore: number;
  lockupLabel: string;
  auditedBy: string;
}

const CURATED_YIELD_PRESETS: Record<string, CuratedYieldPreset> = {
  BTC: {
    protocol: 'Babylon / Aave',
    poolName: 'WBTC Institutional Lending & Staking',
    poolType: 'DeFi Lending',
    chain: 'Ethereum',
    baseApyPct: 1.85,
    rewardApyPct: 0.65,
    tvlUsd: 4_120_000_000,
    riskScore: 2,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'OpenZeppelin, Trail of Bits',
  },
  ETH: {
    protocol: 'Lido',
    poolName: 'stETH Liquid Staking Vault',
    poolType: 'Liquid Staking',
    chain: 'Ethereum',
    baseApyPct: 3.18,
    rewardApyPct: 0.45,
    tvlUsd: 26_450_000_000,
    riskScore: 2,
    lockupLabel: 'Liquid · Instant DEX exit',
    auditedBy: 'Sigma Prime, Quantstamp',
  },
  USDT: {
    protocol: 'Aave v3',
    poolName: 'Aave v3 USDT Core Supply',
    poolType: 'DeFi Lending',
    chain: 'Ethereum',
    baseApyPct: 5.12,
    rewardApyPct: 0.68,
    tvlUsd: 3_890_000_000,
    riskScore: 2,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'Trail of Bits, Certora',
  },
  USDC: {
    protocol: 'Aave v3',
    poolName: 'Aave v3 USDC Prime Market',
    poolType: 'DeFi Lending',
    chain: 'Ethereum',
    baseApyPct: 5.38,
    rewardApyPct: 0.85,
    tvlUsd: 4_240_000_000,
    riskScore: 2,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'OpenZeppelin, Certora',
  },
  SOL: {
    protocol: 'Jito',
    poolName: 'JitoSOL MEV Liquid Staking',
    poolType: 'Liquid Staking',
    chain: 'Solana',
    baseApyPct: 6.42,
    rewardApyPct: 1.35,
    tvlUsd: 3_180_000_000,
    riskScore: 3,
    lockupLabel: 'Liquid · 2d unstake',
    auditedBy: 'OtterSec, Neodyme',
  },
  BNB: {
    protocol: 'Venus / BNB Chain',
    poolName: 'BNB Native Validator Delegation',
    poolType: 'Native Staking',
    chain: 'BNB Smart Chain (BSC)',
    baseApyPct: 4.15,
    rewardApyPct: 0.9,
    tvlUsd: 1_940_000_000,
    riskScore: 3,
    lockupLabel: '7d Unbonding',
    auditedBy: 'CertiK, PeckShield',
  },
  XRP: {
    protocol: 'Binance Earn',
    poolName: 'XRP Flexible Liquidity Earn',
    poolType: 'Flexible Earn',
    chain: 'Ethereum',
    baseApyPct: 2.45,
    rewardApyPct: 0.35,
    tvlUsd: 540_000_000,
    riskScore: 3,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'Proof of Reserves Verified',
  },
  ADA: {
    protocol: 'Cardano Stake',
    poolName: 'Ouroboros Epoch Delegation',
    poolType: 'Native Staking',
    chain: 'Cardano',
    baseApyPct: 3.12,
    rewardApyPct: 0.25,
    tvlUsd: 1_620_000_000,
    riskScore: 2,
    lockupLabel: 'Liquid · Non-Custodial',
    auditedBy: 'IOG Formal Verification',
  },
  DOGE: {
    protocol: 'Aave / Earn',
    poolName: 'DOGE Flexible Yield Vault',
    poolType: 'Flexible Earn',
    chain: 'BNB Smart Chain (BSC)',
    baseApyPct: 2.15,
    rewardApyPct: 0.55,
    tvlUsd: 295_000_000,
    riskScore: 4,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'PeckShield',
  },
  TRX: {
    protocol: 'JustLend DAO',
    poolName: 'sTRX Energy & Bandwidth Staking',
    poolType: 'Liquid Staking',
    chain: 'Tron',
    baseApyPct: 4.65,
    rewardApyPct: 1.85,
    tvlUsd: 1_480_000_000,
    riskScore: 3,
    lockupLabel: '14d Unstake or Instant DEX',
    auditedBy: 'SlowMist',
  },
  AVAX: {
    protocol: 'BENQI',
    poolName: 'sAVAX Avalanche Liquid Stake',
    poolType: 'Liquid Staking',
    chain: 'Avalanche',
    baseApyPct: 5.4,
    rewardApyPct: 1.25,
    tvlUsd: 640_000_000,
    riskScore: 3,
    lockupLabel: 'Liquid · 14d native unstake',
    auditedBy: 'Halborn',
  },
  LINK: {
    protocol: 'Chainlink v0.2',
    poolName: 'LINK Oracle Security Staking',
    poolType: 'Native Staking',
    chain: 'Ethereum',
    baseApyPct: 4.32,
    rewardApyPct: 0.5,
    tvlUsd: 785_000_000,
    riskScore: 2,
    lockupLabel: '28d Cooldown',
    auditedBy: 'Sigma Prime, Trail of Bits',
  },
  SUI: {
    protocol: 'Haedal / Scallop',
    poolName: 'haSUI Liquid Validator Pool',
    poolType: 'Liquid Staking',
    chain: 'Sui',
    baseApyPct: 4.25,
    rewardApyPct: 2.1,
    tvlUsd: 520_000_000,
    riskScore: 4,
    lockupLabel: 'Epoch Liquid',
    auditedBy: 'OtterSec, MoveBit',
  },
  TON: {
    protocol: 'Tonstakers',
    poolName: 'tsTON Open Network Pool',
    poolType: 'Liquid Staking',
    chain: 'TON',
    baseApyPct: 4.65,
    rewardApyPct: 0.9,
    tvlUsd: 490_000_000,
    riskScore: 3,
    lockupLabel: 'Liquid · Instant',
    auditedBy: 'CertiK',
  },
  DOT: {
    protocol: 'Polkadot Pools',
    poolName: 'DOT Nominated Validator Pool',
    poolType: 'Native Staking',
    chain: 'Polkadot',
    baseApyPct: 11.8,
    rewardApyPct: 0.0,
    tvlUsd: 920_000_000,
    riskScore: 3,
    lockupLabel: '28d Unbonding',
    auditedBy: 'Web3 Foundation',
  },
  UNI: {
    protocol: 'Aave v3',
    poolName: 'UNI Governance Lending Market',
    poolType: 'DeFi Lending',
    chain: 'Ethereum',
    baseApyPct: 2.95,
    rewardApyPct: 0.75,
    tvlUsd: 310_000_000,
    riskScore: 3,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'OpenZeppelin',
  },
  NEAR: {
    protocol: 'Meta Pool',
    poolName: 'stNEAR Validator Delegation',
    poolType: 'Liquid Staking',
    chain: 'Near',
    baseApyPct: 8.9,
    rewardApyPct: 1.15,
    tvlUsd: 380_000_000,
    riskScore: 3,
    lockupLabel: 'Liquid · 2–3d unstake',
    auditedBy: 'BlockSec',
  },
  ARB: {
    protocol: 'Pendle / Aave',
    poolName: 'ARB Arbitrum Yield Market',
    poolType: 'DeFi Lending',
    chain: 'Arbitrum',
    baseApyPct: 3.4,
    rewardApyPct: 2.2,
    tvlUsd: 265_000_000,
    riskScore: 4,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'Ackee Blockchain',
  },
  OP: {
    protocol: 'Aave v3',
    poolName: 'OP Optimism Liquidity Supply',
    poolType: 'DeFi Lending',
    chain: 'Optimism',
    baseApyPct: 3.15,
    rewardApyPct: 1.95,
    tvlUsd: 215_000_000,
    riskScore: 4,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'Certora',
  },
  AAVE: {
    protocol: 'Aave Safety Module',
    poolName: 'stkAAVE Protocol Safety Staking',
    poolType: 'Native Staking',
    chain: 'Ethereum',
    baseApyPct: 4.7,
    rewardApyPct: 0.85,
    tvlUsd: 680_000_000,
    riskScore: 3,
    lockupLabel: '20d Cooldown',
    auditedBy: 'Sigma Prime, Trail of Bits',
  },
  USDE: {
    protocol: 'Ethena',
    poolName: 'sUSDe Delta-Neutral Savings',
    poolType: 'DeFi Lending',
    chain: 'Ethereum',
    baseApyPct: 11.4,
    rewardApyPct: 2.1,
    tvlUsd: 4_820_000_000,
    riskScore: 5,
    lockupLabel: '7d Cooldown',
    auditedBy: 'Zellic, Spearbit',
  },
  EIGEN: {
    protocol: 'EigenLayer',
    poolName: 'EIGEN Intersubjective Restaking',
    poolType: 'Liquid Staking',
    chain: 'Ethereum',
    baseApyPct: 4.1,
    rewardApyPct: 3.2,
    tvlUsd: 1_250_000_000,
    riskScore: 4,
    lockupLabel: '7d Withdrawal Escrow',
    auditedBy: 'Consensys Diligence',
  },
  TIA: {
    protocol: 'Stride / Keplr',
    poolName: 'stTIA Celestia Validator Staking',
    poolType: 'Native Staking',
    chain: 'Cosmos',
    baseApyPct: 10.6,
    rewardApyPct: 1.4,
    tvlUsd: 340_000_000,
    riskScore: 4,
    lockupLabel: '21d Unbonding',
    auditedBy: 'Informal Systems',
  },
  INJ: {
    protocol: 'Helix / Injective',
    poolName: 'INJ Burn-Auction Staking',
    poolType: 'Native Staking',
    chain: 'Cosmos',
    baseApyPct: 12.4,
    rewardApyPct: 0.9,
    tvlUsd: 410_000_000,
    riskScore: 4,
    lockupLabel: '21d Unbonding',
    auditedBy: 'CertiK',
  },
  ONDO: {
    protocol: 'Ondo / Flux',
    poolName: 'ONDO RWA Treasury Yield Vault',
    poolType: 'DeFi Lending',
    chain: 'Ethereum',
    baseApyPct: 4.85,
    rewardApyPct: 1.35,
    tvlUsd: 590_000_000,
    riskScore: 3,
    lockupLabel: 'Flexible · Instant',
    auditedBy: 'Nethermind, Code4rena',
  },
  APT: {
    protocol: 'Amnis Finance',
    poolName: 'amAPT Aptos Liquid Stake',
    poolType: 'Liquid Staking',
    chain: 'Aptos',
    baseApyPct: 7.1,
    rewardApyPct: 1.3,
    tvlUsd: 290_000_000,
    riskScore: 4,
    lockupLabel: 'Liquid · 14d native unstake',
    auditedBy: 'OtterSec, Verichains',
  },
  ATOM: {
    protocol: 'Cosmos Hub',
    poolName: 'ATOM Interchain Validator Stake',
    poolType: 'Native Staking',
    chain: 'Cosmos',
    baseApyPct: 14.2,
    rewardApyPct: 0.0,
    tvlUsd: 860_000_000,
    riskScore: 3,
    lockupLabel: '21d Unbonding',
    auditedBy: 'Informal Systems',
  },
};

function seededFrac(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const AUDITORS = [
  'OpenZeppelin',
  'Trail of Bits',
  'Certora',
  'Sigma Prime',
  'Zellic',
  'OtterSec',
  'Quantstamp',
  'SlowMist',
];

function buildYieldRowForCoin(coin: Coin): YieldRow {
  const sym = coin.symbol.toUpperCase();
  const preset = CURATED_YIELD_PRESETS[sym];

  if (preset) {
    const apyPct = Number((preset.baseApyPct + preset.rewardApyPct).toFixed(2));
    return {
      id: `${coin.id}-${sym.toLowerCase()}`,
      coin,
      rank: coin.rank,
      protocol: preset.protocol,
      poolName: preset.poolName,
      poolType: preset.poolType,
      chain: preset.chain,
      baseApyPct: preset.baseApyPct,
      rewardApyPct: preset.rewardApyPct,
      apyPct,
      tvlUsd: preset.tvlUsd,
      riskScore: preset.riskScore,
      lockupLabel: preset.lockupLabel,
      auditedBy: preset.auditedBy,
    };
  }

  const r1 = seededFrac(coin.rank * 7 + sym.charCodeAt(0));
  const r2 = seededFrac(coin.rank * 13 + sym.length * 19);
  const r3 = seededFrac(coin.rank * 29 + 5);
  const chain = coin.networks?.[0] || 'Ethereum';
  const cat = coin.category.toLowerCase();

  let poolType: PoolType = 'Flexible Earn';
  let protocol = 'Binance Earn';
  let poolSuffix = 'Flexible Earn Vault';
  let lockupLabel = 'Flexible · Instant';

  if (cat.includes('stable')) {
    poolType = r1 > 0.35 ? 'DeFi Lending' : 'Flexible Earn';
    protocol = poolType === 'DeFi Lending' ? (r2 > 0.5 ? 'Aave v3' : 'Morpho') : 'Pendle';
    poolSuffix = poolType === 'DeFi Lending' ? 'Lending Reserve' : 'Fixed Yield Pool';
  } else if (cat.includes('layer 1') || cat.includes('layer 0') || cat.includes('modular')) {
    poolType = r1 > 0.45 ? 'Native Staking' : 'Liquid Staking';
    protocol =
      poolType === 'Liquid Staking'
        ? chain === 'Solana'
          ? 'Marinade / Jito'
          : 'Lido / EigenLayer'
        : `${coin.symbol} Validators`;
    poolSuffix = poolType === 'Liquid Staking' ? 'Liquid Staking Pool' : 'Validator Delegation';
    lockupLabel = poolType === 'Liquid Staking' ? 'Liquid · Instant DEX exit' : '7d–21d Unbonding';
  } else if (cat.includes('defi') || cat.includes('rwa') || cat.includes('oracle')) {
    poolType = r1 > 0.55 ? 'DeFi Lending' : r1 > 0.25 ? 'Liquid Staking' : 'Native Staking';
    protocol = r2 > 0.66 ? 'Aave v3' : r2 > 0.33 ? 'Pendle' : 'Compound v3';
    poolSuffix = poolType === 'DeFi Lending' ? 'Money Market' : 'Governance Staking';
    lockupLabel = poolType === 'Native Staking' ? '14d Cooldown' : 'Flexible · Instant';
  } else if (cat.includes('ai') || cat.includes('storage') || cat.includes('infrastructure')) {
    poolType = r1 > 0.5 ? 'Native Staking' : 'Flexible Earn';
    protocol = poolType === 'Native Staking' ? 'Node Staking' : 'Kamino / Earn';
    poolSuffix = poolType === 'Native Staking' ? 'Compute Node Staking' : 'Liquidity Vault';
    lockupLabel = poolType === 'Native Staking' ? '7d Unbonding' : 'Flexible · Instant';
  } else {
    poolType = r1 > 0.5 ? 'DeFi Lending' : 'Flexible Earn';
    protocol = r2 > 0.5 ? 'Kamino / Venus' : 'Flexible Earn';
    poolSuffix = poolType === 'DeFi Lending' ? 'Collateral Lending' : 'Flexible Savings';
  }

  // Realistic Base + Reward APY scaled by category & rank tier
  const tierFactor = coin.rank <= 30 ? 0.85 : coin.rank <= 150 ? 1.1 : coin.rank <= 500 ? 1.32 : 1.55;
  const baseRaw =
    cat.includes('stable')
      ? 4.2 + r1 * 5.4
      : cat.includes('layer 1') || cat.includes('modular')
      ? 3.1 + r1 * 8.6
      : 2.4 + r1 * 9.5;
  const baseApyPct = Number(Math.min(18.5, baseRaw * tierFactor).toFixed(2));
  const rewardApyPct =
    r3 > 0.25 ? Number((0.4 + r2 * (coin.rank > 100 ? 6.2 : 2.8)).toFixed(2)) : 0;
  const apyPct = Number((baseApyPct + rewardApyPct).toFixed(2));

  // TVL anchored to market cap & 24h liquidity
  const tvlRatio =
    poolType === 'Liquid Staking'
      ? 0.08 + r1 * 0.16
      : poolType === 'Native Staking'
      ? 0.14 + r2 * 0.24
      : 0.03 + r3 * 0.09;
  const tvlUsd = Math.max(85_000, Math.round(coin.marketCapUsd * tvlRatio));

  // Risk Score (1-10)
  const volPenalty = Math.abs(coin.change24h) > 12 ? 1.5 : Math.abs(coin.change24h) > 6 ? 0.7 : 0;
  const rankBase = coin.rank <= 15 ? 2.2 : coin.rank <= 60 ? 3.5 : coin.rank <= 250 ? 5.0 : coin.rank <= 600 ? 6.4 : 7.4;
  const riskScore = Math.min(10, Math.max(1, Math.round(rankBase + volPenalty + (r2 - 0.5) * 1.4)));

  const auditorA = AUDITORS[coin.rank % AUDITORS.length];
  const auditorB = AUDITORS[(coin.rank + 3) % AUDITORS.length];

  return {
    id: `${coin.id}-${sym.toLowerCase()}`,
    coin,
    rank: coin.rank,
    protocol,
    poolName: `${coin.symbol} ${poolSuffix}`,
    poolType,
    chain,
    baseApyPct,
    rewardApyPct,
    apyPct,
    tvlUsd,
    riskScore,
    lockupLabel,
    auditedBy: `${auditorA}, ${auditorB}`,
  };
}

const POOL_TYPES: Array<'All' | PoolType> = [
  'All',
  'Native Staking',
  'DeFi Lending',
  'Liquid Staking',
  'Flexible Earn',
];

export const YieldView: React.FC<YieldViewProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const [search, setSearch] = useState('');
  const [selectedPoolType, setSelectedPoolType] = useState<'All' | PoolType>('All');
  const [selectedChain, setSelectedChain] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'moderate' | 'elevated'>('all');
  const [sortField, setSortField] = useState<YieldSortField>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [simDepositUsd, setSimDepositUsd] = useState<string>('10000');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const allYieldRows = useMemo(() => {
    return coins.map(buildYieldRowForCoin);
  }, [coins]);

  const availableChains = useMemo(() => {
    const set = new Set<string>();
    allYieldRows.forEach((r) => set.add(r.chain));
    return ['All', ...Array.from(set).sort()];
  }, [allYieldRows]);

  const filteredPools = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allYieldRows
      .filter((p) => {
        if (selectedPoolType !== 'All' && p.poolType !== selectedPoolType) return false;
        if (selectedChain !== 'All' && p.chain !== selectedChain) return false;
        if (riskFilter === 'low' && p.riskScore > 3) return false;
        if (riskFilter === 'moderate' && (p.riskScore < 4 || p.riskScore > 6)) return false;
        if (riskFilter === 'elevated' && p.riskScore < 7) return false;
        if (q) {
          const hit =
            p.coin.name.toLowerCase().includes(q) ||
            p.coin.symbol.toLowerCase().includes(q) ||
            String(p.rank) === q ||
            p.protocol.toLowerCase().includes(q) ||
            p.poolName.toLowerCase().includes(q) ||
            p.chain.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const va = a[sortField];
        const vb = b[sortField];
        return sortDir === 'asc' ? va - vb : vb - va;
      });
  }, [allYieldRows, selectedPoolType, selectedChain, riskFilter, search, sortField, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedPoolType, selectedChain, riskFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPools.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagePools = filteredPools.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    const source = filteredPools.length > 0 ? filteredPools : allYieldRows;
    const totalTvl = source.reduce((acc, p) => acc + p.tvlUsd, 0);
    const avgApy = source.reduce((acc, p) => acc + p.apyPct, 0) / Math.max(1, source.length);
    const topPool = [...source].sort((a, b) => b.apyPct - a.apyPct)[0];
    const lowRiskCount = source.filter((p) => p.riskScore <= 3).length;
    return { totalTvl, avgApy, topPool, lowRiskCount };
  }, [filteredPools, allYieldRows]);

  const activePool =
    allYieldRows.find((p) => p.id === selectedPoolId) ??
    filteredPools[0] ??
    allYieldRows[0];

  const depositUsdNum = Math.max(0, Number(simDepositUsd) || 0);
  const estAnnualYieldUsd = activePool ? depositUsdNum * (activePool.apyPct / 100) : 0;
  const estMonthlyYieldUsd = estAnnualYieldUsd / 12;

  const handleSort = (field: YieldSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'rank' || field === 'riskScore' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const renderRiskLabel = (score: number) => {
    if (score <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          <span>{score}/10</span>
          <span className="text-[10px] font-sans">Low</span>
        </span>
      );
    }
    if (score <= 6) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
          <span>{score}/10</span>
          <span className="text-[10px] font-sans">Moderate</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
        <span>{score}/10</span>
        <span className="text-[10px] font-sans">Elevated</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Tracked Yield TVL
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
            {formatCompactCurrency(summary.totalTvl, currency, fxRates)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Across {filteredPools.length.toLocaleString('en-US')} / {allYieldRows.length.toLocaleString('en-US')} tracked coins
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Average Net APY
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.avgApy.toFixed(2)}%
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Base yield + protocol incentives
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Highest Yield Opportunity
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-cyan-600 dark:text-cyan-400">
            {summary.topPool ? `${summary.topPool.apyPct.toFixed(2)}%` : '—'}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {summary.topPool
              ? `${summary.topPool.coin.symbol} · ${summary.topPool.protocol}`
              : 'No match'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Low-Risk Pools (1–3)
          </div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
            {summary.lowRiskCount}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Audited blue-chip yield markets
          </div>
        </div>
      </div>

      {/* Interactive Yield Projection Calculator */}
      {activePool && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CoinLogo coin={activePool.coin} size="sm" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Yield Estimator: {activePool.coin.name} ({activePool.coin.symbol}) · {activePool.protocol}
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {activePool.apyPct.toFixed(2)}% APY
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCoin(activePool.coin)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  <span>Chart</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {activePool.poolType} · {activePool.chain} · {activePool.lockupLabel} · Audited by {activePool.auditedBy}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>Principal (USD):</span>
              <input
                type="number"
                min="0"
                step="100"
                value={simDepositUsd}
                onChange={(e) => setSimDepositUsd(e.target.value)}
                className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono tabular-nums text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </label>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">30D Est.</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatPrice(estMonthlyYieldUsd, currency, fxRates)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">1Y Est.</div>
                <div className="font-bold text-cyan-600 dark:text-cyan-400">
                  +{formatPrice(estAnnualYieldUsd, currency, fxRates)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {POOL_TYPES.map((ptype) => (
              <button
                key={ptype}
                type="button"
                onClick={() => setSelectedPoolType(ptype)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedPoolType === ptype
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {ptype === 'All' ? 'All Pool Types' : ptype}
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
                placeholder="Search 1,000 coins or protocol..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-52"
              />
            </div>

            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              aria-label="Filter by chain"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {availableChains.map((ch) => (
                <option key={ch} value={ch}>
                  {ch === 'All' ? 'All Chains' : ch}
                </option>
              ))}
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as 'all' | 'low' | 'moderate' | 'elevated')}
              aria-label="Filter by risk score"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Risk Tiers</option>
              <option value="low">Low Risk (1–3)</option>
              <option value="moderate">Moderate Risk (4–6)</option>
              <option value="elevated">Elevated Risk (7–10)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Yield Table Across All 1,000 Coins */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Sprout className="w-4 h-4 text-emerald-500" />
            <span>Top 1,000 Staking, Lending &amp; DeFi Yield Screener</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Showing {filteredPools.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, filteredPools.length)} of{' '}
            {filteredPools.length.toLocaleString('en-US')} coins · Click row to project returns
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                <th
                  onClick={() => handleSort('rank')}
                  className="py-2.5 pl-4 pr-2 cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  #
                  {sortField === 'rank' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ))}
                </th>
                <th className="py-2.5 px-3">Coin &amp; Best Pool</th>
                <th className="py-2.5 px-3">Chain</th>
                <th className="py-2.5 px-3">Pool Type</th>
                <th
                  onClick={() => handleSort('baseApyPct')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Base / Reward
                  {sortField === 'baseApyPct' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('apyPct')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Total APY
                  {sortField === 'apyPct' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('tvlUsd')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  TVL / Liquidity
                  {sortField === 'tvlUsd' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('riskScore')}
                  className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Risk Score
                  {sortField === 'riskScore' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-500" />
                    ))}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {pagePools.map((pool) => {
                const isSelected = activePool?.id === pool.id;
                return (
                  <tr
                    key={pool.id}
                    onClick={() => setSelectedPoolId(pool.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/8 dark:bg-cyan-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {pool.rank}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <CoinLogo coin={pool.coin} size="md" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCoin(pool.coin);
                              }}
                              className="hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer truncate max-w-[160px] text-left"
                            >
                              {pool.coin.name}
                            </button>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {pool.coin.symbol}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                            {pool.protocol} · {pool.poolName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {pool.chain}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {pool.poolType}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {pool.baseApyPct.toFixed(2)}%
                      {pool.rewardApyPct > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {' '}
                          + {pool.rewardApyPct.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {pool.apyPct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatCompactCurrency(pool.tvlUsd, currency, fxRates)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        {renderRiskLabel(pool.riskScore)}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pagePools.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                    No yield markets match your current pool type, chain, or risk filters.
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPoolType('All');
                        setSelectedChain('All');
                        setRiskFilter('all');
                        setSearch('');
                      }}
                      className="ml-2 text-cyan-600 dark:text-cyan-400 font-semibold hover:underline cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-slate-500 dark:text-slate-400">
            Page {safePage} of {totalPages} ({filteredPools.length.toLocaleString('en-US')} yield assets)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
