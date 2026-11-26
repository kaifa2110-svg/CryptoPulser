import { Coin } from '../types/crypto';
import { validateCryptoWalletAddress } from './totp';

export type WhaleTier = 'Mega Whale' | 'Smart Money' | 'Institutional';
export type WalletLedgerTxType = 'Inflow / Buy' | 'Outflow / Sell' | 'DEX Swap';
export type WalletLedgerTimeframe = '7D' | '30D' | '90D' | '1Y';

export interface WalletXrayPreset {
  id: string;
  label: string;
  address: string;
  ens?: string;
  entityTag: string;
  tier: WhaleTier;
  network: string;
  holdingsSpec: Array<{ symbol: string; quantity: number }>;
  counterparties: string[];
}

export interface WalletHolding {
  coin: Coin;
  quantity: number;
  valueUsd: number;
  allocationPct: number;
}

export interface WalletLedgerTransaction {
  id: string;
  action: WalletLedgerTxType;
  coin: Coin;
  swapTargetSymbol?: string;
  quantity: number;
  valueUsd: number;
  executionPriceUsd: number;
  timestamp: string;
  daysAgo: number;
  counterparty: string;
  txHash: string;
  shortTxHash: string;
  blockNumber: number;
  gasFeeUsd: number;
  routeSummary: string;
}

export interface WalletXrayProfile {
  address: string;
  displayAddress: string;
  ens?: string;
  entityTag: string;
  network: string;
  tier: WhaleTier;
  netWorthUsd: number;
  pnl24hPct: number;
  realizedPnl1yUsd: number;
  realizedPnl1yPct: number;
  holdings: WalletHolding[];
  ledgerTransactions: WalletLedgerTransaction[];
  isPreset: boolean;
  isLiveOnChain: boolean;
  liveSourceLabel?: string;
  fetchedAt?: string;
}

export interface LiveRpcWalletHolding {
  symbol: string;
  name: string;
  quantity: number;
  fallbackPriceUsd: number;
  contractAddress?: string;
}

export interface LiveRpcWalletTx {
  hash: string;
  timestamp: string;
  symbol: string;
  name: string;
  quantity: number;
  fallbackPriceUsd: number;
  action: WalletLedgerTxType;
  counterparty: string;
  success: boolean;
  slot?: number;
}

export interface LiveRpcWalletPayload {
  ok: boolean;
  source: 'live-rpc' | 'fallback';
  sourceLabel?: string;
  chain?: 'Ethereum' | 'Solana';
  address?: string;
  holdings?: LiveRpcWalletHolding[];
  transactions?: LiveRpcWalletTx[];
  fetchedAt?: string;
}

