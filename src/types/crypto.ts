export type CurrencyCode = 'USD' | 'PKR' | 'EUR' | 'AED' | 'INR' | 'GBP';

export type PlanTier = 'free' | 'pro' | 'pro_max';
export type BillingCycle = 'monthly' | 'annual';
export type AiCopilotMode =
  | 'basic'
  | 'trade_signal'
  | 'whale_anomaly'
  | 'portfolio_advisor'
  | 'sentiment_digest';

export interface CheckoutReceipt {
  id: string;
  plan: 'pro' | 'pro_max';
  billingCycle: BillingCycle;
  isTrial: boolean;
  paymentMethod: 'card' | 'crypto';
  methodDetail: string;
  currency: CurrencyCode;
  amountFormatted: string;
  timestamp: string;
}

export type NavTab =
  | 'top1000'
  | 'trending'
  | 'crypto-bubbles'
  | 'gainers-losers'
  | 'rwa'
  | 'ipo-launchpad'
  | 'watchlist'
  | 'altcoins'
  | 'news'
  | 'bubble-radar'
  | 'whale-sonar'
  | 'pulser-square';

export type MarketSubTab =
  | 'coins'
  | 'derivatives'
  | 'liquidity-map'
  | 'etf-tracker'
  | 'yield'
  | 'technical-indicators'
  | 'dex-scan'
  | 'whale-sonar';

export type BlockchainNetwork =
  | 'All Networks'
  | 'Ethereum'
  | 'BNB Smart Chain (BSC)'
  | 'Solana'
  | 'Arbitrum'
  | 'Base'
  | 'Polygon'
  | 'Avalanche'
  | 'Optimism'
  | 'Tron'
  | 'Sui'
  | 'Aptos'
  | 'TON'
  | 'Cosmos'
  | 'Polkadot'
  | 'Cardano'
  | 'Near'
  | 'Fantom'
  | 'Mantle'
  | 'zkSync'
  | 'Linea'
  | 'Blast'
  | 'Cronos';

export interface CoinContract {
  network: Exclude<BlockchainNetwork, 'All Networks'>;
  address: string;
}

export interface ProMarketFilters {
  category: string;
  marketCapMin: string;
  marketCapMax: string;
  fdvMin: string;
  fdvMax: string;
  change24hMin: string;
  change24hMax: string;
  vol24hMin: string;
  vol24hMax: string;
  vol24hPctMin: string;
  vol24hPctMax: string;
  oiMin: string;
  oiMax: string;
  oi24hPctMin: string;
  oi24hPctMax: string;
  derivVol24hMin: string;
  derivVol24hMax: string;
  fundingRateMin: string;
  fundingRateMax: string;
  longLiq24hMin: string;
  longLiq24hMax: string;
  shortLiq24hMin: string;
  shortLiq24hMax: string;
  totalLiq24hMin: string;
  totalLiq24hMax: string;
}

export interface LiquidityLevel {
  priceUsd: number;
  distancePct: number;
  sizeUsd: number;
  cumulativeUsd: number;
  side: 'bid' | 'ask';
  clusterLabel?: string;
  isWall?: boolean;
}

export interface CoinLiquidityMap {
  coinId: string;
  symbol: string;
  midPriceUsd: number;
  spreadBps: number;
  bidDepth2PctUsd: number;
  askDepth2PctUsd: number;
  biggestBidWall: LiquidityLevel;
  biggestAskWall: LiquidityLevel;
  bids: LiquidityLevel[];
  asks: LiquidityLevel[];
}

export interface SpotEtfIssuer {
  ticker: string;
  name: string;
  issuer: string;
  asset: 'BTC' | 'ETH';
  feePct: number;
  aumUsd: number;
  netFlow1dUsd: number;
  netFlow7dUsd: number;
  volume24hUsd: number;
  holdingsUnits: number;
}

export interface EtfDailyFlowPoint {
  date: string;
  btcNetFlowUsd: number;
  ethNetFlowUsd: number;
}

