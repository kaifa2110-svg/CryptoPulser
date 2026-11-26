import { buildBubbleRadarGraph } from '../data/cryptoEngine';
import {
  BubbleClusterType,
  BubbleEdge,
  BubbleNode,
  BubbleRadarGraph,
  Coin,
} from '../types/crypto';

export type BubbleChain = 'Ethereum' | 'Solana' | 'BSC' | 'Arbitrum' | 'Base';

export const BUBBLE_CHAINS: BubbleChain[] = [
  'Ethereum',
  'Solana',
  'BSC',
  'Arbitrum',
  'Base',
];

export interface TimeTravelStage {
  index: number;
  id: 'launch' | '6m' | '3m' | '1m' | 'live';
  label: string;
  caption: string;
}

export const TIME_TRAVEL_STAGES: TimeTravelStage[] = [
  { index: 0, id: 'launch', label: 'Launch Day', caption: 'Genesis Token Distribution' },
  { index: 1, id: '6m', label: '6M Ago', caption: 'Early Unlock & CEX Listing' },
  { index: 2, id: '3m', label: '3M Ago', caption: 'Mid-Cycle Liquidity Migration' },
  { index: 3, id: '1m', label: '1M Ago', caption: 'Recent Whale Rebalancing' },
  { index: 4, id: 'live', label: 'Live Today', caption: 'Current On-Chain Snapshot' },
];

export interface MagicNode extends BubbleNode {
  isMagicIntermediary: true;
  linkedHolders: string[];
  relayType: string;
}

export interface MagicEdge extends BubbleEdge {
  isMagicLink: true;
  clusterGroup: number;
}

export interface HiddenClusterSummary {
  clusterCount: number;
  linkedWalletsCount: number;
  combinedSupplyPct: number;
  alertHeadline: string;
  linkedNodeIds: string[];
}

export interface SupplyConcentrationBreakdown {
  top10WalletsPct: number;
  top50WalletsPct: number;
  next40WalletsPct: number;
  cexVaultsPct: number;
  circulatingRetailPct: number;
  dumpRiskScore: number;
  dumpRiskTier: 'Low' | 'Medium' | 'High';
  dumpRiskReason: string;
}

export interface HistoricalCohortSplit {
  teamInsidersPct: number;
  exchangesPct: number;
  retailHoldersPct: number;
}

export interface EnhancedBubbleRadarGraph extends BubbleRadarGraph {
  chain: BubbleChain;
  isNativeChain: boolean;
  stage: TimeTravelStage;
  magicNodes: MagicNode[];
  magicEdges: MagicEdge[];
  hiddenCluster: HiddenClusterSummary;
  concentration: SupplyConcentrationBreakdown;
  cohortSplit: HistoricalCohortSplit;
}

function hashStr(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeSolanaAddress(seed: number): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let out = '';
  let s = seed || 1234567;
  for (let i = 0; i < 44; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out += alphabet[s % alphabet.length];
  }
  return `${out.slice(0, 6)}...${out.slice(-5)}`;
}

function makeChainHex(seed: number): string {
  const p1 = hashStr(`a:${seed}`).toString(16).padStart(8, '0');
  const p2 = hashStr(`b:${seed}`).toString(16).padStart(8, '0');
  return `0x${p1.slice(0, 6)}${p2.slice(0, 4)}...${p2.slice(4, 8)}`;
}