export const WALLET_XRAY_PRESETS: WalletXrayPreset[] = [
  {
    id: 'vitalik',
    label: 'Vitalik Vault',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    ens: 'vitalik.eth',
    entityTag: 'Ethereum Co-Founder Vault',
    tier: 'Mega Whale',
    network: 'Ethereum (EVM)',
    holdingsSpec: [
      { symbol: 'ETH', quantity: 245420 },
      { symbol: 'USDC', quantity: 28400000 },
      { symbol: 'UNI', quantity: 910000 },
      { symbol: 'ARB', quantity: 6400000 },
      { symbol: 'OP', quantity: 3250000 },
      { symbol: 'AAVE', quantity: 21500 },
    ],
    counterparties: [
      'CoW Swap Batch',
      'Safe Multisig Vault',
      'Optimism Bridge',
      'Uniswap v3 Router',
      'Railgun Privacy Pool',
      'Aave v3 Pool',
    ],
  },
  {
    id: 'wintermute',
    label: 'Wintermute MM',
    address: '0xDBF5E9c5206d0dB70a90108bf936DA60221dC080',
    entityTag: 'Algorithmic Market Maker',
    tier: 'Institutional',
    network: 'Multi-Chain EVM',
    holdingsSpec: [
      { symbol: 'ETH', quantity: 58900 },
      { symbol: 'BTC', quantity: 1480 },
      { symbol: 'SOL', quantity: 410000 },
      { symbol: 'USDT', quantity: 62500000 },
      { symbol: 'SUI', quantity: 9400000 },
      { symbol: 'PEPE', quantity: 1450000000000 },
    ],
    counterparties: [
      'Binance Institutional',
      'OKX Liquidity Desk',
      '1inch Fusion Router',
      'Coinbase Prime',
      'Uniswap v4 Hook',
      'Bybit OTC Settlement',
    ],
  },
  {
    id: 'binance-hot',
    label: 'Binance Hot Wallet',
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    entityTag: 'Tier-1 Exchange Custody',
    tier: 'Institutional',
    network: 'Ethereum / BSC',
    holdingsSpec: [
      { symbol: 'BTC', quantity: 14250 },
      { symbol: 'ETH', quantity: 218000 },
      { symbol: 'BNB', quantity: 840000 },
      { symbol: 'USDT', quantity: 415000000 },
      { symbol: 'SOL', quantity: 980000 },
      { symbol: 'XRP', quantity: 42000000 },
    ],
    counterparties: [
      'Binance Cold Reserve',
      'User Settlement Pool',
      'TRON Bridge Vault',
      'Arbitrum Sequencer',
      'PancakeSwap v3',
      'Ceffu Institutional Custody',
    ],
  },
  {
    id: 'jump-trading',
    label: 'Jump Trading',
    address: '0x9507c04B10486547584C37bcbd931B2a4FeE9A46',
    entityTag: 'Quant Prop Desk',
    tier: 'Smart Money',
    network: 'Ethereum / Solana',
    holdingsSpec: [
      { symbol: 'SOL', quantity: 625000 },
      { symbol: 'ETH', quantity: 31200 },
      { symbol: 'USDC', quantity: 44000000 },
      { symbol: 'SUI', quantity: 12800000 },
      { symbol: 'AVAX', quantity: 480000 },
      { symbol: 'LINK', quantity: 920000 },
    ],
    counterparties: [
      'Jupiter Aggregator v6',
      'Coinbase Custody',
      'Wormhole Guardian',
      'Wintermute OTC',
      'Raydium CLMM',
      'Pyth Governance Vault',
    ],
  },
];

function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeFullTxHash(seedStr: string): string {
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    parts.push(fnv1aHash(`${seedStr}:${i}`).toString(16).padStart(8, '0'));
  }
  return `0x${parts.join('')}`;
}

export function shortenWalletAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 16) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

export function findPresetMatch(raw: string): WalletXrayPreset | undefined {
  const q = raw.trim().toLowerCase();
  if (!q) return undefined;
  return WALLET_XRAY_PRESETS.find(
    (p) =>
      p.address.toLowerCase() === q ||
      p.ens?.toLowerCase() === q ||
      p.label.toLowerCase() === q
  );
}

export function validateWalletXrayQuery(raw: string): {
  valid: boolean;
  normalized: string;
  networkLabel: string | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      networkLabel: null,
      error: 'Enter an EVM (0x...), ENS (.eth), Solana, or Bitcoin address.',
    };
  }

  const preset = findPresetMatch(trimmed);
  if (preset) {
    return {
      valid: true,
      normalized: preset.ens || preset.address,
      networkLabel: preset.network,
    };
  }

  // ENS domain (.eth)
  if (/^[a-zA-Z0-9-]{2,63}(\.[a-zA-Z0-9-]{2,63})*\.eth$/i.test(trimmed)) {
    return {
      valid: true,
      normalized: trimmed.toLowerCase(),
      networkLabel: 'Ethereum (ENS)',
    };
  }

  // Support shortened EVM display/demo addresses (e.g. 0x742d... or 0x1a2b3c...4d5e)
  if (/^0x[a-fA-F0-9]{4,39}\.\.\.[a-fA-F0-9]{0,12}$/.test(trimmed)) {
    return {
      valid: true,
      normalized: trimmed,
      networkLabel: 'Ethereum (EVM)',
    };
  }

  const walletCheck = validateCryptoWalletAddress(trimmed);
  if (walletCheck.valid) {
    return {
      valid: true,
      normalized: walletCheck.normalized,
      networkLabel: walletCheck.network,
    };
  }

  return {
    valid: false,
    normalized: trimmed,
    networkLabel: null,
    error:
      'Invalid address. Paste a valid 0x... EVM address, ENS name (e.g. vitalik.eth), Solana address, or Bitcoin address.',
  };
}

