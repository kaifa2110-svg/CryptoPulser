import {
  BubbleClusterType,
  BubbleEdge,
  BubbleNode,
  BubbleRadarGraph,
  Coin,
  GlobalMarketStats,
  SquarePost,
  WhaleSignal,
  WhaleSignalType,
  WhaleTrailStep,
} from '../types/crypto';

const BASELINE_TOP_COINS: Array<Partial<Coin> & { id: string; symbol: string; name: string; priceUsd: number; marketCapUsd: number; category: string }> = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', priceUsd: 94280, marketCapUsd: 1865000000000, category: 'Layer 1', change1h: 0.34, change24h: 2.41, change7d: 6.85, change30d: 18.4, change1y: 112.5, circulatingSupply: 19785000, maxSupply: 21000000 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', priceUsd: 3340, marketCapUsd: 402500000000, category: 'Layer 1', change1h: 0.42, change24h: 3.12, change7d: 8.14, change30d: 21.6, change1y: 64.2, circulatingSupply: 120420000, maxSupply: null },
  { id: 'tether', symbol: 'USDT', name: 'Tether', priceUsd: 1.0, marketCapUsd: 132000000000, category: 'Stablecoin', change1h: 0.01, change24h: 0.02, change7d: 0.01, change30d: 0.03, change1y: 0.05, circulatingSupply: 132000000000, maxSupply: null },
  { id: 'solana', symbol: 'SOL', name: 'Solana', priceUsd: 238.4, marketCapUsd: 113200000000, category: 'Layer 1', change1h: 0.91, change24h: 5.42, change7d: 14.3, change30d: 36.2, change1y: 285.4, circulatingSupply: 474800000, maxSupply: null },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', priceUsd: 648.2, marketCapUsd: 93800000000, category: 'Exchange', change1h: 0.21, change24h: 1.75, change7d: 4.9, change30d: 11.8, change1y: 148.0, circulatingSupply: 144700000, maxSupply: 200000000 },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', priceUsd: 1.42, marketCapUsd: 80900000000, category: 'Payments', change1h: 1.15, change24h: 7.84, change7d: 22.1, change30d: 142.0, change1y: 129.0, circulatingSupply: 56970000000, maxSupply: 100000000000 },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', priceUsd: 1.0, marketCapUsd: 38400000000, category: 'Stablecoin', change1h: 0.0, change24h: 0.01, change7d: 0.02, change30d: 0.01, change1y: 0.02, circulatingSupply: 38400000000, maxSupply: null },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', priceUsd: 0.98, marketCapUsd: 34400000000, category: 'Layer 1', change1h: 0.65, change24h: 4.95, change7d: 18.7, change30d: 96.4, change1y: 144.2, circulatingSupply: 35100000000, maxSupply: 45000000000 },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', priceUsd: 0.395, marketCapUsd: 58000000000, category: 'Meme', change1h: -0.32, change24h: 3.6, change7d: 11.4, change30d: 164.5, change1y: 380.2, circulatingSupply: 146800000000, maxSupply: null },
  { id: 'tron', symbol: 'TRX', name: 'TRON', priceUsd: 0.204, marketCapUsd: 17600000000, category: 'Layer 1', change1h: 0.14, change24h: 1.92, change7d: 5.4, change30d: 24.8, change1y: 95.3, circulatingSupply: 86300000000, maxSupply: null },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', priceUsd: 41.8, marketCapUsd: 17100000000, category: 'Layer 1', change1h: 0.58, change24h: 4.18, change7d: 12.6, change30d: 48.2, change1y: 92.4, circulatingSupply: 409000000, maxSupply: 720000000 },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', priceUsd: 18.65, marketCapUsd: 11700000000, category: 'Oracle', change1h: 0.72, change24h: 6.12, change7d: 15.9, change30d: 58.1, change1y: 34.7, circulatingSupply: 626800000, maxSupply: 1000000000 },
  { id: 'sui', symbol: 'SUI', name: 'Sui', priceUsd: 3.48, marketCapUsd: 9900000000, category: 'Layer 1', change1h: 1.24, change24h: 8.35, change7d: 19.8, change30d: 72.4, change1y: 440.1, circulatingSupply: 2845000000, maxSupply: 10000000000 },
  { id: 'toncoin', symbol: 'TON', name: 'Toncoin', priceUsd: 6.18, marketCapUsd: 15700000000, category: 'Layer 1', change1h: 0.28, change24h: 2.65, change7d: 7.4, change30d: 19.2, change1y: 162.8, circulatingSupply: 2540000000, maxSupply: null },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', priceUsd: 8.42, marketCapUsd: 12800000000, category: 'Layer 0', change1h: 0.45, change24h: 4.78, change7d: 16.5, change30d: 89.2, change1y: 54.6, circulatingSupply: 1520000000, maxSupply: null },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', priceUsd: 11.95, marketCapUsd: 7170000000, category: 'DeFi', change1h: 0.61, change24h: 5.04, change7d: 14.2, change30d: 49.6, change1y: 98.4, circulatingSupply: 600000000, maxSupply: 1000000000 },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', priceUsd: 6.72, marketCapUsd: 8180000000, category: 'AI & Compute', change1h: 0.88, change24h: 6.42, change7d: 17.5, change30d: 44.8, change1y: 265.0, circulatingSupply: 1217000000, maxSupply: null },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', priceUsd: 0.94, marketCapUsd: 3850000000, category: 'Layer 2', change1h: 0.52, change24h: 4.88, change7d: 13.4, change30d: 64.2, change1y: -12.4, circulatingSupply: 4095000000, maxSupply: 10000000000 },
  { id: 'optimism', symbol: 'OP', name: 'Optimism', priceUsd: 2.38, marketCapUsd: 2990000000, category: 'Layer 2', change1h: 0.39, change24h: 3.92, change7d: 11.7, change30d: 42.6, change1y: 38.9, circulatingSupply: 1256000000, maxSupply: 4294967296 },
  { id: 'render-token', symbol: 'RENDER', name: 'Render', priceUsd: 8.64, marketCapUsd: 4470000000, category: 'AI & Compute', change1h: 1.05, change24h: 7.12, change7d: 18.2, change30d: 62.5, change1y: 174.3, circulatingSupply: 517600000, maxSupply: 532476763 },
  { id: 'aave', symbol: 'AAVE', name: 'Aave', priceUsd: 214.5, marketCapUsd: 3210000000, category: 'DeFi', change1h: 0.67, change24h: 5.74, change7d: 14.9, change30d: 46.1, change1y: 122.4, circulatingSupply: 14980000, maxSupply: 16000000 },
  { id: 'bittensor', symbol: 'TAO', name: 'Bittensor', priceUsd: 542.0, marketCapUsd: 4010000000, category: 'AI & Compute', change1h: 0.94, change24h: 6.2, change7d: 12.1, change30d: 28.4, change1y: 158.0, circulatingSupply: 7400000, maxSupply: 21000000 },
  { id: 'injective-protocol', symbol: 'INJ', name: 'Injective', priceUsd: 29.4, marketCapUsd: 2890000000, category: 'DeFi', change1h: 0.77, change24h: 5.3, change7d: 16.4, change30d: 52.0, change1y: 78.2, circulatingSupply: 98300000, maxSupply: 100000000 },
  { id: 'ondo-finance', symbol: 'ONDO', name: 'Ondo', priceUsd: 1.18, marketCapUsd: 1690000000, category: 'RWA', change1h: 0.48, change24h: 4.15, change7d: 15.2, change30d: 68.4, change1y: 390.5, circulatingSupply: 1430000000, maxSupply: 10000000000 },
  { id: 'celestia', symbol: 'TIA', name: 'Celestia', priceUsd: 7.92, marketCapUsd: 3320000000, category: 'Modular', change1h: -0.41, change24h: -2.14, change7d: 9.8, change30d: 34.1, change1y: 28.4, circulatingSupply: 419000000, maxSupply: null },
];