const CHAIN_LABELS: Record<BubbleChain, Partial<Record<BubbleClusterType, string[]>>> = {
  Ethereum: {
    Exchanges: ['Binance Cold Vault', 'Coinbase Custody', 'OKX Hot Reserve', 'Kraken Treasury'],
    SmartMoney: undefined,
  } as Partial<Record<BubbleClusterType, string[]>>,
  Solana: {
    Exchanges: ['Binance SOL Vault', 'Coinbase Solana Custody', 'Bybit SOL Hot', 'OKX SPL Reserve'],
    Whales: ['Solana Genesis Vault', 'Phantom Whale #1', 'Validator Syndicate', 'Jito Staker Desk', 'Dormant SPL Vault'],
    'Smart Money': ['Jupiter Treasury', 'Wintermute SOL', 'Jump SPL Desk', 'Raydium CLMM LP', 'Drift Maker'],
    Retail: ['Solana Retail Pool', 'Marinade Stakers', 'Orca Whirlpool LP', 'Phantom Cohort', 'Solana Bridge Pool'],
  },
  BSC: {
    Exchanges: ['Binance Hot #14', 'Binance Cold BSC', 'Gate BSC Vault', 'MEXC BEP20 Hot'],
    Whales: ['BSC Deployer Reserve', 'Venus Collateral Whale', 'BEP20 Early Vault', 'BNB Treasury', 'Sovereign BEP20'],
    'Smart Money': ['PancakeSwap v3 LP', 'Wintermute BSC', 'Thena Liquidity', 'DWF BEP20 Desk', '1inch BSC Router'],
    Retail: ['PancakeSwap Retail', 'BSC Yield Farmers', 'TrustWallet Cohort', 'BNB Chain LP', 'BEP20 Stakers'],
  },
  Arbitrum: {
    Exchanges: ['Binance Arb Vault', 'Coinbase Arb Bridge', 'Bybit Arb Hot', 'OKX Arbitrum Desk'],
    Whales: ['Arbitrum DAO Vault', 'GMX Whale Pool', 'L2 Genesis Holder', 'Radiant Treasury', 'Multisig Arb #4'],
    'Smart Money': ['Camelot DEX Router', 'Wintermute Arb', 'Pendle Arb Pool', 'Aave v3 Arbitrum', 'Hyperliquid Bridge'],
    Retail: ['Arbitrum Retail Pool', 'L2 Yield Collective', 'Uniswap Arb LP', 'Camelot Farmers', 'Bridge Retail'],
  },
  Base: {
    Exchanges: ['Coinbase Base Prime', 'Binance Base Bridge', 'OKX Base Custody', 'Kraken Base Hot'],
    Whales: ['Base Treasury Vault', 'Farcaster Whale #1', 'Early Base Deployer', 'Aerodrome Locker', 'Coinbase Onchain Desk'],
    'Smart Money': ['Aerodrome Slipstream', 'Wintermute Base', 'Uniswap v3 Base', 'Morpho Blue Vault', 'Moonwell Market'],
    Retail: ['Base Retail Cohort', 'Coinbase Wallet Pool', 'Aerodrome Retail LP', 'Base Yield Stakers', 'Onchain Summer Pool'],
  },
};

function coinSupportsChain(coin: Coin, chain: BubbleChain): boolean {
  const nets = coin.networks.map((n) => n.toLowerCase());
  if (chain === 'BSC') return nets.some((n) => n.includes('bnb') || n.includes('bsc'));
  return nets.some((n) => n.includes(chain.toLowerCase()));
}