function resolveCoinBySymbol(coins: Coin[], symbol: string, usedIds: Set<string>): Coin | undefined {
  const upper = symbol.toUpperCase();
  const exact = coins.find((c) => c.symbol.toUpperCase() === upper && !usedIds.has(c.id));
  if (exact) return exact;
  return coins.find((c) => !usedIds.has(c.id));
}

function buildDeterministicHoldingsSpec(
  coins: Coin[],
  seed: number,
  networkLabel: string | null
): Array<{ coin: Coin; quantity: number }> {
  const used = new Set<string>();
  const picked: Coin[] = [];

  const preferredByNetwork =
    networkLabel === 'Bitcoin'
      ? ['BTC', 'WBTC', 'ORDI', 'STX', 'USDT']
      : networkLabel === 'Solana'
      ? ['SOL', 'JUP', 'BONK', 'WIF', 'RAY', 'USDC']
      : ['ETH', 'USDC', 'WBTC', 'ARB', 'LINK', 'AAVE', 'UNI', 'SOL'];

  for (const sym of preferredByNetwork) {
    if (picked.length >= 3) break;
    const match = coins.find((c) => c.symbol.toUpperCase() === sym && !used.has(c.id));
    if (match) {
      used.add(match.id);
      picked.push(match);
    }
  }

  const poolLimit = Math.min(coins.length, 45);
  let cursor = seed;
  let guard = 0;
  while (picked.length < Math.min(6, coins.length) && guard < 120) {
    guard++;
    cursor = Math.imul(cursor ^ 0x9e3779b9, 1664525) + 1013904223;
    const idx = (cursor >>> 0) % Math.max(1, poolLimit);
    const candidate = coins[idx];
    if (candidate && !used.has(candidate.id) && candidate.priceUsd > 0) {
      used.add(candidate.id);
      picked.push(candidate);
    }
  }

  const scaleBucket = seed % 10;
  const baseScaleUsd =
    scaleBucket >= 8
      ? 24_000_000
      : scaleBucket >= 4
      ? 4_200_000
      : 680_000;

  return picked.map((coin, index) => {
    const stepHash = fnv1aHash(`${seed}:${coin.symbol}:${index}`);
    const weightFactor = Math.max(0.18, 1.45 - index * 0.22) * (0.65 + (stepHash % 70) / 100);
    const targetUsd = baseScaleUsd * weightFactor;
    const safePrice = coin.priceUsd > 0 ? coin.priceUsd : 1;
    const rawQty = targetUsd / safePrice;
    const roundedQty =
      rawQty >= 1000
        ? Math.round(rawQty)
        : rawQty >= 10
        ? Number(rawQty.toFixed(2))
        : Number(rawQty.toFixed(4));
    return { coin, quantity: Math.max(0.0001, roundedQty) };
  });
}

// 48 day offsets spread across 0..364 days so 7D, 30D, 90D, and 1Y all contain rich activity
const YEARLY_DAY_OFFSETS: number[] = [
  0, 1, 2, 3, 4, 5, 6, 7,
  9, 11, 14, 17, 20, 23, 26, 29,
  33, 38, 44, 50, 57, 64, 72, 81, 88,
  96, 108, 121, 134, 148, 162, 175, 189, 204, 218,
  232, 246, 261, 275, 289, 303, 316, 328, 339, 348, 355, 360, 364,
];

const DEX_COUNTERPARTIES = [
  'Uniswap v3 Router',
  'CoW Swap Batch',
  '1inch Fusion Router',
  'Jupiter Aggregator v6',
  'Curve Finance Pool',
  'Raydium CLMM',
];