const EXTRA_PREFIXES = [
  'Aether', 'Vanguard', 'Nexus', 'Hyper', 'Helios', 'Kinetix', 'Stratos', 'Solstice',
  'Polaris', 'Chronos', 'Vertex', 'Omni', 'Aegis', 'Quantum', 'Zenith', 'Lumen',
  'Prism', 'Boreal', 'Nova', 'Cobalt', 'Meridian', 'Axiom', 'Veloce', 'Flux',
  'Sovereign', 'Atlas', 'Tectonic', 'Cortex', 'Orbital', 'Pulse', 'Mirage', 'Vector',
  'Cipher', 'Monolith', 'Arcadia', 'Relay', 'Beacon', 'Kestrel', 'Sentinel', 'Paragon',
];

const EXTRA_SUFFIXES = [
  'Protocol', 'Network', 'Chain', 'Finance', 'Labs', 'DAO', 'Core', 'Swap',
  'Bridge', 'Layer', 'Vault', 'Mesh', 'Grid', 'Rollup', 'Compute', 'Ledger',
  'Index', 'Cloud', 'Cash', 'Pay', 'Market', 'Node', 'Zero', 'Hub', 'X',
];

const CATEGORIES = [
  'DeFi',
  'Layer 1',
  'Layer 2',
  'AI & Compute',
  'RWA',
  'Infrastructure',
  'Gaming',
  'Oracle',
  'Modular',
  'Storage',
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function makeSparkline(price: number, change7d: number, seed: number): number[] {
  const points: number[] = [];
  const start = price / (1 + change7d / 100);
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const noise = (seededRandom(seed * 31 + i) - 0.5) * 0.045;
    const val = (start + (price - start) * t) * (1 + noise * (1 - t * 0.6));
    points.push(Math.max(0.000001, val));
  }
  points[23] = price;
  return points;
}