export function buildEnhancedBubbleRadar(
  coin: Coin,
  options: {
    chain: BubbleChain;
    stageIndex: number;
    customWallet?: string;
  }
): EnhancedBubbleRadarGraph {
  const { chain, stageIndex, customWallet } = options;
  const stage = TIME_TRAVEL_STAGES[Math.max(0, Math.min(4, stageIndex))] ?? TIME_TRAVEL_STAGES[4];
  const base = buildBubbleRadarGraph(coin, customWallet);
  const chainSeed = hashStr(`${coin.symbol}:${chain}:${customWallet || ''}`);

  // Stage interpolation factor: 0 = Launch Day, 4 = Live Today
  const t = stage.index / 4; // 0.0 -> 1.0

  // Transform nodes by chain + time travel snapshot
  const clusterCounters: Record<BubbleClusterType, number> = {
    Exchanges: 0,
    Whales: 0,
    'Smart Money': 0,
    Retail: 0,
  };

  const nodes: BubbleNode[] = base.nodes.map((node, idx) => {
    const cIdx = clusterCounters[node.cluster];
    clusterCounters[node.cluster] = cIdx + 1;

    const nodeSeed = hashStr(`${chainSeed}:${node.id}:${idx}`);
    const chainLabelList = CHAIN_LABELS[chain]?.[node.cluster];
    const updatedLabel =
      node.id === 'node-custom'
        ? node.label
        : chainLabelList && chainLabelList.length > 0
        ? chainLabelList[cIdx % chainLabelList.length]
        : node.label;

    const updatedAddress =
      node.id === 'node-custom'
        ? node.address
        : chain === 'Solana'
        ? makeSolanaAddress(nodeSeed)
        : chain === 'Ethereum'
        ? node.address
        : makeChainHex(nodeSeed);

    // Chain subtle topology variation so switching chains shows distinct cluster geometry
    const chainScale = 0.85 + ((nodeSeed % 30) / 100);
    const angleShift = ((chainSeed % 628) / 100) * 0.14;

    // Time Travel supply & coordinate shift:
    // At Launch Day (t=0): Whales are ~1.65x bigger & closer to center; Exchanges are 0.35x; Retail is 0.32x
    // At Live Today (t=1): Normalized to current live snapshot
    let timeMultiplier = 1;
    let radialPull = 1;
    if (node.cluster === 'Whales') {
      timeMultiplier = 1.65 - 0.65 * t;
      radialPull = 0.72 + 0.28 * t;
    } else if (node.cluster === 'Smart Money') {
      timeMultiplier = 1.25 - 0.25 * t;
      radialPull = 0.85 + 0.15 * t;
    } else if (node.cluster === 'Exchanges') {
      timeMultiplier = 0.32 + 0.68 * t;
      radialPull = 1.18 - 0.18 * t;
    } else {
      // Retail expands over time
      timeMultiplier = 0.30 + 0.70 * t;
      radialPull = 1.22 - 0.22 * t;
    }

    const dx = node.x - 430;
    const dy = node.y - 260;
    const cosA = Math.cos(angleShift);
    const sinA = Math.sin(angleShift);
    const rotX = dx * cosA - dy * sinA;
    const rotY = dx * sinA + dy * cosA;

    const nextX =
      node.id === 'node-custom'
        ? node.x
        : Math.max(58, Math.min(802, Math.round(430 + rotX * radialPull)));
    const nextY =
      node.id === 'node-custom'
        ? node.y
        : Math.max(54, Math.min(466, Math.round(260 + rotY * radialPull)));

    const rawSupply = node.supplyPct * chainScale * timeMultiplier;
    const supplyPct = Number(Math.max(0.18, Math.min(18.5, rawSupply)).toFixed(2));
    const tokenAmount = (coin.circulatingSupply || 1_000_000) * (supplyPct / 100);
    const valueUsd = tokenAmount * (coin.priceUsd > 0 ? coin.priceUsd : 0);
    const radius = Math.max(13, Math.min(44, Math.round(11 + supplyPct * 3.5)));

    return {
      ...node,
      label: updatedLabel,
      address: updatedAddress,
      supplyPct,
      tokenAmount,
      valueUsd,
      x: nextX,
      y: nextY,
      radius,
    };
  });

  // Magic Nodes: pick 2 coordinated pairs/triplets of Whale/Smart Money holders that aren't directly connected
  const whaleAndSmart = nodes.filter(
    (n) => n.cluster === 'Whales' || n.cluster === 'Smart Money'
  );
  const cluster1Targets = whaleAndSmart.slice(0, 3);
  const cluster2Targets = whaleAndSmart.slice(3, 6);

  const magicNodes: MagicNode[] = [];
  const magicEdges: MagicEdge[] = [];
  const linkedIdSet = new Set<string>();

  const createIntermediary = (
    targets: BubbleNode[],
    idx: number,
    relayType: string
  ) => {
    if (targets.length < 2) return;
    const avgX = Math.round(targets.reduce((acc, n) => acc + n.x, 0) / targets.length);
    const avgY = Math.round(targets.reduce((acc, n) => acc + n.y, 0) / targets.length);
    const offsetX = idx === 0 ? -24 : 26;
    const offsetY = idx === 0 ? 18 : -22;
    const mId = `magic-relay-${idx}`;
    const mSeed = hashStr(`${chainSeed}:magic:${idx}`);

    magicNodes.push({
      id: mId,
      address: chain === 'Solana' ? makeSolanaAddress(mSeed) : makeChainHex(mSeed),
      label: relayType,
      cluster: 'Whales',
      supplyPct: Number((0.42 + (mSeed % 45) / 100).toFixed(2)),
      tokenAmount: ((coin.circulatingSupply || 1_000_000) * 0.45) / 100,
      valueUsd: (((coin.circulatingSupply || 1_000_000) * 0.45) / 100) * coin.priceUsd,
      netFlow7dPct: -12.4,
      x: Math.max(70, Math.min(790, avgX + offsetX)),
      y: Math.max(66, Math.min(454, avgY + offsetY)),
      radius: 14,
      txCount30d: 148 + (mSeed % 200),
      firstSeen: '2024-03-11',
      connections: targets.map((tNode) => tNode.id),
      isMagicIntermediary: true,
      linkedHolders: targets.map((tNode) => tNode.label),
      relayType,
    });

    targets.forEach((target) => {
      linkedIdSet.add(target.id);
      magicEdges.push({
        from: mId,
        to: target.id,
        volumeUsd: target.valueUsd * 0.14,
        strength: 0.92,
        isMagicLink: true,
        clusterGroup: idx + 1,
      });
    });
  };

  createIntermediary(cluster1Targets, 0, 'Shadow Relay Bridge #1');
  createIntermediary(cluster2Targets, 1, 'Stealth Multi-Sig Splitter');

  const combinedSupplyPct = Number(
    Array.from(linkedIdSet)
      .reduce((acc, id) => {
        const found = nodes.find((n) => n.id === id);
        return acc + (found ? found.supplyPct : 0);
      }, 0)
      .toFixed(1)
  );

  const hiddenCluster: HiddenClusterSummary = {
    clusterCount: magicNodes.length,
    linkedWalletsCount: linkedIdSet.size,
    combinedSupplyPct,
    alertHeadline: `Hidden Cluster Alert: ${linkedIdSet.size} top wallets share ${combinedSupplyPct}% supply via ${magicNodes.length} intermediary relays`,
    linkedNodeIds: Array.from(linkedIdSet),
  };

  // Top 10 / Top 50 Supply Concentration & Insider Dump Meter
  const nonExchangeSorted = [...nodes]
    .filter((n) => n.cluster !== 'Exchanges')
    .sort((a, b) => b.supplyPct - a.supplyPct);

  const rawTop10 = nonExchangeSorted.slice(0, 10).reduce((acc, n) => acc + n.supplyPct, 0);
  const top10WalletsPct = Number(Math.max(8, Math.min(68, rawTop10)).toFixed(1));

  const cexRaw = nodes
    .filter((n) => n.cluster === 'Exchanges')
    .reduce((acc, n) => acc + n.supplyPct, 0);
  const cexVaultsPct = Number(Math.max(4, Math.min(34, cexRaw)).toFixed(1));

  const remainingForTop50AndRetail = Math.max(12, 100 - top10WalletsPct - cexVaultsPct);
  const next40Raw =
    nonExchangeSorted.slice(10).reduce((acc, n) => acc + n.supplyPct, 0) +
    (11.5 - 3.5 * t);
  const next40WalletsPct = Number(
    Math.min(remainingForTop50AndRetail * 0.52, Math.max(5.5, next40Raw)).toFixed(1)
  );
  const top50WalletsPct = Number((top10WalletsPct + next40WalletsPct).toFixed(1));
  const circulatingRetailPct = Number(
    Math.max(5, 100 - top50WalletsPct - cexVaultsPct).toFixed(1)
  );

  const centralizationScore = Math.min(
    96,
    Math.max(
      18,
      Math.round(top10WalletsPct * 1.15 + cexVaultsPct * 0.45 + combinedSupplyPct * 0.42)
    )
  );

  const dumpRiskScore = Math.min(
    97,
    Math.max(
      14,
      Math.round(
        top10WalletsPct * 0.95 +
          cexVaultsPct * 0.55 +
          combinedSupplyPct * 0.65 -
          (coin.rank <= 10 ? 12 : 0)
      )
    )
  );

  const dumpRiskTier: 'Low' | 'Medium' | 'High' =
    dumpRiskScore >= 64 ? 'High' : dumpRiskScore >= 38 ? 'Medium' : 'Low';

  const dumpRiskReason =
    dumpRiskTier === 'High'
      ? `Top 10 control ${top10WalletsPct}% + ${linkedIdSet.size} wallets linked via hidden relays`
      : dumpRiskTier === 'Medium'
      ? `Moderate Top 50 share (${top50WalletsPct}%) with ${cexVaultsPct}% resting on CEX vaults`
      : `Healthy retail dispersion (${circulatingRetailPct}%) across ${chain} liquidity pools`;

  // Historical Cohort Split for Time Travel display (Team/Insiders vs Exchanges vs Retail)
  const whaleSum = nodes
    .filter((n) => n.cluster === 'Whales' || n.cluster === 'Smart Money')
    .reduce((acc, n) => acc + n.supplyPct, 0);
  const retailSum = nodes
    .filter((n) => n.cluster === 'Retail')
    .reduce((acc, n) => acc + n.supplyPct, 0);
  const totalCohort = Math.max(1, whaleSum + cexVaultsPct + retailSum * 2.1);

  const teamInsidersPct = Number(((whaleSum / totalCohort) * 100).toFixed(1));
  const exchangesPct = Number(((cexVaultsPct / totalCohort) * 100).toFixed(1));
  const retailHoldersPct = Number(
    Math.max(5, 100 - teamInsidersPct - exchangesPct).toFixed(1)
  );

  return {
    ...base,
    nodes,
    centralizationScore,
    top10HolderPct: top10WalletsPct,
    exchangeCustodyPct: cexVaultsPct,
    chain,
    isNativeChain: coinSupportsChain(coin, chain),
    stage,
    magicNodes,
    magicEdges,
    hiddenCluster,
    concentration: {
      top10WalletsPct,
      top50WalletsPct,
      next40WalletsPct,
      cexVaultsPct,
      circulatingRetailPct,
      dumpRiskScore,
      dumpRiskTier,
      dumpRiskReason,
    },
    cohortSplit: {
      teamInsidersPct,
      exchangesPct,
      retailHoldersPct,
    },
  };
}