export type SimulatorTimeframe = '7d' | '30d' | '90d' | '1y' | '3y' | '5y';

export interface FxRates {
  USD: number;
  PKR: number;
  EUR: number;
  AED: number;
  INR: number;
  GBP: number;
}

export interface Coin {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  image?: string;
  category: string;
  priceUsd: number;
  marketCapUsd: number;
  fdvUsd: number;
  volume24hUsd: number;
  vol24hChangePct: number;
  high24hUsd: number;
  low24hUsd: number;
  circulatingSupply: number;
  maxSupply: number | null;
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  change90d?: number;
  change1y: number;
  dominancePct: number;
  sparkline7d: number[];
  networks: Exclude<BlockchainNetwork, 'All Networks'>[];
  contracts: CoinContract[];
  openInterestUsd: number;
  oiChange24hPct: number;
  derivativesVol24hUsd: number;
  fundingRatePct: number;
  longLiq24hUsd: number;
  shortLiq24hUsd: number;
  totalLiq24hUsd: number;
  isLiveApi?: boolean;
}

export interface GlobalMarketStats {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptocurrencies: number;
  altcoinSeasonIndex: number;
  fearGreedValue: number;
  fearGreedLabel: string;
  updatedAt: string;
  source: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'Markets' | 'Bitcoin' | 'Layer 2' | 'DeFi' | 'Regulation';
  imageUrl: string;
  relatedCoins: string[];
}

export type BubbleClusterType = 'Exchanges' | 'Whales' | 'Smart Money' | 'Retail';

export interface BubbleNode {
  id: string;
  address: string;
  label: string;
  cluster: BubbleClusterType;
  supplyPct: number;
  tokenAmount: number;
  valueUsd: number;
  netFlow7dPct: number;
  x: number;
  y: number;
  radius: number;
  txCount30d: number;
  firstSeen: string;
  connections: string[];
}

export interface BubbleEdge {
  from: string;
  to: string;
  volumeUsd: number;
  strength: number;
}

export interface BubbleRadarGraph {
  coinSymbol: string;
  coinName: string;
  centralizationScore: number;
  top10HolderPct: number;
  exchangeCustodyPct: number;
  smartMoneyFlowLabel: string;
  nodes: BubbleNode[];
  edges: BubbleEdge[];
}

export type WhaleSignalType =
  | 'Exchange Inflow'
  | 'Exchange Outflow'
  | 'Smart Money Swap';

export interface WhaleTrailStep {
  step: number;
  fromLabel: string;
  fromAddress: string;
  toLabel: string;
  toAddress: string;
  amountTokens: number;
  amountUsd: number;
  txHash: string;
  timestamp: string;
  feeUsd: number;
}

export interface WhaleSignal {
  id: string;
  timestamp: string;
  coinId: string;
  symbol: string;
  coinName: string;
  signalType: WhaleSignalType;
  walletTag: string;
  walletAddress: string;
  counterpartyTag: string;
  counterpartyAddress: string;
  amountTokens: number;
  amountUsd: number;
  impactScore: number;
  impactNote: string;
  txHash: string;
  blockNumber: number;
  trail: WhaleTrailStep[];
}

export interface HistoryPoint {
  timestamp: number;
  date: string;
  priceUsd: number;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  engine?: 'gemini' | 'live-market-engine';
  modelUsed?: string;
}

export type AlertKind = 'price_above' | 'price_below' | 'whale_transfer';

