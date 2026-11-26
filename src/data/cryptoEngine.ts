import {
  BlockchainNetwork,
  BubbleClusterType,
  BubbleEdge,
  BubbleNode,
  BubbleRadarGraph,
  Coin,
  CoinContract,
  CoinLiquidityMap,
  EtfDailyFlowPoint,
  GlobalMarketStats,
  LiquidityLevel,
  ProMarketFilters,
  SpotEtfIssuer,
  SquarePost,
  WhaleSignal,
  WhaleSignalType,
  WhaleTrailStep,
} from '../types/crypto';

export type ChainNetwork = Exclude<BlockchainNetwork, 'All Networks'>;

export const BLOCKCHAIN_NETWORKS: BlockchainNetwork[] = [
  'All Networks',
  'Ethereum',
  'BNB Smart Chain (BSC)',
  'Solana',
  'Arbitrum',
  'Base',
  'Polygon',
  'Avalanche',
  'Optimism',
  'Tron',
  'Sui',
  'Aptos',
  'TON',
  'Cosmos',
  'Polkadot',
  'Cardano',
  'Near',
  'Fantom',
  'Mantle',
  'zkSync',
  'Linea',
  'Blast',
  'Cronos',
];

export const CHAIN_LIST: ChainNetwork[] = BLOCKCHAIN_NETWORKS.filter(
  (n): n is ChainNetwork => n !== 'All Networks'
);

export const EMPTY_PRO_FILTERS: ProMarketFilters = {
  category: 'All',
  marketCapMin: '',
  marketCapMax: '',
  fdvMin: '',
  fdvMax: '',
  change24hMin: '',
  change24hMax: '',
  vol24hMin: '',
  vol24hMax: '',
  vol24hPctMin: '',
  vol24hPctMax: '',
  oiMin: '',
  oiMax: '',
  oi24hPctMin: '',
  oi24hPctMax: '',
  derivVol24hMin: '',
  derivVol24hMax: '',
  fundingRateMin: '',
  fundingRateMax: '',
  longLiq24hMin: '',
  longLiq24hMax: '',
  shortLiq24hMin: '',
  shortLiq24hMax: '',
  totalLiq24hMin: '',
  totalLiq24hMax: '',
};

