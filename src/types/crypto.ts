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
  | 'watchlist'
  | 'altcoins'
  | 'news'
  | 'bubble-radar'
  | 'whale-sonar'
  | 'pulser-square';

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
  high24hUsd: number;
  low24hUsd: number;
  circulatingSupply: number;
  maxSupply: number | null;
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  change1y: number;
  dominancePct: number;
  sparkline7d: number[];
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
  author: string;
  handle: string;
  roleLabel: string;
  avatarInitials: string;
  avatarColor: string;
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