export interface PriceWhaleAlert {
  id: string;
  kind: AlertKind;
  coinId: string;
  symbol: string;
  coinName: string;
  thresholdUsd: number;
  createdInCurrency: CurrencyCode;
  displayThreshold: number;
  active: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface AlertToast {
  id: string;
  title: string;
  message: string;
  kind: AlertKind;
  timestamp: string;
}

export type SquareSentiment = 'bullish' | 'bearish';
export type SquareFilterTab =
  | 'For You'
  | 'Following'
  | 'Bullish Ideas'
  | 'Whale Alerts'
  | 'News';

export interface SquareComment {
  id: string;
  author: string;
  handle: string;
  content: string;
  timestamp: string;
}

export interface SquarePost {
  id: string;
  authorId?: string;
  author: string;
  handle: string;
  roleLabel: string;
  avatarInitials: string;
  avatarColor: string;
  authorAvatarUrl?: string;
  authorWebsite?: string;
  verified: boolean;
  following: boolean;
  timestamp: string;
  coinTags: string[];
  hashtags: string[];
  sentiment: SquareSentiment;
  category: 'Ideas' | 'Whale Alerts' | 'News';
  content: string;
  attachmentLabel?: string;
  attachmentImage?: string;
  likes: number;
  likedByMe?: boolean;
  reposts: number;
  repostedByMe?: boolean;
  comments: SquareComment[];
}

export type ThemePreference = 'light' | 'dark' | 'system';

export type AppLanguage = 'English' | 'Urdu' | 'Arabic' | 'Spanish' | 'Chinese';

export type LaunchScreenOption = 'Markets' | 'Pulser Square' | 'Simulator' | 'Whale Sonar';

export interface ConsentPreferences {
  essentialCookies: true;
  analyticsTelemetry: boolean;
  marketPersonalization: boolean;
  crashDiagnostics: boolean;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  osBrowser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export type SecurityActivityType =
  | 'Login'
  | 'Sign Up'
  | 'Profile Updated'
  | 'Password Change'
  | '2FA Enabled'
  | '2FA Disabled'
  | 'Biometric Enabled'
  | 'Biometric Disabled'
  | 'Wallet Verified'
  | 'API Key Sealed'
  | 'Device Revoked'
  | 'Consent Updated';

export interface SecurityActivityEntry {
  id: string;
  type: SecurityActivityType;
  detail: string;
  ipAddress: string;
  timestamp: string;
}

export type WalletProviderId =
  | 'metamask'
  | 'trust'
  | 'phantom'
  | 'coinbase'
  | 'ledger'
  | 'demo_judge';

export interface VerifiedWallet {
  id: string;
  providerId: WalletProviderId;
  providerName: string;
  label: string;
  address: string;
  network: 'Ethereum (0x)' | 'Solana';
  signature: string;
  signedMessage: string;
  verifiedAt: string;
  isDemo?: boolean;
}

export interface UserAccountProfile {
  id: string;
  displayName: string;
  username: string;
  email: string;
  bio: string;
  websiteUrl: string;
  avatarUrl: string;
  avatarPresetId: string;
  diamonds: number;
  streakDays: number;
  lastCheckInDate: string | null;
  claimedAirdropIds: string[];
  createdAt: string;
  walletAddress?: string;
  walletNetwork?: 'EVM (0x)' | 'Solana' | 'Bitcoin' | null;
  walletVerified?: boolean;
  biometricEnabled?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  consent?: ConsentPreferences;
  devices?: DeviceSession[];
  activities?: SecurityActivityEntry[];
}

export type SponsoredAdSlot = 'vault' | 'pulser-square' | 'liquidity';

export interface CustomSponsoredAd {
  id: string;
  slot: SponsoredAdSlot;
  sponsorLabel: string;
  headline: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  ctaLabel: string;
  updatedAt: string;
}

export interface MarketPairItem {
  id: string;
  exchangeName: string;
  exchangeId: string;
  exchangeLogo?: string;
  type: 'CEX' | 'DEX';
  pair: string;
  baseSymbol: string;
  targetSymbol: string;
  priceUsd: number;
  volume24hUsd: number;
  volumeSharePct: number;
  trustScore: 'high' | 'good' | 'moderate';
  liquidityUsd?: number;
  tradeUrl: string;
  dexChain?: string;
}

export interface MarketPairResponse {
  ok: boolean;
  pairs: MarketPairItem[];
  totalVolume24hUsd: number;
  totalPairs: number;
  cexCount: number;
  dexCount: number;
  source: 'live-gecko-dex' | 'dexscreener-live' | 'curated-fallback';
  updatedAt: string;
}