export function buildWalletXrayProfile(
  coins: Coin[],
  rawQuery: string
): WalletXrayProfile | null {
  if (!coins.length) return null;

  const check = validateWalletXrayQuery(rawQuery);
  if (!check.valid) return null;

  const preset = findPresetMatch(rawQuery);
  const seed = fnv1aHash(check.normalized.toLowerCase());

  const resolvedAddress = preset
    ? preset.address
    : check.normalized.endsWith('.eth')
    ? `0x${seed.toString(16).padStart(8, '0')}${(seed ^ 0xa5a5a5a5)
        .toString(16)
        .padStart(8, '0')}${fnv1aHash(check.normalized + '1')
        .toString(16)
        .padStart(8, '0')}${fnv1aHash(check.normalized + '2')
        .toString(16)
        .padStart(8, '0')}${fnv1aHash(check.normalized + '3')
        .toString(16)
        .padStart(8, '0')}`.slice(0, 42)
    : check.normalized;

  const ens = preset?.ens || (check.normalized.endsWith('.eth') ? check.normalized : undefined);

  const rawEntries: Array<{ coin: Coin; quantity: number }> = [];
  if (preset) {
    const usedIds = new Set<string>();
    for (const item of preset.holdingsSpec) {
      const matched = resolveCoinBySymbol(coins, item.symbol, usedIds);
      if (matched && matched.priceUsd > 0) {
        usedIds.add(matched.id);
        rawEntries.push({ coin: matched, quantity: item.quantity });
      }
    }
  } else {
    rawEntries.push(...buildDeterministicHoldingsSpec(coins, seed, check.networkLabel));
  }

  if (rawEntries.length === 0) return null;

  const priced = rawEntries
    .map((entry) => {
      const valueUsd = Number.isFinite(entry.quantity * entry.coin.priceUsd)
        ? entry.quantity * entry.coin.priceUsd
        : 0;
      return {
        coin: entry.coin,
        quantity: entry.quantity,
        valueUsd,
      };
    })
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const netWorthUsd = priced.reduce((acc, item) => acc + item.valueUsd, 0);
  const safeNetWorth = netWorthUsd > 0 ? netWorthUsd : 1;

  const holdings: WalletHolding[] = priced.map((item) => ({
    coin: item.coin,
    quantity: item.quantity,
    valueUsd: item.valueUsd,
    allocationPct: Number(((item.valueUsd / safeNetWorth) * 100).toFixed(2)),
  }));

  const weightedPnl24h = holdings.reduce((acc, h) => {
    const ch = Number.isFinite(h.coin.change24h) ? h.coin.change24h : 0;
    return acc + (h.valueUsd / safeNetWorth) * ch;
  }, 0);

  // Derive 1Y Realized PnL from the portfolio's live 1Y coin performance & realized profit capture factor
  const weighted1yMovePct = holdings.reduce((acc, h) => {
    const c1y = Number.isFinite(h.coin.change1y) ? h.coin.change1y : h.coin.change30d * 2.5;
    return acc + (h.valueUsd / safeNetWorth) * (Number.isFinite(c1y) ? c1y : 18);
  }, 0);
  const captureFactor = 0.42 + ((seed % 28) / 100);
  const realizedPnl1yPct = Number((weighted1yMovePct * captureFactor).toFixed(2));
  const realizedPnl1yUsd = Number(((safeNetWorth * realizedPnl1yPct) / 100).toFixed(2));

  const tier: WhaleTier = preset
    ? preset.tier
    : netWorthUsd >= 25_000_000
    ? 'Mega Whale'
    : netWorthUsd >= 5_000_000
    ? 'Institutional'
    : 'Smart Money';

  const entityTag = preset
    ? preset.entityTag
    : ens
    ? `ENS Whale (${ens})`
    : check.networkLabel === 'Bitcoin'
    ? 'Bitcoin Cold Vault'
    : check.networkLabel === 'Solana'
    ? 'Solana Smart Money Wallet'
    : 'On-Chain Whale Address';

  const counterparties = preset?.counterparties ?? [
    'Uniswap v3 Router',
    'Coinbase Prime Custody',
    'Binance Hot Wallet',
    'Safe Multisig Vault',
    'Jupiter Aggregator v6',
    '1inch Fusion Router',
  ];

  const txTypes: WalletLedgerTxType[] = ['Inflow / Buy', 'DEX Swap', 'Outflow / Sell'];
  const nowMs = Date.now();
  const baseBlock = 21_482_900;

  const ledgerTransactions: WalletLedgerTransaction[] = YEARLY_DAY_OFFSETS.map((daysAgo, i) => {
    const txSeed = fnv1aHash(`${resolvedAddress}:ledger:${i}:${daysAgo}`);
    const holding = holdings[(txSeed + i) % holdings.length];
    const altHolding = holdings[(txSeed + i + 1) % holdings.length];
    const action = txTypes[(i + (txSeed % 3)) % txTypes.length];

    const fraction = 0.008 + ((txSeed % 38) / 1000);
    const rawQty = Math.max(0.0001, holding.quantity * fraction);
    const quantity =
      rawQty >= 1000
        ? Math.round(rawQty)
        : rawQty >= 1
        ? Number(rawQty.toFixed(2))
        : Number(rawQty.toFixed(4));

    const liveSpotPrice = holding.coin.priceUsd > 0 ? holding.coin.priceUsd : 1;
    const change1yRatio = Number.isFinite(holding.coin.change1y) ? holding.coin.change1y / 100 : 0.15;
    const clampedYearChange = Math.max(-0.7, Math.min(3.5, change1yRatio));
    const yearFraction = daysAgo / 365;
    const executionPriceUsd = Math.max(
      0.000001,
      liveSpotPrice / (1 + clampedYearChange * yearFraction)
    );
    const valueUsd = quantity * liveSpotPrice;

    const minuteJitter = (txSeed % 1380) * 60_000;
    const tsMs = nowMs - daysAgo * 86_400_000 - (daysAgo === 0 ? (txSeed % 420) * 60_000 : minuteJitter);

    const counterparty =
      action === 'DEX Swap'
        ? DEX_COUNTERPARTIES[txSeed % DEX_COUNTERPARTIES.length]
        : counterparties[(txSeed + i) % counterparties.length];

    const fullHash = makeFullTxHash(`${resolvedAddress}:tx:${i}:${daysAgo}`);
    const shortTxHash = `${fullHash.slice(0, 10)}...${fullHash.slice(-6)}`;
    const blockNumber = baseBlock - daysAgo * 7150 - (txSeed % 420);
    const gasFeeUsd = Number((1.4 + ((txSeed % 280) / 10)).toFixed(2));
    const swapTargetSymbol =
      action === 'DEX Swap' && altHolding.coin.symbol !== holding.coin.symbol
        ? altHolding.coin.symbol
        : action === 'DEX Swap'
        ? 'USDC'
        : undefined;

    const routeSummary =
      action === 'DEX Swap'
        ? `Swapped ${quantity.toLocaleString('en-US')} ${holding.coin.symbol} -> ${swapTargetSymbol} via ${counterparty}`
        : action === 'Inflow / Buy'
        ? `Received ${quantity.toLocaleString('en-US')} ${holding.coin.symbol} from ${counterparty}`
        : `Transferred ${quantity.toLocaleString('en-US')} ${holding.coin.symbol} to ${counterparty}`;

    return {
      id: `${resolvedAddress}-ledger-${i}`,
      action,
      coin: holding.coin,
      swapTargetSymbol,
      quantity,
      valueUsd: Number.isFinite(valueUsd) ? valueUsd : 0,
      executionPriceUsd: Number.isFinite(executionPriceUsd) ? executionPriceUsd : liveSpotPrice,
      timestamp: new Date(tsMs).toISOString(),
      daysAgo,
      counterparty,
      txHash: fullHash,
      shortTxHash,
      blockNumber,
      gasFeeUsd,
      routeSummary,
    };
  });

  return {
    address: resolvedAddress,
    displayAddress: shortenWalletAddress(resolvedAddress),
    ens,
    entityTag,
    network: preset?.network || check.networkLabel || 'Ethereum (EVM)',
    tier,
    netWorthUsd: Number.isFinite(netWorthUsd) ? netWorthUsd : 0,
    pnl24hPct: Number.isFinite(weightedPnl24h) ? weightedPnl24h : 0,
    realizedPnl1yUsd: Number.isFinite(realizedPnl1yUsd) ? realizedPnl1yUsd : 0,
    realizedPnl1yPct: Number.isFinite(realizedPnl1yPct) ? realizedPnl1yPct : 0,
    holdings,
    ledgerTransactions,
    isPreset: Boolean(preset),
    isLiveOnChain: false,
    liveSourceLabel: 'Multi-Chain Model',
  };
}