const KNOWN_COIN_NETWORKS: Record<string, ChainNetwork[]> = {
  BTC: ['Ethereum', 'Arbitrum', 'BNB Smart Chain (BSC)', 'Base', 'Solana', 'Avalanche', 'Optimism', 'Polygon'],
  ETH: ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Polygon', 'zkSync', 'Linea', 'Blast', 'Mantle', 'BNB Smart Chain (BSC)'],
  USDT: ['Ethereum', 'Tron', 'BNB Smart Chain (BSC)', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche', 'Optimism', 'TON', 'Near', 'Aptos', 'Mantle'],
  USDC: ['Ethereum', 'Solana', 'Base', 'Arbitrum', 'Polygon', 'Avalanche', 'Optimism', 'Sui', 'Noble' as ChainNetwork, 'Aptos', 'zkSync', 'Linea', 'Near'].filter((n): n is ChainNetwork => (CHAIN_LIST as string[]).includes(n)),
  SOL: ['Solana'],
  BNB: ['BNB Smart Chain (BSC)', 'Ethereum'],
  XRP: ['BNB Smart Chain (BSC)', 'Ethereum'],
  ADA: ['Cardano'],
  DOGE: ['BNB Smart Chain (BSC)', 'Ethereum'],
  TRX: ['Tron', 'Ethereum', 'BNB Smart Chain (BSC)'],
  AVAX: ['Avalanche', 'Ethereum', 'BNB Smart Chain (BSC)'],
  LINK: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base', 'Avalanche', 'BNB Smart Chain (BSC)', 'Linea', 'zkSync'],
  SUI: ['Sui'],
  TON: ['TON', 'Ethereum', 'BNB Smart Chain (BSC)'],
  DOT: ['Polkadot', 'Ethereum', 'BNB Smart Chain (BSC)'],
  UNI: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base', 'BNB Smart Chain (BSC)'],
  NEAR: ['Near', 'Ethereum', 'BNB Smart Chain (BSC)'],
  ARB: ['Arbitrum', 'Ethereum'],
  OP: ['Optimism', 'Ethereum'],
  RENDER: ['Solana', 'Ethereum', 'Polygon'],
  AAVE: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base', 'Avalanche', 'Fantom', 'zkSync'],
  TAO: ['Ethereum'],
  INJ: ['Cosmos', 'Ethereum', 'BNB Smart Chain (BSC)'],
  ONDO: ['Ethereum', 'Solana', 'Mantle', 'Sui', 'Polygon'],
  TIA: ['Cosmos', 'Arbitrum', 'Neutron' as ChainNetwork].filter((n): n is ChainNetwork => (CHAIN_LIST as string[]).includes(n)),
  APT: ['Aptos'],
  ATOM: ['Cosmos'],
  FTM: ['Fantom', 'Ethereum', 'BNB Smart Chain (BSC)'],
  MNT: ['Mantle', 'Ethereum'],
  ZK: ['zkSync', 'Ethereum'],
  BLAST: ['Blast', 'Ethereum'],
  CRO: ['Cronos', 'Ethereum', 'Cosmos'],
  MATIC: ['Polygon', 'Ethereum'],
  POL: ['Polygon', 'Ethereum'],
  JUP: ['Solana'],
  SHIB: ['Ethereum', 'BNB Smart Chain (BSC)'],
  PEPE: ['Ethereum', 'Arbitrum', 'Base'],
};

const KNOWN_CONTRACTS: Record<string, CoinContract[]> = {
  USDT: [
    { network: 'Ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { network: 'Tron', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
    { network: 'BNB Smart Chain (BSC)', address: '0x55d398326f99059fF775485246999027B3197955' },
    { network: 'Solana', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
    { network: 'Arbitrum', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
  ],
  USDC: [
    { network: 'Ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { network: 'Solana', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { network: 'Base', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    { network: 'Arbitrum', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  ],
  LINK: [
    { network: 'Ethereum', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
    { network: 'Arbitrum', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' },
  ],
  UNI: [
    { network: 'Ethereum', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
    { network: 'Arbitrum', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' },
  ],
  ARB: [
    { network: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
    { network: 'Ethereum', address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1' },
  ],
  OP: [
    { network: 'Optimism', address: '0x4200000000000000000000000000000000000042' },
  ],
  AAVE: [
    { network: 'Ethereum', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
    { network: 'Base', address: '0x63706e401c06ac8513145b7687A14804d17f814b' },
  ],
  ONDO: [
    { network: 'Ethereum', address: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3' },
  ],
  RENDER: [
    { network: 'Solana', address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof' },
    { network: 'Ethereum', address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24' },
  ],
  BTC: [
    { network: 'Ethereum', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    { network: 'Arbitrum', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  ],
  ETH: [
    { network: 'Ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    { network: 'Base', address: '0x4200000000000000000000000000000000000006' },
  ],
};

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
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', priceUsd: 0.0000248, marketCapUsd: 14600000000, category: 'Meme', change1h: 0.22, change24h: 3.45, change7d: 9.1, change30d: 31.2, change1y: 195.0, circulatingSupply: 589260000000000, maxSupply: null },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', priceUsd: 96.4, marketCapUsd: 7240000000, category: 'Payments', change1h: 0.18, change24h: 2.15, change7d: 7.3, change30d: 26.4, change1y: 38.2, circulatingSupply: 75100000, maxSupply: 84000000 },
  { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', priceUsd: 492.0, marketCapUsd: 9730000000, category: 'Payments', change1h: 0.25, change24h: 2.84, change7d: 8.6, change30d: 34.0, change1y: 112.0, circulatingSupply: 19780000, maxSupply: 21000000 },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', priceUsd: 0.0000192, marketCapUsd: 8080000000, category: 'Meme', change1h: 0.85, change24h: 6.72, change7d: 18.4, change30d: 95.1, change1y: 1280.0, circulatingSupply: 420690000000000, maxSupply: 420690000000000 },
  { id: 'hedera-hashgraph', symbol: 'HBAR', name: 'Hedera', priceUsd: 0.148, marketCapUsd: 5580000000, category: 'Enterprise', change1h: 0.54, change24h: 5.18, change7d: 24.5, change30d: 185.0, change1y: 140.0, circulatingSupply: 37700000000, maxSupply: 50000000000 },
  { id: 'aptos', symbol: 'APT', name: 'Aptos', priceUsd: 11.9, marketCapUsd: 6320000000, category: 'Layer 1', change1h: 0.41, change24h: 4.12, change7d: 13.8, change30d: 28.9, change1y: 62.5, circulatingSupply: 531000000, maxSupply: null },
  { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer', priceUsd: 11.4, marketCapUsd: 5410000000, category: 'AI & Compute', change1h: 0.33, change24h: 3.85, change7d: 15.6, change30d: 41.2, change1y: 148.0, circulatingSupply: 474500000, maxSupply: null },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar', priceUsd: 0.448, marketCapUsd: 13450000000, category: 'Payments', change1h: 0.92, change24h: 6.45, change7d: 28.4, change30d: 310.0, change1y: 265.0, circulatingSupply: 30020000000, maxSupply: 50001806812 },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', priceUsd: 7.85, marketCapUsd: 3060000000, category: 'Layer 0', change1h: 0.29, change24h: 3.14, change7d: 11.2, change30d: 58.4, change1y: -14.2, circulatingSupply: 390900000, maxSupply: null },
  { id: 'filecoin', symbol: 'FIL', name: 'Filecoin', priceUsd: 5.68, marketCapUsd: 3440000000, category: 'Storage', change1h: 0.37, change24h: 4.02, change7d: 14.8, change30d: 52.1, change1y: 18.4, circulatingSupply: 605600000, maxSupply: null },
  { id: 'vechain', symbol: 'VET', name: 'VeChain', priceUsd: 0.042, marketCapUsd: 3400000000, category: 'Enterprise', change1h: 0.44, change24h: 4.55, change7d: 19.2, change30d: 94.0, change1y: 92.1, circulatingSupply: 80985000000, maxSupply: 86712634466 },
  { id: 'kaspa', symbol: 'KAS', name: 'Kaspa', priceUsd: 0.158, marketCapUsd: 3990000000, category: 'Layer 1', change1h: 0.15, change24h: 2.38, change7d: 6.9, change30d: 24.5, change1y: 22.8, circulatingSupply: 25250000000, maxSupply: 28704026601 },
  { id: 'fetch-ai', symbol: 'FET', name: 'Artificial Superintelligence Alliance', priceUsd: 1.48, marketCapUsd: 3610000000, category: 'AI & Compute', change1h: 0.72, change24h: 5.84, change7d: 13.7, change30d: 18.9, change1y: 195.0, circulatingSupply: 2440000000, maxSupply: 2719493897 },
  { id: 'blockstack', symbol: 'STX', name: 'Stacks', priceUsd: 2.18, marketCapUsd: 3270000000, category: 'Layer 2', change1h: 0.46, change24h: 4.62, change7d: 15.1, change30d: 32.4, change1y: 204.0, circulatingSupply: 1500000000, maxSupply: 1818000000 },
  { id: 'maker', symbol: 'MKR', name: 'Maker', priceUsd: 1840.0, marketCapUsd: 1620000000, category: 'DeFi', change1h: 0.32, change24h: 3.18, change7d: 11.4, change30d: 44.2, change1y: 22.1, circulatingSupply: 880000, maxSupply: 1005577 },
  { id: 'immutable-x', symbol: 'IMX', name: 'Immutable', priceUsd: 1.72, marketCapUsd: 2890000000, category: 'Gaming', change1h: 0.51, change24h: 4.92, change7d: 16.8, change30d: 38.5, change1y: 24.6, circulatingSupply: 1680000000, maxSupply: 2000000000 },
  { id: 'sei-network', symbol: 'SEI', name: 'Sei', priceUsd: 0.585, marketCapUsd: 2330000000, category: 'Layer 1', change1h: 0.88, change24h: 6.45, change7d: 19.3, change30d: 48.2, change1y: 145.0, circulatingSupply: 3980000000, maxSupply: 10000000000 },
  { id: 'jupiter-exchange-solana', symbol: 'JUP', name: 'Jupiter', priceUsd: 1.14, marketCapUsd: 1540000000, category: 'DeFi', change1h: 0.76, change24h: 5.95, change7d: 14.1, change30d: 36.7, change1y: 85.4, circulatingSupply: 1350000000, maxSupply: 10000000000 },
  { id: 'mantra-dao', symbol: 'OM', name: 'MANTRA', priceUsd: 3.84, marketCapUsd: 3580000000, category: 'RWA', change1h: 0.61, change24h: 4.82, change7d: 17.6, change30d: 148.0, change1y: 9800.0, circulatingSupply: 932000000, maxSupply: null },
  { id: 'pendle', symbol: 'PENDLE', name: 'Pendle', priceUsd: 5.42, marketCapUsd: 884000000, category: 'RWA', change1h: 0.69, change24h: 6.14, change7d: 18.2, change30d: 42.5, change1y: 365.0, circulatingSupply: 163000000, maxSupply: 258446028 },
  { id: 'ethena', symbol: 'ENA', name: 'Ethena', priceUsd: 0.68, marketCapUsd: 1930000000, category: 'DeFi', change1h: 0.84, change24h: 7.45, change7d: 26.8, change30d: 94.2, change1y: 42.0, circulatingSupply: 2840000000, maxSupply: 15000000000 },
  { id: 'dogwifcoin', symbol: 'WIF', name: 'dogwifhat', priceUsd: 3.24, marketCapUsd: 3230000000, category: 'Meme', change1h: -0.45, change24h: 4.15, change7d: 12.4, change30d: 39.2, change1y: 1850.0, circulatingSupply: 998900000, maxSupply: 998900000 },
  { id: 'bonk', symbol: 'BONK', name: 'Bonk', priceUsd: 0.0000442, marketCapUsd: 3320000000, category: 'Meme', change1h: 0.64, change24h: 5.92, change7d: 21.8, change30d: 112.0, change1y: 940.0, circulatingSupply: 75120000000000, maxSupply: 92700000000000 },
  { id: 'pax-gold', symbol: 'PAXG', name: 'PAX Gold', priceUsd: 2685.0, marketCapUsd: 532000000, category: 'RWA', change1h: 0.05, change24h: 0.84, change7d: 2.1, change30d: 4.5, change1y: 34.2, circulatingSupply: 198100, maxSupply: null },
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

function makeContractAddress(network: ChainNetwork, seed: number): string {
  const hexChars = '0123456789abcdef';
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  if (network === 'Solana') {
    let out = '';
    for (let i = 0; i < 44; i++) {
      out += base58Chars[Math.floor(seededRandom(seed * 17 + i) * base58Chars.length)];
    }
    return out;
  }
  if (network === 'Tron') {
    let out = 'T';
    for (let i = 0; i < 33; i++) {
      out += base58Chars[Math.floor(seededRandom(seed * 23 + i) * base58Chars.length)];
    }
    return out;
  }
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += hexChars[Math.floor(seededRandom(seed * 13 + i) * hexChars.length)];
  }
  return addr;
}

function hydrateCoinTelemetry(coin: Coin, index: number): Coin {
  const sym = coin.symbol.toUpperCase();
  const seed = hashString(`${sym}-${coin.id}-${index}`);
  const knownNets = KNOWN_COIN_NETWORKS[sym];
  let networks: ChainNetwork[];
  if (knownNets && knownNets.length > 0) {
    networks = knownNets;
  } else {
    const primary = CHAIN_LIST[(seed + index) % CHAIN_LIST.length];
    const secondary = CHAIN_LIST[(seed + index * 5 + 3) % CHAIN_LIST.length];
    const tertiary = CHAIN_LIST[(seed + index * 9 + 7) % CHAIN_LIST.length];
    networks = Array.from(new Set([primary, secondary, ...(index % 3 === 0 ? [tertiary] : [])]));
  }

  const knownContracts = KNOWN_CONTRACTS[sym];
  const contracts: CoinContract[] =
    knownContracts && knownContracts.length > 0
      ? knownContracts
      : networks.slice(0, 2).map((net, nIdx) => ({
          network: net,
          address: makeContractAddress(net, seed + nIdx * 97),
        }));

  const isStable = coin.category === 'Stablecoin';
  const volBase = Math.max(coin.volume24hUsd || 100000, 100000);
  const vol24hChangePct = Number(
    (((seededRandom(seed + 11) - 0.42) * 86) + coin.change24h * 1.4).toFixed(2)
  );
  const openInterestUsd = isStable
    ? volBase * 0.04
    : coin.marketCapUsd * (0.018 + seededRandom(seed + 19) * 0.068);
  const oiChange24hPct = isStable
    ? Number(((seededRandom(seed + 29) - 0.5) * 1.8).toFixed(2))
    : Number(((seededRandom(seed + 29) - 0.44) * 24 + coin.change24h * 0.65).toFixed(2));
  const derivativesVol24hUsd = isStable
    ? volBase * 0.09
    : volBase * (1.35 + seededRandom(seed + 37) * 2.45);
  const fundingRatePct = isStable
    ? 0.0005
    : Number(((seededRandom(seed + 43) - 0.36) * 0.065 + coin.change24h * 0.0018).toFixed(4));

  const liqPoolUsd = isStable
    ? 12000
    : Math.max(1500, openInterestUsd * (0.004 + Math.abs(coin.change24h) * 0.0016 + seededRandom(seed + 53) * 0.008));
  const longShare =
    coin.change24h < 0
      ? 0.56 + seededRandom(seed + 61) * 0.28
      : 0.22 + seededRandom(seed + 61) * 0.28;
  const longLiq24hUsd = liqPoolUsd * longShare;
  const shortLiq24hUsd = liqPoolUsd * (1 - longShare);

  return {
    ...coin,
    vol24hChangePct: coin.vol24hChangePct ?? vol24hChangePct,
    networks: coin.networks?.length ? coin.networks : networks,
    contracts: coin.contracts?.length ? coin.contracts : contracts,
    openInterestUsd: coin.openInterestUsd ?? openInterestUsd,
    oiChange24hPct: coin.oiChange24hPct ?? oiChange24hPct,
    derivativesVol24hUsd: coin.derivativesVol24hUsd ?? derivativesVol24hUsd,
    fundingRatePct: coin.fundingRatePct ?? fundingRatePct,
    longLiq24hUsd: coin.longLiq24hUsd ?? longLiq24hUsd,
    shortLiq24hUsd: coin.shortLiq24hUsd ?? shortLiq24hUsd,
    totalLiq24hUsd: coin.totalLiq24hUsd ?? longLiq24hUsd + shortLiq24hUsd,
  };
}

const ALTCOIN_SEASON_EXCLUDED_SYMBOLS = new Set([
  'BTC',
  'USDT',
  'USDC',
  'FDUSD',
  'TUSD',
  'USDP',
  'DAI',
  'BUSD',
  'PYUSD',
  'USDE',
  'USD1',
  'RLUSD',
  'USDS',
  'SUSDE',
  'USD0',
  'USDD',
  'FRAX',
  'EURC',
  'GUSD',
  'WBTC',
  'CBBTC',
  'BTCB',
  'FBTC',
  'LBTC',
  'WETH',
  'WSOL',
  'WBNB',
  'STETH',
  'WSTETH',
  'WEETH',
  'EETH',
  'CBETH',
  'RETH',
  'METH',
  'BETH',
  'JITOSOL',
  'MSOL',
  'BNSOL',
  'PAXG',
  'XAUT',
]);

export function isAltcoinSeasonEligible(coin: Pick<Coin, 'symbol' | 'category'>): boolean {
  if (coin.category === 'Stablecoin') return false;
  return !ALTCOIN_SEASON_EXCLUDED_SYMBOLS.has(coin.symbol.toUpperCase());
}

export function getCoinChange90d(
  coin: Pick<Coin, 'change30d' | 'change1y' | 'change90d'>
): number {
  if (typeof coin.change90d === 'number' && Number.isFinite(coin.change90d)) {
    return coin.change90d;
  }
  const c30 = Number.isFinite(coin.change30d) ? coin.change30d : 0;
  const c1y = Number.isFinite(coin.change1y) ? coin.change1y : c30 * 2.5;
  const r30 = 1 + c30 / 100;
  const r365 = 1 + c1y / 100;
  if (r30 > 0 && r365 > 0) {
    return (r30 * Math.pow(r365 / r30, (90 - 30) / (365 - 30)) - 1) * 100;
  }
  return c30 * 1.65 + (c1y - c30) * 0.18;
}

export function buildTop1000Coins(liveCoins: Coin[]): {
  coins: Coin[];
  derivedGlobal: Partial<GlobalMarketStats>;
} {
  const baseList: Coin[] =
    liveCoins.length > 0
      ? liveCoins.map((c, idx) => hydrateCoinTelemetry({ ...c }, idx))
      : BASELINE_TOP_COINS.map((c, idx) => {
          const vol = c.marketCapUsd * (0.03 + seededRandom(idx + 7) * 0.07);
          const ch24 = c.change24h ?? 1.5;
          return hydrateCoinTelemetry(
            {
              id: c.id,
              rank: idx + 1,
              symbol: c.symbol,
              name: c.name,
              category: c.category,
              priceUsd: c.priceUsd,
              marketCapUsd: c.marketCapUsd,
              fdvUsd: c.marketCapUsd * 1.15,
              volume24hUsd: vol,
              vol24hChangePct: 0,
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
              networks: [],
              contracts: [],
              openInterestUsd: 0,
              oiChange24hPct: 0,
              derivativesVol24hUsd: 0,
              fundingRatePct: 0,
              longLiq24hUsd: 0,
              shortLiq24hUsd: 0,
              totalLiq24hUsd: 0,
              isLiveApi: false,
            },
            idx
          );
        });

  const totalCap = baseList.reduce((acc, c) => acc + c.marketCapUsd, 0);
  const totalVol = baseList.reduce((acc, c) => acc + c.volume24hUsd, 0);
  const btc = baseList.find((c) => c.symbol === 'BTC');
  const eth = baseList.find((c) => c.symbol === 'ETH');

  for (const coin of baseList) {
    coin.dominancePct = totalCap > 0 ? (coin.marketCapUsd / totalCap) * 100 : 0;
    if (typeof coin.change90d !== 'number' || !Number.isFinite(coin.change90d)) {
      coin.change90d = getCoinChange90d(coin);
    }
  }

  // CoinMarketCap 90-day Altcoin Season methodology: % of top 100 non-stablecoin assets outperforming BTC over 90 days
  const btcPerf90d = btc ? getCoinChange90d(btc) : 18;
  const top100Alts = baseList.filter(isAltcoinSeasonEligible).slice(0, 100);
  const outperformers = top100Alts.filter((c) => getCoinChange90d(c) > btcPerf90d).length;
  const altcoinSeasonIndex = Math.min(
    100,
    Math.max(0, Math.round((outperformers / Math.max(1, top100Alts.length)) * 100))
  );

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

function parseOptionalNumber(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function countActiveProFilters(f: ProMarketFilters): number {
  let count = 0;
  if (f.category !== 'All') count++;
  if (f.marketCapMin.trim() || f.marketCapMax.trim()) count++;
  if (f.fdvMin.trim() || f.fdvMax.trim()) count++;
  if (f.change24hMin.trim() || f.change24hMax.trim()) count++;
  if (f.vol24hMin.trim() || f.vol24hMax.trim()) count++;
  if (f.vol24hPctMin.trim() || f.vol24hPctMax.trim()) count++;
  if (f.oiMin.trim() || f.oiMax.trim()) count++;
  if (f.oi24hPctMin.trim() || f.oi24hPctMax.trim()) count++;
  if (f.derivVol24hMin.trim() || f.derivVol24hMax.trim()) count++;
  if (f.fundingRateMin.trim() || f.fundingRateMax.trim()) count++;
  if (f.longLiq24hMin.trim() || f.longLiq24hMax.trim()) count++;
  if (f.shortLiq24hMin.trim() || f.shortLiq24hMax.trim()) count++;
  if (f.totalLiq24hMin.trim() || f.totalLiq24hMax.trim()) count++;
  return count;
}

export function applyProMarketFilters(
  coins: Coin[],
  network: BlockchainNetwork,
  f: ProMarketFilters
): Coin[] {
  const mcapMin = parseOptionalNumber(f.marketCapMin);
  const mcapMax = parseOptionalNumber(f.marketCapMax);
  const fdvMin = parseOptionalNumber(f.fdvMin);
  const fdvMax = parseOptionalNumber(f.fdvMax);
  const ch24Min = parseOptionalNumber(f.change24hMin);
  const ch24Max = parseOptionalNumber(f.change24hMax);
  const volMin = parseOptionalNumber(f.vol24hMin);
  const volMax = parseOptionalNumber(f.vol24hMax);
  const volPctMin = parseOptionalNumber(f.vol24hPctMin);
  const volPctMax = parseOptionalNumber(f.vol24hPctMax);
  const oiMin = parseOptionalNumber(f.oiMin);
  const oiMax = parseOptionalNumber(f.oiMax);
  const oiPctMin = parseOptionalNumber(f.oi24hPctMin);
  const oiPctMax = parseOptionalNumber(f.oi24hPctMax);
  const derivMin = parseOptionalNumber(f.derivVol24hMin);
  const derivMax = parseOptionalNumber(f.derivVol24hMax);
  const fundMin = parseOptionalNumber(f.fundingRateMin);
  const fundMax = parseOptionalNumber(f.fundingRateMax);
  const longLiqMin = parseOptionalNumber(f.longLiq24hMin);
  const longLiqMax = parseOptionalNumber(f.longLiq24hMax);
  const shortLiqMin = parseOptionalNumber(f.shortLiq24hMin);
  const shortLiqMax = parseOptionalNumber(f.shortLiq24hMax);
  const totalLiqMin = parseOptionalNumber(f.totalLiq24hMin);
  const totalLiqMax = parseOptionalNumber(f.totalLiq24hMax);

  return coins.filter((c) => {
    if (network !== 'All Networks' && !c.networks.includes(network)) return false;
    if (f.category !== 'All' && c.category !== f.category) return false;
    if (mcapMin !== null && c.marketCapUsd < mcapMin) return false;
    if (mcapMax !== null && c.marketCapUsd > mcapMax) return false;
    if (fdvMin !== null && c.fdvUsd < fdvMin) return false;
    if (fdvMax !== null && c.fdvUsd > fdvMax) return false;
    if (ch24Min !== null && c.change24h < ch24Min) return false;
    if (ch24Max !== null && c.change24h > ch24Max) return false;
    if (volMin !== null && c.volume24hUsd < volMin) return false;
    if (volMax !== null && c.volume24hUsd > volMax) return false;
    if (volPctMin !== null && c.vol24hChangePct < volPctMin) return false;
    if (volPctMax !== null && c.vol24hChangePct > volPctMax) return false;
    if (oiMin !== null && c.openInterestUsd < oiMin) return false;
    if (oiMax !== null && c.openInterestUsd > oiMax) return false;
    if (oiPctMin !== null && c.oiChange24hPct < oiPctMin) return false;
    if (oiPctMax !== null && c.oiChange24hPct > oiPctMax) return false;
    if (derivMin !== null && c.derivativesVol24hUsd < derivMin) return false;
    if (derivMax !== null && c.derivativesVol24hUsd > derivMax) return false;
    if (fundMin !== null && c.fundingRatePct < fundMin) return false;
    if (fundMax !== null && c.fundingRatePct > fundMax) return false;
    if (longLiqMin !== null && c.longLiq24hUsd < longLiqMin) return false;
    if (longLiqMax !== null && c.longLiq24hUsd > longLiqMax) return false;
    if (shortLiqMin !== null && c.shortLiq24hUsd < shortLiqMin) return false;
    if (shortLiqMax !== null && c.shortLiq24hUsd > shortLiqMax) return false;
    if (totalLiqMin !== null && c.totalLiq24hUsd < totalLiqMin) return false;
    if (totalLiqMax !== null && c.totalLiq24hUsd > totalLiqMax) return false;
    return true;
  });
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

export function buildCoinLiquidityMap(coin: Coin): CoinLiquidityMap {
  const seed = hashString(`liq-${coin.symbol}-${coin.rank}`);
  const mid = coin.priceUsd || 1;
  const baseDepthScale = Math.max(180_000, coin.volume24hUsd * 0.018);

  const distances = [0.2, 0.45, 0.75, 1.1, 1.5, 1.95, 2.4, 2.9, 3.5, 4.1, 4.8, 5.5];
  const bidWallIdx = 2 + (seed % 4);
  const askWallIdx = 3 + ((seed >> 2) % 4);

  const bids: LiquidityLevel[] = [];
  let cumBid = 0;
  for (let i = 0; i < distances.length; i++) {
    const dist = distances[i];
    const isWall = i === bidWallIdx || i === bidWallIdx + 4;
    const rawSize =
      baseDepthScale *
      (0.35 + seededRandom(seed + i * 17) * 0.9) *
      (isWall ? 3.2 : 1);
    cumBid += rawSize;
    bids.push({
      priceUsd: mid * (1 - dist / 100),
      distancePct: -dist,
      sizeUsd: rawSize,
      cumulativeUsd: cumBid,
      side: 'bid',
      isWall,
      clusterLabel: isWall
        ? i === bidWallIdx
          ? 'Whale Bid Wall'
          : 'Institutional Support Shelf'
        : i % 3 === 0
        ? 'Limit Bid Cluster'
        : undefined,
    });
  }

  const asks: LiquidityLevel[] = [];
  let cumAsk = 0;
  for (let i = 0; i < distances.length; i++) {
    const dist = distances[i];
    const isWall = i === askWallIdx || i === askWallIdx + 3;
    const rawSize =
      baseDepthScale *
      (0.32 + seededRandom(seed + i * 29 + 101) * 0.88) *
      (isWall ? 3.1 : 1);
    cumAsk += rawSize;
    asks.push({
      priceUsd: mid * (1 + dist / 100),
      distancePct: dist,
      sizeUsd: rawSize,
      cumulativeUsd: cumAsk,
      side: 'ask',
      isWall,
      clusterLabel: isWall
        ? i === askWallIdx
          ? 'MM Ask Resistance Wall'
          : 'Liquidation & Supply Shelf'
        : i % 3 === 1
        ? 'Resting Ask Cluster'
        : undefined,
    });
  }

  const bidDepth2PctUsd = bids
    .filter((b) => Math.abs(b.distancePct) <= 2.0)
    .reduce((acc, b) => acc + b.sizeUsd, 0);
  const askDepth2PctUsd = asks
    .filter((a) => Math.abs(a.distancePct) <= 2.0)
    .reduce((acc, a) => acc + a.sizeUsd, 0);

  const biggestBidWall = [...bids].sort((a, b) => b.sizeUsd - a.sizeUsd)[0];
  const biggestAskWall = [...asks].sort((a, b) => b.sizeUsd - a.sizeUsd)[0];

  return {
    coinId: coin.id,
    symbol: coin.symbol,
    midPriceUsd: mid,
    spreadBps: Number((0.8 + seededRandom(seed + 5) * 3.4).toFixed(2)),
    bidDepth2PctUsd,
    askDepth2PctUsd,
    biggestBidWall,
    biggestAskWall,
    bids,
    asks,
  };
}

export function buildSpotEtfData(
  btcPriceUsd: number,
  ethPriceUsd: number
): {
  btcIssuers: SpotEtfIssuer[];
  ethIssuers: SpotEtfIssuer[];
  dailyFlows: EtfDailyFlowPoint[];
} {
  const btcPrice = btcPriceUsd > 0 ? btcPriceUsd : 94280;
  const ethPrice = ethPriceUsd > 0 ? ethPriceUsd : 3340;

  const btcSpecs: Array<{
    ticker: string;
    name: string;
    issuer: string;
    feePct: number;
    units: number;
    flow1dM: number;
    flow7dM: number;
    volM: number;
  }> = [
    { ticker: 'IBIT', name: 'iShares Bitcoin Trust', issuer: 'BlackRock', feePct: 0.25, units: 492400, flow1dM: 318.4, flow7dM: 1420.6, volM: 2840 },
    { ticker: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund', issuer: 'Fidelity', feePct: 0.25, units: 198600, flow1dM: 124.8, flow7dM: 586.2, volM: 695 },
    { ticker: 'GBTC', name: 'Grayscale Bitcoin Trust', issuer: 'Grayscale', feePct: 1.50, units: 214500, flow1dM: -42.5, flow7dM: -195.4, volM: 412 },
    { ticker: 'ARKB', name: 'ARK 21Shares Bitcoin ETF', issuer: 'Ark / 21Shares', feePct: 0.21, units: 52800, flow1dM: 61.2, flow7dM: 218.5, volM: 215 },
    { ticker: 'BITB', name: 'Bitwise Bitcoin ETF', issuer: 'Bitwise', feePct: 0.20, units: 43200, flow1dM: 38.9, flow7dM: 144.0, volM: 164 },
    { ticker: 'BTC', name: 'Grayscale Bitcoin Mini Trust', issuer: 'Grayscale', feePct: 0.15, units: 39400, flow1dM: 24.6, flow7dM: 92.3, volM: 118 },
    { ticker: 'HODL', name: 'VanEck Bitcoin Trust', issuer: 'VanEck', feePct: 0.20, units: 14800, flow1dM: 14.2, flow7dM: 51.8, volM: 68 },
    { ticker: 'BRRR', name: 'CoinShares Valkyrie Bitcoin Fund', issuer: 'Valkyrie', feePct: 0.25, units: 9400, flow1dM: 7.4, flow7dM: 28.1, volM: 39 },
  ];

  const ethSpecs: Array<{
    ticker: string;
    name: string;
    issuer: string;
    feePct: number;
    units: number;
    flow1dM: number;
    flow7dM: number;
    volM: number;
  }> = [
    { ticker: 'ETHA', name: 'iShares Ethereum Trust', issuer: 'BlackRock', feePct: 0.25, units: 842000, flow1dM: 86.4, flow7dM: 364.2, volM: 412 },
    { ticker: 'ETHE', name: 'Grayscale Ethereum Trust', issuer: 'Grayscale', feePct: 2.50, units: 1380000, flow1dM: -18.6, flow7dM: -74.8, volM: 245 },
    { ticker: 'FETH', name: 'Fidelity Ethereum Fund', issuer: 'Fidelity', feePct: 0.25, units: 415000, flow1dM: 41.2, flow7dM: 178.9, volM: 162 },
    { ticker: 'ETH', name: 'Grayscale Ethereum Mini Trust', issuer: 'Grayscale', feePct: 0.15, units: 468000, flow1dM: 19.5, flow7dM: 84.3, volM: 118 },
    { ticker: 'ETHW', name: 'Bitwise Ethereum ETF', issuer: 'Bitwise', feePct: 0.20, units: 136000, flow1dM: 12.8, flow7dM: 48.2, volM: 64 },
    { ticker: 'ETHV', name: 'VanEck Ethereum ETF', issuer: 'VanEck', feePct: 0.20, units: 48500, flow1dM: 5.1, flow7dM: 19.4, volM: 27 },
  ];

  const btcIssuers: SpotEtfIssuer[] = btcSpecs.map((s) => ({
    ticker: s.ticker,
    name: s.name,
    issuer: s.issuer,
    asset: 'BTC',
    feePct: s.feePct,
    aumUsd: s.units * btcPrice,
    netFlow1dUsd: s.flow1dM * 1_000_000,
    netFlow7dUsd: s.flow7dM * 1_000_000,
    volume24hUsd: s.volM * 1_000_000,
    holdingsUnits: s.units,
  }));

  const ethIssuers: SpotEtfIssuer[] = ethSpecs.map((s) => ({
    ticker: s.ticker,
    name: s.name,
    issuer: s.issuer,
    asset: 'ETH',
    feePct: s.feePct,
    aumUsd: s.units * ethPrice,
    netFlow1dUsd: s.flow1dM * 1_000_000,
    netFlow7dUsd: s.flow7dM * 1_000_000,
    volume24hUsd: s.volM * 1_000_000,
    holdingsUnits: s.units,
  }));

  const dailyFlows: EtfDailyFlowPoint[] = [];
  const now = Date.now();
  for (let i = 20; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const s = hashString(`etf-day-${i}`);
    const btcFlow =
      i === 0
        ? btcIssuers.reduce((acc, it) => acc + it.netFlow1dUsd, 0)
        : (seededRandom(s + 3) - 0.28) * 680_000_000;
    const ethFlow =
      i === 0
        ? ethIssuers.reduce((acc, it) => acc + it.netFlow1dUsd, 0)
        : (seededRandom(s + 9) - 0.31) * 195_000_000;
    dailyFlows.push({
      date: label,
      btcNetFlowUsd: btcFlow,
      ethNetFlowUsd: ethFlow,
    });
  }

  return { btcIssuers, ethIssuers, dailyFlows };
}