export function buildTop1000Coins(liveCoins: Coin[]): {
  coins: Coin[];
  derivedGlobal: Partial<GlobalMarketStats>;
} {
  const baseList: Coin[] =
    liveCoins.length > 0
      ? liveCoins.map((c) => ({ ...c }))
      : BASELINE_TOP_COINS.map((c, idx) => {
          const vol = c.marketCapUsd * (0.03 + seededRandom(idx + 7) * 0.07);
          const ch24 = c.change24h ?? 1.5;
          return {
            id: c.id,
            rank: idx + 1,
            symbol: c.symbol,
            name: c.name,
            category: c.category,
            priceUsd: c.priceUsd,
            marketCapUsd: c.marketCapUsd,
            fdvUsd: c.marketCapUsd * 1.15,
            volume24hUsd: vol,
            high24hUsd: c.priceUsd * (1 + Math.abs(ch24) / 140 + 0.015),
            low24hUsd: c.priceUsd * (1 - Math.abs(ch24) / 140 - 0.015),
            circulatingSupply: c.circulatingSupply ?? c.marketCapUsd / c.priceUsd,
            maxSupply: c.maxSupply ?? null,
            change1h: c.change1h ?? 0.2,
            change24h: ch24,
            change7d: c.change7d ?? ch24 * 1.8,
            change30d: c.change30d ?? ch24 * 4.2,
            change1y: c.change1y ?? 65,
            dominancePct: 0,
            sparkline7d: makeSparkline(c.priceUsd, c.change7d ?? 5, idx + 1),
            isLiveApi: false,
          };
        });

  const usedSymbols = new Set(baseList.map((c) => c.symbol.toUpperCase()));
  const lastLive = baseList[baseList.length - 1];
  let anchorMcap = Math.max(180000000, lastLive?.marketCapUsd || 220000000);

  for (let rank = baseList.length + 1; rank <= 1000; rank++) {
    const pIdx = (rank * 7) % EXTRA_PREFIXES.length;
    const sIdx = (rank * 13 + Math.floor(rank / 40)) % EXTRA_SUFFIXES.length;
    const prefix = EXTRA_PREFIXES[pIdx];
    const suffix = EXTRA_SUFFIXES[sIdx];
    const name = `${prefix} ${suffix}`;

    let sym = (prefix.slice(0, 2) + suffix.slice(0, 2)).toUpperCase();
    if (usedSymbols.has(sym)) {
      sym = `${prefix.slice(0, 2)}${suffix.slice(0, 1)}${rank % 9}`.toUpperCase();
    }
    if (usedSymbols.has(sym)) {
      sym = `CP${rank}`;
    }
    usedSymbols.add(sym);

    anchorMcap = Math.max(420000, anchorMcap * (0.988 + seededRandom(rank) * 0.008));
    const supply = Math.round(10_000_000 + seededRandom(rank * 3) * 950_000_000);
    const priceUsd = anchorMcap / supply;
    const change24h = (seededRandom(rank * 11) - 0.45) * 19;
    const change7d = (seededRandom(rank * 17) - 0.42) * 34;
    const change1h = (seededRandom(rank * 5) - 0.48) * 3.8;
    const change30d = change7d * 1.9 + (seededRandom(rank * 23) - 0.4) * 28;
    const change1y = change30d * 2.2 + (seededRandom(rank * 29) - 0.35) * 90;

    baseList.push({
      id: `${prefix.toLowerCase()}-${suffix.toLowerCase()}-${rank}`,
      rank,
      symbol: sym,
      name,
      category: CATEGORIES[rank % CATEGORIES.length],
      priceUsd,
      marketCapUsd: anchorMcap,
      fdvUsd: anchorMcap * (1.1 + seededRandom(rank * 19) * 0.8),
      volume24hUsd: anchorMcap * (0.02 + seededRandom(rank * 13) * 0.14),
      high24hUsd: priceUsd * (1 + Math.abs(change24h) / 110 + 0.02),
      low24hUsd: priceUsd * (1 - Math.abs(change24h) / 110 - 0.02),
      circulatingSupply: supply,
      maxSupply: rank % 3 === 0 ? null : Math.round(supply * (1.2 + seededRandom(rank) * 0.8)),
      change1h,
      change24h,
      change7d,
      change30d,
      change1y,
      dominancePct: 0,
      sparkline7d: makeSparkline(priceUsd, change7d, rank),
      isLiveApi: false,
    });
  }

  const totalCap = baseList.reduce((acc, c) => acc + c.marketCapUsd, 0);
  const totalVol = baseList.reduce((acc, c) => acc + c.volume24hUsd, 0);
  const btc = baseList.find((c) => c.symbol === 'BTC');
  const eth = baseList.find((c) => c.symbol === 'ETH');

  for (const coin of baseList) {
    coin.dominancePct = totalCap > 0 ? (coin.marketCapUsd / totalCap) * 100 : 0;
  }

  // Compute Altcoin Season Index from top 50 non-stablecoin altcoins outperforming BTC over 90d/30d
  const btcPerf = btc?.change30d ?? 18;
  const topAlts = baseList
    .filter((c) => c.symbol !== 'BTC' && c.category !== 'Stablecoin')
    .slice(0, 50);
  const outperformers = topAlts.filter((c) => c.change30d > btcPerf).length;
  const altcoinSeasonIndex = Math.min(98, Math.max(12, Math.round((outperformers / Math.max(1, topAlts.length)) * 100)));

  return {
    coins: baseList,
    derivedGlobal: {
      totalMarketCapUsd: totalCap,
      totalVolume24hUsd: totalVol,
      btcDominance: btc?.dominancePct ?? 56.4,
      ethDominance: eth?.dominancePct ?? 12.8,
      marketCapChange24h: btc?.change24h ?? 2.3,
      altcoinSeasonIndex,
    },
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function makeWalletHex(seed: number): string {
  const hex = (n: number) => Math.abs(Math.floor(seededRandom(n) * 0xffffff)).toString(16).padStart(6, '0');
  return `0x${hex(seed)}${hex(seed + 7)}...${hex(seed + 19).slice(0, 4)}`;
}

export function buildBubbleRadarGraph(
  coin: Coin,
  customWallet?: string
): BubbleRadarGraph {
  const trimmedWallet = customWallet?.trim() || '';
  const seedBase = hashString(`${coin.symbol}-${trimmedWallet}`);

  const clusterConfigs: Array<{
    cluster: BubbleClusterType;
    labels: string[];
    count: number;
    baseSupply: number;
    angleOffset: number;
  }> = [
    {
      cluster: 'Exchanges',
      labels: ['Binance Cold Vault', 'Coinbase Custody', 'OKX Hot Reserve', 'Kraken Treasury'],
      count: 4,
      baseSupply: 4.8,
      angleOffset: 0.3,
    },
    {
      cluster: 'Whales',
      labels: ['Whale Accumulator', 'Genesis Treasury', 'Sovereign Desk', 'Early Validator', 'Dormant Vault'],
      count: 5,
      baseSupply: 3.1,
      angleOffset: 1.9,
    },
    {
      cluster: 'Smart Money',
      labels: ['Wintermute MM', 'Jump Liquidity', 'Paradigm Fund', 'Amber Arbitrage', 'DeFi Vault Router'],
      count: 5,
      baseSupply: 1.75,
      angleOffset: 3.5,
    },
    {
      cluster: 'Retail',
      labels: ['Retail Pool Alpha', 'Staking Collective', 'DEX LP Cohort', 'Bridge Pool', 'Yield Cluster'],
      count: 5,
      baseSupply: 0.72,
      angleOffset: 5.0,
    },
  ];

  const nodes: BubbleNode[] = [];
  const centerX = 430;
  const centerY = 260;

  // Optional inspected custom wallet focal node
  if (trimmedWallet.length >= 6) {
    const pct = 1.4 + seededRandom(seedBase) * 3.8;
    const tokenAmount = (coin.circulatingSupply || 1000000) * (pct / 100);
    nodes.push({
      id: 'node-custom',
      address: trimmedWallet.length > 18 ? `${trimmedWallet.slice(0, 10)}...${trimmedWallet.slice(-6)}` : trimmedWallet,
      label: 'Target Inspected Wallet',
      cluster: 'Smart Money',
      supplyPct: Number(pct.toFixed(2)),
      tokenAmount,
      valueUsd: tokenAmount * coin.priceUsd,
      netFlow7dPct: Number(((seededRandom(seedBase + 3) - 0.35) * 28).toFixed(1)),
      x: centerX,
      y: centerY,
      radius: 34,
      txCount30d: Math.round(45 + seededRandom(seedBase + 9) * 320),
      firstSeen: '2022-04-19',
      connections: [],
    });
  }

  let idx = 0;
  for (const cfg of clusterConfigs) {
    for (let j = 0; j < cfg.count; j++) {
      const s = seedBase + idx * 17 + j * 31;
      const angle = cfg.angleOffset + (j / cfg.count) * 1.35 + (seededRandom(s) - 0.5) * 0.25;
      const dist = 105 + (j % 3) * 58 + seededRandom(s + 5) * 32;
      const x = Math.max(62, Math.min(798, centerX + Math.cos(angle) * dist * 1.25));
      const y = Math.max(58, Math.min(462, centerY + Math.sin(angle) * dist * 0.88));
      const supplyPct = Number(
        (cfg.baseSupply * (0.55 + seededRandom(s + 11) * 0.95)).toFixed(2)
      );
      const tokenAmount = (coin.circulatingSupply || 1000000) * (supplyPct / 100);
      const radius = Math.max(15, Math.min(40, 13 + supplyPct * 3.6));

      nodes.push({
        id: `node-${idx}`,
        address: makeWalletHex(s),
        label: cfg.labels[j % cfg.labels.length],
        cluster: cfg.cluster,
        supplyPct,
        tokenAmount,
        valueUsd: tokenAmount * coin.priceUsd,
        netFlow7dPct: Number(((seededRandom(s + 13) - 0.42) * 24).toFixed(1)),
        x: Math.round(x),
        y: Math.round(y),
        radius: Math.round(radius),
        txCount30d: Math.round(18 + seededRandom(s + 21) * 480),
        firstSeen: `202${1 + (s % 4)}-0${1 + (s % 9)}-${10 + (s % 18)}`,
        connections: [],
      });
      idx++;
    }
  }

  const edges: BubbleEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const targetCount = i === 0 && trimmedWallet ? 4 : 2;
    for (let k = 1; k <= targetCount; k++) {
      const bIdx = (i + k * 3 + (seedBase % 5)) % nodes.length;
      if (bIdx === i) continue;
      const b = nodes[bIdx];
      if (!edges.some((e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id))) {
        const vol = Math.min(a.valueUsd, b.valueUsd) * (0.08 + seededRandom(seedBase + i + k) * 0.25);
        edges.push({
          from: a.id,
          to: b.id,
          volumeUsd: vol,
          strength: Math.min(1, 0.3 + seededRandom(seedBase + i * k) * 0.7),
        });
        a.connections.push(b.id);
        b.connections.push(a.id);
      }
    }
  }

  const sortedBySupply = [...nodes].sort((a, b) => b.supplyPct - a.supplyPct);
  const top10HolderPct = Number(
    Math.min(78, sortedBySupply.slice(0, 10).reduce((acc, n) => acc + n.supplyPct, 0)).toFixed(1)
  );
  const exchangeCustodyPct = Number(
    nodes
      .filter((n) => n.cluster === 'Exchanges')
      .reduce((acc, n) => acc + n.supplyPct, 0)
      .toFixed(1)
  );
  const centralizationScore = Math.min(
    94,
    Math.max(18, Math.round(top10HolderPct * 0.92 + exchangeCustodyPct * 0.45))
  );

  const smartMoneyNet = nodes
    .filter((n) => n.cluster === 'Smart Money')
    .reduce((acc, n) => acc + n.netFlow7dPct, 0);

  return {
    coinSymbol: coin.symbol,
    coinName: coin.name,
    centralizationScore,
    top10HolderPct,
    exchangeCustodyPct,
    smartMoneyFlowLabel: smartMoneyNet >= 0 ? 'Net Accumulation' : 'Net Distribution',
    nodes,
    edges,
  };
}

const SIGNAL_TYPES: WhaleSignalType[] = [
  'Exchange Inflow',
  'Exchange Outflow',
  'Smart Money Swap',
];

const WALLET_TAGS = [
  'Whale 0x8f...3a91',
  'Institutional Custody',
  'Liquidity Maker',
  'Exchange Vault',
  'Sovereign Fund Desk',
  'Whale 0x4c...b712',
];

const COUNTERPARTIES = [
  'Binance Hot Vault',
  'Coinbase Prime Custody',
  'Uniswap v3 Pool',
  'OKX Settlement Desk',
  'Cold Multi-Sig 0x91...e4',
  'Wintermute OTC Router',
];

export function buildWhaleSignals(coins: Coin[], count = 18): WhaleSignal[] {
  const liquidCoins = coins.filter((c) => c.category !== 'Stablecoin').slice(0, 24);
  if (liquidCoins.length === 0) return [];

  const signals: WhaleSignal[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const coin = liquidCoins[i % liquidCoins.length];
    const seed = hashString(`${coin.symbol}-${i}`) + i * 37;
    const signalType = SIGNAL_TYPES[i % SIGNAL_TYPES.length];
    const targetUsd = 850_000 + seededRandom(seed) * 24_500_000;
    const amountTokens = coin.priceUsd > 0 ? targetUsd / coin.priceUsd : 0;

    const walletAddress = makeWalletHex(seed);
    const counterpartyAddress = makeWalletHex(seed + 99);
    const txHash = `0x${hashString(walletAddress + i).toString(16).padStart(8, '0')}${hashString(counterpartyAddress).toString(16).padStart(8, '0')}...${(seed % 9999).toString(16)}`;
    const ts = new Date(now - i * 4 * 60 * 1000 - (seed % 180) * 1000).toISOString();

    const walletTag =
      signalType === 'Exchange Outflow'
        ? 'Exchange Vault'
        : WALLET_TAGS[i % WALLET_TAGS.length];
    const counterpartyTag =
      signalType === 'Exchange Inflow'
        ? 'Binance Hot Vault'
        : signalType === 'Exchange Outflow'
        ? 'Cold Multi-Sig Custody'
        : COUNTERPARTIES[(i + 2) % COUNTERPARTIES.length];

    const trail: WhaleTrailStep[] = [
      {
        step: 1,
        fromLabel: walletTag,
        fromAddress: walletAddress,
        toLabel: 'Intermediate Mixer / Batcher',
        toAddress: makeWalletHex(seed + 41),
        amountTokens,
        amountUsd: targetUsd,
        txHash: `0x${(seed * 13).toString(16).slice(0, 12)}...a1`,
        timestamp: new Date(new Date(ts).getTime() - 120000).toISOString(),
        feeUsd: 4.2 + seededRandom(seed + 1) * 18,
      },
      {
        step: 2,
        fromLabel: 'Intermediate Batcher',
        fromAddress: makeWalletHex(seed + 41),
        toLabel: counterpartyTag,
        toAddress: counterpartyAddress,
        amountTokens: amountTokens * 0.9994,
        amountUsd: targetUsd * 0.9994,
        txHash,
        timestamp: ts,
        feeUsd: 6.8 + seededRandom(seed + 2) * 22,
      },
    ];

    if (signalType === 'Smart Money Swap') {
      trail.push({
        step: 3,
        fromLabel: counterpartyTag,
        fromAddress: counterpartyAddress,
        toLabel: 'Staking / Yield Vault',
        toAddress: makeWalletHex(seed + 77),
        amountTokens: amountTokens * 0.999,
        amountUsd: targetUsd * 0.999,
        txHash: `0x${(seed * 29).toString(16).slice(0, 12)}...f9`,
        timestamp: new Date(new Date(ts).getTime() + 45000).toISOString(),
        feeUsd: 3.5 + seededRandom(seed + 3) * 11,
      });
    }

    const impactScore = Math.min(96, Math.max(32, Math.round(35 + (targetUsd / 25_000_000) * 60)));
    const impactNote =
      signalType === 'Exchange Inflow'
        ? 'Elevated sell-side liquidity parked on spot order books'
        : signalType === 'Exchange Outflow'
        ? 'Supply absorbed into long-term custody, reducing exchange float'
        : 'Cross-venue smart-money rebalancing into high-conviction pool';

    signals.push({
      id: `sonar-${i}-${coin.symbol}`,
      timestamp: ts,
      coinId: coin.id,
      symbol: coin.symbol,
      coinName: coin.name,
      signalType,
      walletTag,
      walletAddress,
      counterpartyTag,
      counterpartyAddress,
      amountTokens,
      amountUsd: targetUsd,
      impactScore,
      impactNote,
      txHash,
      blockNumber: 21482000 + i * 17 + (seed % 50),
      trail,
    });
  }

  return signals;
}

export interface WhaleEntitySummary {
  mode: 'global' | 'coin' | 'wallet';
  title: string;
  subtitle: string;
  totalVolumeUsd: number;
  inflowUsd: number;
  outflowUsd: number;
  swapUsd: number;
  txCount: number;
  netBiasLabel: string;
  topCounterparty: string;
}

export function buildFilteredWhaleSonar(
  coins: Coin[],
  rawQuery: string,
  count = 84
): { signals: WhaleSignal[]; summary: WhaleEntitySummary } {
  const q = rawQuery.trim();
  const basePool = buildWhaleSignals(coins, count);

  if (!q) {
    const inflowUsd = basePool
      .filter((s) => s.signalType === 'Exchange Inflow')
      .reduce((a, b) => a + b.amountUsd, 0);
    const outflowUsd = basePool
      .filter((s) => s.signalType === 'Exchange Outflow')
      .reduce((a, b) => a + b.amountUsd, 0);
    const swapUsd = basePool
      .filter((s) => s.signalType === 'Smart Money Swap')
      .reduce((a, b) => a + b.amountUsd, 0);
    return {
      signals: basePool,
      summary: {
        mode: 'global',
        title: 'Global Cross-Chain Whale Radar',
        subtitle: `Tracking ${basePool.length} live high-value movements across Top 250 assets`,
        totalVolumeUsd: inflowUsd + outflowUsd + swapUsd,
        inflowUsd,
        outflowUsd,
        swapUsd,
        txCount: basePool.length,
        netBiasLabel: outflowUsd >= inflowUsd ? 'Net Cold Accumulation' : 'Net Exchange Inflow',
        topCounterparty: 'Coinbase Prime Custody',
      },
    };
  }

  const isWalletQuery = q.toLowerCase().startsWith('0x') || q.length >= 16;

  if (isWalletQuery) {
    const shortAddr = q.length > 16 ? `${q.slice(0, 8)}...${q.slice(-4)}` : q;
    const seedBase = hashString(q.toLowerCase());
    const liquid = coins.filter((c) => c.category !== 'Stablecoin').slice(0, 12);
    const walletSignals: WhaleSignal[] = [];
    const now = Date.now();

    for (let i = 0; i < 36; i++) {
      const coin = liquid[i % Math.max(1, liquid.length)] || coins[0];
      if (!coin) continue;
      const seed = seedBase + i * 53;
      const signalType = SIGNAL_TYPES[i % SIGNAL_TYPES.length];
      const targetUsd = 620_000 + seededRandom(seed) * 14_800_000;
      const amountTokens = coin.priceUsd > 0 ? targetUsd / coin.priceUsd : 0;
      const counterpartyAddr = makeWalletHex(seed + 71);
      const counterpartyTag = COUNTERPARTIES[i % COUNTERPARTIES.length];
      const ts = new Date(now - i * 9 * 60 * 1000).toISOString();
      const txHash = `0x${hashString(q + i).toString(16).padStart(8, '0')}${seed.toString(16).slice(0, 6)}...e${i % 9}`;

      walletSignals.push({
        id: `wallet-sonar-${i}-${shortAddr}`,
        timestamp: ts,
        coinId: coin.id,
        symbol: coin.symbol,
        coinName: coin.name,
        signalType,
        walletTag: `Target ${shortAddr}`,
        walletAddress: shortAddr,
        counterpartyTag,
        counterpartyAddress: counterpartyAddr,
        amountTokens,
        amountUsd: targetUsd,
        impactScore: Math.min(95, 42 + (seed % 50)),
        impactNote: `Direct wallet flow traced for ${shortAddr} via ${counterpartyTag}`,
        txHash,
        blockNumber: 21489100 + i * 11,
        trail: [
          {
            step: 1,
            fromLabel: `Target ${shortAddr}`,
            fromAddress: shortAddr,
            toLabel: 'Liquidity Aggregator',
            toAddress: makeWalletHex(seed + 19),
            amountTokens,
            amountUsd: targetUsd,
            txHash,
            timestamp: new Date(new Date(ts).getTime() - 90000).toISOString(),
            feeUsd: 5.4 + (seed % 14),
          },
          {
            step: 2,
            fromLabel: 'Liquidity Aggregator',
            fromAddress: makeWalletHex(seed + 19),
            toLabel: counterpartyTag,
            toAddress: counterpartyAddr,
            amountTokens: amountTokens * 0.9992,
            amountUsd: targetUsd * 0.9992,
            txHash: `0x${(seed * 17).toString(16).slice(0, 12)}...b4`,
            timestamp: ts,
            feeUsd: 8.1 + (seed % 19),
          },
        ],
      });
    }

    const inflowUsd = walletSignals
      .filter((s) => s.signalType === 'Exchange Inflow')
      .reduce((a, b) => a + b.amountUsd, 0);
    const outflowUsd = walletSignals
      .filter((s) => s.signalType === 'Exchange Outflow')
      .reduce((a, b) => a + b.amountUsd, 0);
    const swapUsd = walletSignals
      .filter((s) => s.signalType === 'Smart Money Swap')
      .reduce((a, b) => a + b.amountUsd, 0);

    return {
      signals: walletSignals,
      summary: {
        mode: 'wallet',
        title: `Wallet Entity Intelligence · ${shortAddr}`,
        subtitle: `30-day traced institutional & OTC flow cluster for ${q}`,
        totalVolumeUsd: inflowUsd + outflowUsd + swapUsd,
        inflowUsd,
        outflowUsd,
        swapUsd,
        txCount: walletSignals.length,
        netBiasLabel: outflowUsd >= inflowUsd ? 'Accumulating Cold Balance' : 'Active Exchange Distribution',
        topCounterparty: 'Wintermute OTC Router',
      },
    };
  }

  // Coin symbol or name search
  const lower = q.toLowerCase();
  const matchedCoin =
    coins.find((c) => c.symbol.toLowerCase() === lower) ||
    coins.find(
      (c) =>
        c.name.toLowerCase().includes(lower) || c.symbol.toLowerCase().includes(lower)
    );

  if (matchedCoin) {
    const seedBase = hashString(matchedCoin.symbol);
    const coinSignals: WhaleSignal[] = [];
    const now = Date.now();
    for (let i = 0; i < 45; i++) {
      const seed = seedBase + i * 41;
      const signalType = SIGNAL_TYPES[i % SIGNAL_TYPES.length];
      const targetUsd = 550_000 + seededRandom(seed) * 19_200_000;
      const amountTokens = matchedCoin.priceUsd > 0 ? targetUsd / matchedCoin.priceUsd : 0;
      const walletAddress = makeWalletHex(seed);
      const counterpartyAddress = makeWalletHex(seed + 83);
      const ts = new Date(now - i * 6 * 60 * 1000).toISOString();
      const walletTag =
        signalType === 'Exchange Outflow' ? 'Exchange Vault' : WALLET_TAGS[i % WALLET_TAGS.length];
      const counterpartyTag =
        signalType === 'Exchange Inflow'
          ? 'Binance Hot Vault'
          : signalType === 'Exchange Outflow'
          ? 'Cold Multi-Sig Custody'
          : COUNTERPARTIES[(i + 1) % COUNTERPARTIES.length];
      const txHash = `0x${hashString(matchedCoin.symbol + i).toString(16).padStart(8, '0')}${seed.toString(16).slice(0, 6)}...c${i % 9}`;

      coinSignals.push({
        id: `coin-sonar-${matchedCoin.symbol}-${i}`,
        timestamp: ts,
        coinId: matchedCoin.id,
        symbol: matchedCoin.symbol,
        coinName: matchedCoin.name,
        signalType,
        walletTag,
        walletAddress,
        counterpartyTag,
        counterpartyAddress,
        amountTokens,
        amountUsd: targetUsd,
        impactScore: Math.min(97, Math.max(35, Math.round(38 + (targetUsd / 20_000_000) * 58))),
        impactNote: `${matchedCoin.name} (${matchedCoin.symbol}) large order-book & custody movement`,
        txHash,
        blockNumber: 21486000 + i * 19,
        trail: [
          {
            step: 1,
            fromLabel: walletTag,
            fromAddress: walletAddress,
            toLabel: 'Cross-Venue Settlement Router',
            toAddress: makeWalletHex(seed + 33),
            amountTokens,
            amountUsd: targetUsd,
            txHash: `0x${(seed * 11).toString(16).slice(0, 12)}...a9`,
            timestamp: new Date(new Date(ts).getTime() - 105000).toISOString(),
            feeUsd: 3.9 + (seed % 16),
          },
          {
            step: 2,
            fromLabel: 'Cross-Venue Settlement Router',
            fromAddress: makeWalletHex(seed + 33),
            toLabel: counterpartyTag,
            toAddress: counterpartyAddress,
            amountTokens: amountTokens * 0.9995,
            amountUsd: targetUsd * 0.9995,
            txHash,
            timestamp: ts,
            feeUsd: 6.2 + (seed % 20),
          },
        ],
      });
    }

    const inflowUsd = coinSignals
      .filter((s) => s.signalType === 'Exchange Inflow')
      .reduce((a, b) => a + b.amountUsd, 0);
    const outflowUsd = coinSignals
      .filter((s) => s.signalType === 'Exchange Outflow')
      .reduce((a, b) => a + b.amountUsd, 0);
    const swapUsd = coinSignals
      .filter((s) => s.signalType === 'Smart Money Swap')
      .reduce((a, b) => a + b.amountUsd, 0);

    return {
      signals: coinSignals,
      summary: {
        mode: 'coin',
        title: `${matchedCoin.name} (${matchedCoin.symbol}) Whale Telemetry`,
        subtitle: `Rank #${matchedCoin.rank} · ${matchedCoin.category} · Live whale & smart-money ledger`,
        totalVolumeUsd: inflowUsd + outflowUsd + swapUsd,
        inflowUsd,
        outflowUsd,
        swapUsd,
        txCount: coinSignals.length,
        netBiasLabel: outflowUsd >= inflowUsd ? 'Net Custody Accumulation' : 'Exchange Sell Pressure',
        topCounterparty: 'Binance Hot Vault',
      },
    };
  }

  // Fallback synthetic match if user types an unlisted ticker like XMR
  const customSym = q.toUpperCase().slice(0, 6);
  const customSeed = hashString(customSym);
  const approxPrice = customSym === 'XMR' ? 168.4 : 12.5 + (customSeed % 85);
  const customSignals: WhaleSignal[] = Array.from({ length: 24 }).map((_, i) => {
    const seed = customSeed + i * 31;
    const signalType = SIGNAL_TYPES[i % SIGNAL_TYPES.length];
    const targetUsd = 480_000 + seededRandom(seed) * 9_500_000;
    const amountTokens = targetUsd / approxPrice;
    const walletAddress = makeWalletHex(seed);
    const counterpartyAddress = makeWalletHex(seed + 59);
    const ts = new Date(Date.now() - i * 8 * 60 * 1000).toISOString();
    const txHash = `0x${seed.toString(16).padStart(8, '0')}...f${i % 9}`;
    return {
      id: `custom-${customSym}-${i}`,
      timestamp: ts,
      coinId: customSym.toLowerCase(),
      symbol: customSym,
      coinName: customSym === 'XMR' ? 'Monero' : `${customSym} Network`,
      signalType,
      walletTag: WALLET_TAGS[i % WALLET_TAGS.length],
      walletAddress,
      counterpartyTag: COUNTERPARTIES[i % COUNTERPARTIES.length],
      counterpartyAddress,
      amountTokens,
      amountUsd: targetUsd,
      impactScore: 44 + (seed % 45),
      impactNote: `Matched whale transfer activity for ${customSym}`,
      txHash,
      blockNumber: 21485000 + i * 14,
      trail: [
        {
          step: 1,
          fromLabel: WALLET_TAGS[i % WALLET_TAGS.length],
          fromAddress: walletAddress,
          toLabel: COUNTERPARTIES[i % COUNTERPARTIES.length],
          toAddress: counterpartyAddress,
          amountTokens,
          amountUsd: targetUsd,
          txHash,
          timestamp: ts,
          feeUsd: 4.5,
        },
      ],
    };
  });

  const inflowUsd = customSignals
    .filter((s) => s.signalType === 'Exchange Inflow')
    .reduce((a, b) => a + b.amountUsd, 0);
  const outflowUsd = customSignals
    .filter((s) => s.signalType === 'Exchange Outflow')
    .reduce((a, b) => a + b.amountUsd, 0);
  const swapUsd = customSignals
    .filter((s) => s.signalType === 'Smart Money Swap')
    .reduce((a, b) => a + b.amountUsd, 0);

  return {
    signals: customSignals,
    summary: {
      mode: 'coin',
      title: `${customSym === 'XMR' ? 'Monero (XMR)' : customSym} Whale Flow Stream`,
      subtitle: `Filtered cross-venue transfers matching "${q}"`,
      totalVolumeUsd: inflowUsd + outflowUsd + swapUsd,
      inflowUsd,
      outflowUsd,
      swapUsd,
      txCount: customSignals.length,
      netBiasLabel: outflowUsd >= inflowUsd ? 'Net Custody Outflow' : 'Net Exchange Inflow',
      topCounterparty: 'Kraken Settlement Desk',
    },
  };
}

export const INITIAL_SQUARE_POSTS: SquarePost[] = [
  {
    id: 'sq-1',
    author: 'Elena Vance',
    handle: '@elenavance_macro',
    roleLabel: 'Macro Desk Analyst',
    avatarInitials: 'EV',
    avatarColor: '#0EA5E9',
    verified: true,
    following: true,
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    coinTags: ['BTC', 'ETH'],
    hashtags: ['#Bitcoin', '#InstitutionalFlow', '#CMC1000'],
    sentiment: 'bullish',
    category: 'Ideas',
    content:
      'Spot ETF net absorption just cleared 4.2x daily miner issuance again. Notice how exchange cold reserves on Pulser Bubble Radar keep thinning while spot bid depth shifts higher. Watching $BTC and $ETH weekly closes closely.',
    attachmentLabel: 'BTC Spot ETF Absorption vs Exchange Float',
    attachmentImage: '/src/assets/images/news_btc_etf_1795501197633.jpg',
    likes: 342,
    reposts: 68,
    comments: [
      {
        id: 'c-101',
        author: 'Tariq Mahmood',
        handle: '@tariq_pk_desk',
        content: 'Seeing strong PKR OTC premium on USDT pairs today too—retail demand is returning alongside institutional bids.',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'sq-2',
    author: 'OnChain Sonar Desk',
    handle: '@pulsersonar',
    roleLabel: 'Whale Telemetry',
    avatarInitials: 'OS',
    avatarColor: '#10B981',
    verified: true,
    following: true,
    timestamp: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    coinTags: ['SOL', 'JUP'],
    hashtags: ['#WhaleSonar', '#Solana', '#Altseason'],
    sentiment: 'bullish',
    category: 'Whale Alerts',
    content:
      'Whale Sonar Alert: Two institutional custody wallets withdrew $18.4M in $SOL from Binance Hot Vault into native validator staking contracts over the last 40 minutes. Multi-hop trail shows zero sell-side routing.',
    likes: 219,
    reposts: 54,
    comments: [],
  },
  {
    id: 'sq-3',
    author: 'Marcus Chen',
    handle: '@marcus_l2research',
    roleLabel: 'Protocol Researcher',
    avatarInitials: 'MC',
    avatarColor: '#8B5CF6',
    verified: true,
    following: false,
    timestamp: new Date(Date.now() - 1.8 * 3600 * 1000).toISOString(),
    coinTags: ['ARB', 'OP'],
    hashtags: ['#Layer2', '#Ethereum', '#DeFi'],
    sentiment: 'bullish',
    category: 'News',
    content:
      'Rollup calldata efficiency post-upgrade is driving record DEX settlement volume on $ARB and $OP. Expecting altcoin rotation to accelerate once the Altcoins Index breaks above 60.',
    attachmentLabel: 'L2 Throughput & Blob Utilization Snapshot',
    attachmentImage: '/src/assets/images/news_l2_scaling_1795501198050.jpg',
    likes: 164,
    reposts: 29,
    comments: [
      {
        id: 'c-102',
        author: 'Sana Qureshi',
        handle: '@sana_defi',
        content: 'Sub-cent swap fees on Arbitrum are making perp DEX hedging viable for smaller accounts.',
        timestamp: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'sq-4',
    author: 'Kieran Hale',
    handle: '@kieranhale_vol',
    roleLabel: 'Derivatives Trader',
    avatarInitials: 'KH',
    avatarColor: '#F43F5E',
    verified: false,
    following: false,
    timestamp: new Date(Date.now() - 3.4 * 3600 * 1000).toISOString(),
    coinTags: ['DOGE', 'XRP'],
    hashtags: ['#RiskManagement', '#CryptoMarkets'],
    sentiment: 'bearish',
    category: 'Ideas',
    content:
      'Funding rates on high-beta momentum names like $DOGE and $XRP are running elevated into weekend thin liquidity. Trimming 25% leverage here and setting Price Alert triggers below key 24h support.',
    likes: 97,
    reposts: 14,
    comments: [],
  },
];