export function resolveLiveRpcAddress(rawQuery: string): string | null {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;
  const preset = findPresetMatch(trimmed);
  if (preset) return preset.address;
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return trimmed;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return trimmed;
  return null;
}

export async function fetchLiveWalletRpc(
  rawQuery: string
): Promise<LiveRpcWalletPayload | null> {
  const targetAddress = resolveLiveRpcAddress(rawQuery);
  if (!targetAddress) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(
      `/api/wallet/xray?address=${encodeURIComponent(targetAddress)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as LiveRpcWalletPayload;
    if (data?.ok && data.source === 'live-rpc' && Array.isArray(data.holdings)) {
      return data;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function makeSyntheticCoin(
  symbol: string,
  name: string,
  priceUsd: number,
  chain: 'Ethereum' | 'Solana'
): Coin {
  return {
    id: `live-token-${symbol.toLowerCase()}`,
    rank: 9999,
    symbol,
    name,
    category: chain === 'Solana' ? 'Solana Ecosystem' : 'ERC-20 Token',
    priceUsd: Number.isFinite(priceUsd) ? priceUsd : 0,
    marketCapUsd: 0,
    fdvUsd: 0,
    volume24hUsd: 0,
    vol24hChangePct: 0,
    high24hUsd: priceUsd,
    low24hUsd: priceUsd,
    circulatingSupply: 0,
    maxSupply: null,
    change1h: 0,
    change24h: 0,
    change7d: 0,
    change30d: 0,
    change1y: 0,
    dominancePct: 0,
    sparkline7d: [priceUsd, priceUsd],
    networks: [chain],
    contracts: [],
    openInterestUsd: 0,
    oiChange24hPct: 0,
    derivativesVol24hUsd: 0,
    fundingRatePct: 0,
    longLiq24hUsd: 0,
    shortLiq24hUsd: 0,
    totalLiq24hUsd: 0,
    isLiveApi: true,
  };
}

export function hydrateLiveWalletProfile(
  coins: Coin[],
  rawQuery: string,
  live: LiveRpcWalletPayload
): WalletXrayProfile | null {
  if (!live.ok || !live.address || !Array.isArray(live.holdings)) return null;

  const preset = findPresetMatch(rawQuery);
  const chain: 'Ethereum' | 'Solana' = live.chain === 'Solana' ? 'Solana' : 'Ethereum';
  const coinBySymbol = new Map<string, Coin>();
  for (const c of coins) {
    const sym = c.symbol.toUpperCase();
    if (!coinBySymbol.has(sym)) {
      coinBySymbol.set(sym, c);
    }
  }

  const resolvedEntries = live.holdings
    .map((h) => {
      const sym = h.symbol.toUpperCase();
      const cmcCoin = coinBySymbol.get(sym);
      const coin =
        cmcCoin || makeSyntheticCoin(sym, h.name || sym, h.fallbackPriceUsd || 0, chain);
      const unitPrice =
        cmcCoin && cmcCoin.priceUsd > 0 ? cmcCoin.priceUsd : h.fallbackPriceUsd || 0;
      const valueUsd = Number.isFinite(h.quantity * unitPrice) ? h.quantity * unitPrice : 0;
      return {
        coin: unitPrice !== coin.priceUsd ? { ...coin, priceUsd: unitPrice } : coin,
        quantity: h.quantity,
        valueUsd,
      };
    })
    // Keep native asset (ETH/SOL) + valued tokens cleanly sorted by live USD value
    .filter((item, idx) => idx === 0 || item.valueUsd >= 0.01 || item.quantity > 0)
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const netWorthUsd = resolvedEntries.reduce((acc, item) => acc + item.valueUsd, 0);
  const safeNetWorth = netWorthUsd > 0 ? netWorthUsd : 1;

  const holdings: WalletHolding[] = resolvedEntries.map((item) => ({
    coin: item.coin,
    quantity: item.quantity,
    valueUsd: item.valueUsd,
    allocationPct:
      netWorthUsd > 0 ? Number(((item.valueUsd / safeNetWorth) * 100).toFixed(2)) : 0,
  }));

  const weightedPnl24h = holdings.reduce((acc, h) => {
    const ch = Number.isFinite(h.coin.change24h) ? h.coin.change24h : 0;
    return acc + (netWorthUsd > 0 ? (h.valueUsd / safeNetWorth) * ch : 0);
  }, 0);

  const weighted1yMovePct = holdings.reduce((acc, h) => {
    const c1y = Number.isFinite(h.coin.change1y) ? h.coin.change1y : h.coin.change30d * 2.5;
    return acc + (netWorthUsd > 0 ? (h.valueUsd / safeNetWorth) * (Number.isFinite(c1y) ? c1y : 0) : 0);
  }, 0);

  const realizedPnl1yPct = Number((weighted1yMovePct * 0.45).toFixed(2));
  const realizedPnl1yUsd = Number(((netWorthUsd * realizedPnl1yPct) / 100).toFixed(2));

  const tier: WhaleTier = preset
    ? preset.tier
    : netWorthUsd >= 10_000_000
    ? 'Mega Whale'
    : netWorthUsd >= 1_000_000
    ? 'Institutional'
    : 'Smart Money';

  const entityTag = preset
    ? preset.entityTag
    : chain === 'Solana'
    ? 'Live Solana Wallet'
    : 'Live Ethereum Wallet';

  const nowMs = Date.now();
  const ledgerTransactions: WalletLedgerTransaction[] = (live.transactions || []).map((tx, idx) => {
    const sym = tx.symbol.toUpperCase();
    const cmcCoin = coinBySymbol.get(sym);
    const coin = cmcCoin || makeSyntheticCoin(sym, tx.name || sym, tx.fallbackPriceUsd || 0, chain);
    const spotPrice =
      cmcCoin && cmcCoin.priceUsd > 0 ? cmcCoin.priceUsd : tx.fallbackPriceUsd || 0;
    const valueUsd = Number.isFinite(tx.quantity * spotPrice) ? tx.quantity * spotPrice : 0;
    const tsMs = new Date(tx.timestamp).getTime();
    const daysAgo = Number.isFinite(tsMs)
      ? Math.max(0, Math.floor((nowMs - tsMs) / 86_400_000))
      : 0;
    const shortTxHash =
      tx.hash.length > 18 ? `${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}` : tx.hash;
    const counterpartyDisplay =
      tx.counterparty && tx.counterparty.length > 18 && !tx.counterparty.includes(' ')
        ? shortenWalletAddress(tx.counterparty)
        : tx.counterparty || (chain === 'Solana' ? 'Solana Mainnet' : 'Ethereum Mainnet');

    return {
      id: `${live.address}-live-tx-${idx}-${tx.hash.slice(0, 8)}`,
      action: tx.action,
      coin,
      quantity: tx.quantity,
      valueUsd,
      executionPriceUsd: tx.fallbackPriceUsd > 0 ? tx.fallbackPriceUsd : spotPrice,
      timestamp: tx.timestamp,
      daysAgo,
      counterparty: counterpartyDisplay,
      txHash: tx.hash,
      shortTxHash,
      blockNumber: tx.slot || 21_482_900 - idx,
      gasFeeUsd: chain === 'Solana' ? 0.002 : 2.8,
      routeSummary: `${tx.action}: ${tx.quantity.toLocaleString('en-US', {
        maximumFractionDigits: 4,
      })} ${sym} via ${counterpartyDisplay}`,
    };
  });

  return {
    address: live.address,
    displayAddress: shortenWalletAddress(live.address),
    ens: preset?.ens || (rawQuery.trim().toLowerCase().endsWith('.eth') ? rawQuery.trim() : undefined),
    entityTag,
    network: chain === 'Solana' ? 'Solana Mainnet' : 'Ethereum (EVM)',
    tier,
    netWorthUsd: Number.isFinite(netWorthUsd) ? netWorthUsd : 0,
    pnl24hPct: Number.isFinite(weightedPnl24h) ? weightedPnl24h : 0,
    realizedPnl1yUsd: Number.isFinite(realizedPnl1yUsd) ? realizedPnl1yUsd : 0,
    realizedPnl1yPct: Number.isFinite(realizedPnl1yPct) ? realizedPnl1yPct : 0,
    holdings,
    ledgerTransactions,
    isPreset: Boolean(preset),
    isLiveOnChain: true,
    liveSourceLabel: live.sourceLabel || `${chain} Public RPC`,
    fetchedAt: live.fetchedAt,
  };
}