export function formatBubbleAuditReport(
  coin: Coin,
  graph: EnhancedBubbleRadarGraph,
  magicNodesEnabled: boolean
): string {
  return [
    `CryptoPulser.com · Bubble Radar™ On-Chain Forensic Audit`,
    `Asset: ${coin.name} (${coin.symbol}) · Chain: ${graph.chain} · Snapshot: ${graph.stage.label}`,
    `Centralization Score: ${graph.centralizationScore}/100 · Insider Dump Risk: ${graph.concentration.dumpRiskTier.toUpperCase()} (${graph.concentration.dumpRiskScore}/100)`,
    `Supply Breakdown: Top 10 Wallets ${graph.concentration.top10WalletsPct}% | Top 50 Wallets ${graph.concentration.top50WalletsPct}% | CEX Vaults ${graph.concentration.cexVaultsPct}% | Circulating Retail ${graph.concentration.circulatingRetailPct}%`,
    `Magic Nodes Cluster Check (${magicNodesEnabled ? 'ON' : 'DETECTED'}): ${graph.hiddenCluster.alertHeadline}`,
    `Cohort Split (${graph.stage.label}): Insiders/Whales ${graph.cohortSplit.teamInsidersPct}% · Exchanges ${graph.cohortSplit.exchangesPct}% · Retail ${graph.cohortSplit.retailHoldersPct}%`,
    `Verdict: ${graph.concentration.dumpRiskReason}`,
  ].join('\n');
}
