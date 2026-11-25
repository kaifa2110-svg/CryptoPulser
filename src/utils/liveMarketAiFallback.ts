import {
  AiCopilotMode,
  Coin,
  CurrencyCode,
  FxRates,
  GlobalMarketStats,
  NewsArticle,
} from '../types/crypto';
import { buildBubbleRadarGraph, buildFilteredWhaleSonar } from '../data/cryptoEngine';
import { formatCompactCurrency, formatPercent, formatPrice } from './formatters';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface FallbackParams {
  prompt: string;
  copilotMode: AiCopilotMode;
  coins: Coin[];
  watchlistIds: string[];
  globalStats: GlobalMarketStats;
  currency: CurrencyCode;
  fxRates: FxRates;
  newsArticles: NewsArticle[];
  history?: ConversationTurn[];
}

interface EmergingTokenProfile {
  symbol: string;
  name: string;
  ecosystem: string;
  category: string;
  summary: string;
  architecture: string;
  tokenomics: string;
  keyCatalysts: string[];
  risks: string[];
  aliases: string[];
}

const EMERGING_TOKEN_KB: EmergingTokenProfile[] = [
  {
    symbol: 'ARX',
    name: 'Arcium',
    ecosystem: 'Solana & Cross-Chain Confidential Computing',
    category: 'Confidential Compute / MPC Network',
    summary:
      'Arcium (ARX) is a decentralized confidential computing network enabling trustless encrypted computation via Multi-Party Computation (MPC). Built originally by the core team behind Elusiv, it lets DeFi, AI, and institutional applications compute over encrypted state without exposing sensitive inputs on-chain.',
    architecture:
      'Uses MXEs (Multiparty eXecution Environments) orchestrated on Solana so nodes jointly execute encrypted smart-contract logic (private orderbooks, sealed-bid auctions, confidential AI inference, private RWA settlement) while preserving verifiability.',
    tokenomics:
      'ARX coordinates node staking & slashing security, MXE computation fee settlement, delegated staking rewards, and governance over protocol parameters and cluster requirements.',
    keyCatalysts: [
      'Private DeFi primitives (dark pools, MEV-resistant swaps, confidential lending)',
      'Encrypted AI training/inference pipelines across Solana dApps',
      'Mainnet MXE cluster scaling and institutional privacy adoption',
    ],
    risks: [
      'MPC cryptographic coordination overhead vs. plaintext execution',
      'Early liquidity discovery and token unlock schedule dynamics',
      'Competition from ZK-coprocessors and FHE (Fully Homomorphic Encryption) stacks',
    ],
    aliases: ['arcium', 'arx', 'elusiv'],
  },
  {
    symbol: 'MON',
    name: 'Monad',
    ecosystem: 'Monad L1 (High-Throughput Parallel EVM)',
    category: 'Layer 1 / Parallel EVM',
    summary:
      'Monad is a high-performance, EVM-compatible Layer 1 blockchain targeting ~10,000 TPS with 1-second block times and single-slot finality through optimistic parallel execution and a custom state database (MonadDB).',
    architecture:
      'Combines pipelined MonadBFT consensus, deferred execution, and asynchronous I/O via MonadDB so existing Solidity contracts and MetaMask tooling run unchanged at dramatically lower gas cost.',
    tokenomics:
      'MON serves as the native gas asset, validator staking & delegation token, and protocol governance unit.',
    keyCatalysts: [
      '100% EVM bytecode compatibility attracting Ethereum DeFi deployments',
      'High-frequency on-chain CLOB DEXs and consumer apps needing sub-second finality',
    ],
    risks: [
      'Intense L1/L2 performance competition (Solana, Sui, Base, MegaETH)',
      'Hardware and validator decentralization trade-offs at peak throughput',
    ],
    aliases: ['monad', 'mon'],
  },
  {
    symbol: 'HYPE',
    name: 'Hyperliquid',
    ecosystem: 'Hyperliquid L1 (On-Chain Perp & Spot Orderbook)',
    category: 'DeFi / Perp DEX L1',
    summary:
      'Hyperliquid is a purpose-built Layer 1 blockchain running a fully on-chain central limit order book (CLOB) for perpetual futures and spot trading, plus HyperEVM for composable DeFi.',
    architecture:
      'HyperBFT consensus achieves sub-second order placement and cancellation directly on-chain without off-chain matching sequencers, paired with native vault liquidity (HLP).',
    tokenomics:
      'HYPE powers HyperEVM gas, validator staking, and benefits from Assistance Fund fee buybacks routed from perpetual & spot exchange volume.',
    keyCatalysts: [
      'Market share capture from centralized perp exchanges via CEX-grade latency',
      'HyperEVM ecosystem growth and HIP-1 / HIP-2 token launches',
    ],
    risks: [
      'Validator set concentration during early decentralization phases',
      'Derivatives volume cyclicality in low-volatility regimes',
    ],
    aliases: ['hyperliquid', 'hype'],
  },
  {
    symbol: 'BERA',
    name: 'Berachain',
    ecosystem: 'Berachain L1 (Proof of Liquidity EVM)',
    category: 'Layer 1 / Proof of Liquidity',
    summary:
      'Berachain is an EVM-identical Layer 1 built on BeaconKit that aligns validator security directly with ecosystem DeFi liquidity via Proof of Liquidity (PoL).',
    architecture:
      'Separates gas (BERA), governance/rewards (BGT — soulbound earned by LPs), and native stablecoin (HONEY) so block rewards incentivize productive liquidity pools rather than idle staking.',
    tokenomics:
      'Tri-token model (BERA gas/staking, BGT emission gauge voting & boost, HONEY overcollateralized stablecoin) creates flywheel bribes and DEX depth.',
    keyCatalysts: [
      'BGT gauge flywheel driving high DeFi TVL and LP yield incentives',
      'Native BEX, Bend, and Berps ecosystem composability',
    ],
    risks: [
      'Tri-token complexity and emission sustainability across market cycles',
      'Heavy early incentive farming vs. organic fee capture',
    ],
    aliases: ['berachain', 'bera', 'bgt'],
  },
  {
    symbol: 'IP',
    name: 'Story Protocol',
    ecosystem: 'Story L1 (Programmable IP Blockchain)',
    category: 'IP & AI Attribution L1',
    summary:
      'Story is a Layer 1 blockchain designed to tokenize intellectual property, licensing terms, and royalty flows on-chain so creators and AI models can license and settle IP programmatically.',
    architecture:
      'Implements a Proof-of-Creativity protocol with native IP graphs, automated royalty routing, and EVM execution tailored for media, datasets, and AI agent licensing.',
    tokenomics:
      'IP acts as the native gas token, validator staking asset, and governance coordinator across Story Network.',
    keyCatalysts: [
      'AI training dataset licensing & creator royalty verification',
      'Cross-app remixable IP assets with programmable revenue splits',
    ],
    risks: [
      'Off-chain legal enforcement of on-chain IP licenses across jurisdictions',
      'Enterprise adoption speed from traditional media rights holders',
    ],
    aliases: ['story protocol', 'story'],
  },
  {
    symbol: 'MOVE',
    name: 'Movement',
    ecosystem: 'Movement Network (MoveVM Ethereum L2)',
    category: 'Layer 2 / MoveVM',
    summary:
      'Movement brings the resource-oriented Move smart contract language (originally created for Diem/Aptos/Sui) to Ethereum settlement via modular MoveVM rollups.',
    architecture:
      'Pairs Move language safety (preventing common reentrancy/asset duplication bugs) with Ethereum liquidity and fast finality settlement.',
    tokenomics:
      'MOVE supports staking security, sequencer decentralization, gas fee abstraction, and cross-rollup liquidity coordination.',
    keyCatalysts: [
      'Move developer ecosystem tapping directly into Ethereum TVL',
      'Parallelized execution throughput with modular DA support',
    ],
    risks: [
      'Competition with established EVM L2s (Arbitrum, Base, Optimism)',
      'Ecosystem liquidity fragmentation across multiple L2 bridges',
    ],
    aliases: ['movement', 'movevm'],
  },
];

const COIN_ALIASES: Record<string, string[]> = {
  BTC: ['bitcoin', 'xbt'],
  ETH: ['ethereum', 'ether'],
  SOL: ['solana'],
  BNB: ['binance', 'binance coin'],
  XRP: ['ripple'],
  DOGE: ['dogecoin', 'doge'],
  ADA: ['cardano'],
  AVAX: ['avalanche'],
  DOT: ['polkadot'],
  LINK: ['chainlink'],
  SHIB: ['shiba', 'shiba inu'],
  POL: ['polygon', 'matic'],
  TRX: ['tron'],
  LTC: ['litecoin'],
  UNI: ['uniswap'],
  ATOM: ['cosmos'],
  TON: ['toncoin'],
  SUI: ['sui'],
  PEPE: ['pepe'],
  APT: ['aptos'],
  ARB: ['arbitrum'],
  OP: ['optimism'],
  NEAR: ['near protocol'],
};

const STOPWORD_SYMBOLS = new Set([
  'ALL',
  'AND',
  'ARE',
  'BEST',
  'BUY',
  'CAN',
  'FOR',
  'GET',
  'GOOD',
  'HOW',
  'IP',
  'LOW',
  'MOVE',
  'NEW',
  'NOW',
  'ONE',
  'OUT',
  'PRO',
  'RED',
  'RUN',
  'SEE',
  'THE',
  'TOP',
  'USD',
  'WIN',
  'YOU',
]);

export function extractMentionedCoinsFromPrompt(prompt: string, coins: Coin[], limit = 6): Coin[] {
  const lower = prompt.toLowerCase();
  const rawTokens = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const tokenPositions = new Map<string, number>();
  rawTokens.forEach((tok, idx) => {
    if (!tokenPositions.has(tok)) tokenPositions.set(tok, idx);
  });

  const scored: Array<{ coin: Coin; pos: number; score: number }> = [];
  const seenIds = new Set<string>();

  for (const c of coins) {
    if (seenIds.has(c.id)) continue;
    const symLower = c.symbol.toLowerCase();
    const symUpper = c.symbol.toUpperCase();
    const nameLower = c.name.toLowerCase();

    let matchPos = -1;
    let matchScore = 0;

    // 1. Exact token match against symbol (skip common English stopwords unless uppercase in original prompt)
    const symPos = tokenPositions.get(symLower);
    const appearedUppercase = new RegExp(`\\b${c.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(prompt);
    if (symPos !== undefined && (!STOPWORD_SYMBOLS.has(symUpper) || appearedUppercase)) {
      matchPos = symPos;
      matchScore = 100 - Math.min(50, c.rank * 0.05);
    }

    // 2. Full name substring match
    if (matchPos === -1 && ((nameLower.length > 3 && lower.includes(nameLower)) || tokenPositions.has(nameLower))) {
      const idx = lower.indexOf(nameLower);
      matchPos = idx >= 0 ? Math.floor(idx / 4) : 50;
      matchScore = 90 - Math.min(50, c.rank * 0.05);
    }

    // 3. Common alias match
    if (matchPos === -1 && COIN_ALIASES[symUpper]) {
      for (const alias of COIN_ALIASES[symUpper]) {
        const idx = lower.indexOf(alias);
        if (idx >= 0) {
          matchPos = Math.floor(idx / 4);
          matchScore = 85 - Math.min(50, c.rank * 0.05);
          break;
        }
      }
    }

    if (matchPos !== -1) {
      seenIds.add(c.id);
      scored.push({ coin: c, pos: matchPos, score: matchScore });
    }
  }

  scored.sort((a, b) => (a.pos !== b.pos ? a.pos - b.pos : b.score - a.score));
  return scored.slice(0, limit).map((s) => s.coin);
}

function findEmergingTokenInText(text: string): EmergingTokenProfile | null {
  const lower = text.toLowerCase();
  const tokens = new Set(lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
  for (const profile of EMERGING_TOKEN_KB) {
    const symUpper = profile.symbol.toUpperCase();
    const symMatches =
      tokens.has(profile.symbol.toLowerCase()) &&
      (!STOPWORD_SYMBOLS.has(symUpper) || new RegExp(`\\b${symUpper}\\b`).test(text));
    const aliasMatches = profile.aliases.some((alias) =>
      alias.includes(' ') ? lower.includes(alias) : tokens.has(alias) || lower.includes(alias)
    );
    if (symMatches || aliasMatches) {
      return profile;
    }
  }
  return null;
}

function formatDualPrice(priceUsd: number, currency: CurrencyCode, fxRates: FxRates): string {
  const local = formatPrice(priceUsd, currency, fxRates);
  if (currency === 'USD') return local;
  const usd = formatPrice(priceUsd, 'USD', fxRates);
  return `${local} (${usd})`;
}

function priceFloor(p: number): number {
  return Math.max(0.000001, p * 0.002);
}

function computeRangePosition(coin: Coin): {
  low: number;
  high: number;
  posPct: number;
  zoneLabel: string;
} {
  const low = Math.min(coin.low24hUsd, coin.priceUsd * 0.992);
  const high = Math.max(coin.high24hUsd, coin.priceUsd * 1.008);
  const span = Math.max(priceFloor(coin.priceUsd), high - low);
  const posPct = Math.min(100, Math.max(0, Math.round(((coin.priceUsd - low) / span) * 100)));
  const zoneLabel =
    posPct >= 75
      ? 'near 24h resistance'
      : posPct <= 25
      ? 'near 24h support'
      : 'mid-range consolidation';
  return { low, high, posPct, zoneLabel };
}

function buildCoinSetupBullets(coin: Coin, currency: CurrencyCode, fxRates: FxRates): string {
  const { low, high, posPct, zoneLabel } = computeRangePosition(coin);
  const span = Math.max(priceFloor(coin.priceUsd), high - low);
  const entryLow = low + span * 0.18;
  const entryHigh = Math.min(coin.priceUsd, low + span * 0.45);
  const stopLoss = low * 0.982;
  const target1 = high;
  const target2 = high + span * 0.65;
  const risk = Math.max(priceFloor(coin.priceUsd), coin.priceUsd - stopLoss);
  const reward = Math.max(risk, target2 - coin.priceUsd);
  const rr = Math.min(4.2, Math.max(1.4, reward / risk));
  const volRatio = coin.marketCapUsd > 0 ? (coin.volume24hUsd / coin.marketCapUsd) * 100 : 0;

  return [
    `• ${coin.name} (${coin.symbol}, #${coin.rank}) — Live: ${formatDualPrice(coin.priceUsd, currency, fxRates)} (${formatPercent(coin.change24h)} 24h · ${formatPercent(coin.change7d)} 7d)`,
    `  - 24h Range Position: ${posPct}% (${zoneLabel}) · Support ${formatPrice(low, currency, fxRates)} · Resistance ${formatPrice(high, currency, fxRates)}`,
    `  - Entry Band: ${formatPrice(entryLow, currency, fxRates)} – ${formatPrice(entryHigh, currency, fxRates)} | Stop-Loss: ${formatPrice(stopLoss, currency, fxRates)}`,
    `  - Targets: TP1 ${formatPrice(target1, currency, fxRates)} · TP2 ${formatPrice(target2, currency, fxRates)} (Est. R:R 1:${rr.toFixed(1)}) · Vol/MCap ${volRatio.toFixed(1)}%`,
  ].join('\n');
}

function tryParseAmountConversion(
  prompt: string,
  mentioned: Coin[],
  currency: CurrencyCode,
  fxRates: FxRates
): string | null {
  if (mentioned.length === 0) return null;
  const coin = mentioned[0];
  const lower = prompt.toLowerCase();

  const coinRegex = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*${coin.symbol.toLowerCase()}\\b`, 'i');
  const coinMatch = lower.match(coinRegex);
  if (coinMatch) {
    const qty = Number(coinMatch[1].replace(/,/g, ''));
    if (Number.isFinite(qty) && qty > 0) {
      const valueUsd = qty * coin.priceUsd;
      return `• Position Valuation: ${qty.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${coin.symbol} = ${formatDualPrice(valueUsd, currency, fxRates)}`;
    }
  }

  const fiatMatch =
    lower.match(/\$\s*(\d[\d,]*(?:\.\d+)?)/) ||
    lower.match(/(\d[\d,]*(?:\.\d+)?)\s*(usd|pkr|eur|aed|inr|gbp)\b/i);
  if (fiatMatch) {
    const rawNum = Number((fiatMatch[1] || '').replace(/,/g, ''));
    const curToken = (fiatMatch[2]?.toUpperCase() as CurrencyCode | undefined) || 'USD';
    const rate = fxRates[curToken] || fxRates[currency] || 1;
    if (Number.isFinite(rawNum) && rawNum > 0 && coin.priceUsd > 0) {
      const usdAmount = rawNum / rate;
      const tokens = usdAmount / coin.priceUsd;
      return `• Live Conversion (${rawNum.toLocaleString('en-US')} ${curToken}): ≈ ${tokens.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${coin.symbol} at ${formatPrice(coin.priceUsd, currency, fxRates)}`;
    }
  }

  return null;
}

export function computePortfolioHealth(watchedCoins: Coin[]): {
  score: number;
  grade: string;
  volatilityLabel: string;
  corePct: number;
  altPct: number;
  stablePct: number;
} {
  if (watchedCoins.length === 0) {
    return {
      score: 68,
      grade: 'Baseline Benchmark',
      volatilityLabel: 'Moderate',
      corePct: 55,
      altPct: 30,
      stablePct: 15,
    };
  }

  const countScore = Math.min(30, watchedCoins.length * 6);
  const hasBtcOrEth = watchedCoins.some((c) => c.symbol === 'BTC' || c.symbol === 'ETH');
  const hasStable = watchedCoins.some((c) => c.category === 'Stablecoin');
  const avgAbsMove =
    watchedCoins.reduce((acc, c) => acc + Math.abs(c.change24h), 0) / watchedCoins.length;

  const anchorBonus = hasBtcOrEth ? 28 : 14;
  const hedgeBonus = hasStable ? 18 : 8;
  const volBonus = avgAbsMove < 4 ? 22 : avgAbsMove < 8 ? 16 : 10;
  const score = Math.min(96, Math.max(42, Math.round(countScore + anchorBonus + hedgeBonus + volBonus)));

  const grade = score >= 80 ? 'Strong' : score >= 65 ? 'Balanced' : 'Concentrated';
  const volatilityLabel = avgAbsMove < 4 ? 'Low-Moderate' : avgAbsMove < 8 ? 'Elevated' : 'High';

  const corePct = hasBtcOrEth ? 55 : 45;
  const stablePct = hasStable ? 20 : 15;
  const altPct = 100 - corePct - stablePct;

  return { score, grade, volatilityLabel, corePct, altPct, stablePct };
}

function appendFollowUpSuggestions(suggestions: string[]): string {
  if (suggestions.length === 0) return '';
  return `\n\nNext, you can ask:\n${suggestions.map((s) => `• "${s}"`).join('\n')}`;
}

export function buildLiveMarketEngineReply({
  prompt,
  copilotMode,
  coins,
  watchlistIds,
  globalStats,
  currency,
  fxRates,
  newsArticles,
  history = [],
}: FallbackParams): string {
  const btc = coins.find((c) => c.symbol === 'BTC') || coins[0];
  const eth = coins.find((c) => c.symbol === 'ETH') || coins[1];
  const sol = coins.find((c) => c.symbol === 'SOL') || coins[2];

  const nonStables = coins.slice(0, 100).filter((c) => c.category !== 'Stablecoin');
  const topGainers = [...nonStables].sort((a, b) => b.change24h - a.change24h).slice(0, 4);
  const topLosers = [...nonStables].sort((a, b) => a.change24h - b.change24h).slice(0, 4);
  const watchedCoins = coins.filter((c) => watchlistIds.includes(c.id));

  // Extract coins from current prompt; if none, resolve pronoun follow-up from prior history turns
  const directMentioned = extractMentionedCoinsFromPrompt(prompt, coins);
  const directEmerging = findEmergingTokenInText(prompt);

  let historyMentioned: Coin[] = [];
  let historyEmerging: EmergingTokenProfile | null = null;
  const isFollowUpCue =
    /\b(it|its|that|this|they|them|tokenomics|risks|catalysts|architecture|why|simpler|more|explain|compare|entry|target|stop)\b/i.test(
      prompt
    );

  if (directMentioned.length === 0 && !directEmerging && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const turnText = history[i]?.content || '';
      const foundCoins = extractMentionedCoinsFromPrompt(turnText, coins, 3);
      if (foundCoins.length > 0 && isFollowUpCue) {
        historyMentioned = foundCoins;
        break;
      }
      const foundEmerging = findEmergingTokenInText(turnText);
      if (foundEmerging && isFollowUpCue) {
        historyEmerging = foundEmerging;
        break;
      }
    }
  }

  const mentioned = directMentioned.length > 0 ? directMentioned : historyMentioned;
  const emerging = directEmerging || historyEmerging;
  const q = prompt.toLowerCase();

  // Detect intents from exact typed prompt
  const hasCompareIntent =
    /\b(vs|versus|compare|comparison|between|better than|outperform)\b/i.test(q) &&
    (mentioned.length >= 2 || (mentioned.length === 1 && /\b(market|btc|eth|sol)\b/i.test(q)));
  const hasBuySellIntent =
    copilotMode === 'trade_signal' ||
    /\b(buy|sell|long|short|entry|exit|target|tp|stop|support|resistance|setup|signal|trade|dip|overbought|oversold|bullish|bearish|breakout|accumulate|worth buying)\b/i.test(
      q
    );
  const hasWhaleIntent =
    copilotMode === 'whale_anomaly' ||
    /\b(whale|whales|inflow|outflow|wallet|wallets|centralization|concentration|bubble|holder|holders|smart money|dump|exchange flow)\b/i.test(
      q
    );
  const hasRiskIntent =
    copilotMode === 'portfolio_advisor' ||
    /\b(watchlist|portfolio|risk|rebalance|health|allocation|diversify|diversification|safe|holdings)\b/i.test(
      q
    );
  const hasNewsIntent =
    copilotMode === 'sentiment_digest' ||
    /\b(news|headline|headlines|sentiment|fear|greed|macro|etf|sec|fed|regulation|mood|altcoin season|dominance)\b/i.test(
      q
    );
  const hasMoversIntent =
    /\b(gainer|gainers|winner|winners|pumping|surging|top mover|movers|loser|losers|dipping|worst|red today|down most)\b/i.test(
      q
    );

  // 0. Emerging / Non-Top-50 Token Research (e.g., Arcium ARX, Monad, Hyperliquid, Berachain, Story, Movement)
  if (emerging && directMentioned.length === 0) {
    const wantsTokenomics = /\b(token|tokenomics|utility|supply|staking)\b/i.test(q);
    const wantsRisk = /\b(risk|risks|downside|concern|safe|red flag)\b/i.test(q);
    const wantsTech = /\b(how|work|works|tech|architecture|mpc|consensus|design)\b/i.test(q);

    const paragraphs: string[] = [
      `${emerging.name} (${emerging.symbol}) — ${emerging.category} | ${emerging.ecosystem}`,
      emerging.summary,
    ];

    if (wantsTokenomics) {
      paragraphs.push(`Tokenomics & Utility:\n• ${emerging.tokenomics}`);
    } else if (wantsTech) {
      paragraphs.push(`Architecture:\n• ${emerging.architecture}`);
    } else if (wantsRisk) {
      paragraphs.push(
        `Key Risks to Watch:\n${emerging.risks.map((r) => `• ${r}`).join('\n')}`
      );
    } else {
      paragraphs.push(
        `How It Works:\n• ${emerging.architecture}\n\nTokenomics & Utility:\n• ${emerging.tokenomics}\n\nCatalysts:\n${emerging.keyCatalysts.map((c) => `• ${c}`).join('\n')}\n\nKey Risks:\n${emerging.risks.map((r) => `• ${r}`).join('\n')}`
      );
    }

    paragraphs.push(
      `Market Context: Live spot feed tracks Top 1000 ranked assets (BTC currently ${formatDualPrice(btc?.priceUsd ?? 0, currency, fxRates)}, ${formatPercent(btc?.change24h ?? 0)} 24h), so ${emerging.symbol} is analyzed from protocol fundamentals rather than spot orderbook telemetry.`
    );

    return (
      paragraphs.join('\n\n') +
      appendFollowUpSuggestions([
        `What are the biggest risks for ${emerging.name} (${emerging.symbol})?`,
        `Explain ${emerging.symbol} tokenomics in simpler terms`,
        `Compare ${emerging.symbol} thesis against SOL (${formatPrice(sol?.priceUsd ?? 0, currency, fxRates)})`,
      ])
    );
  }

  // 1. Compare 2+ coins dynamically
  if (hasCompareIntent) {
    const comparePool =
      mentioned.length >= 2
        ? mentioned.slice(0, 3)
        : [mentioned[0], mentioned[0]?.symbol === 'BTC' ? eth : btc].filter((c): c is Coin => Boolean(c));
    const [a, b] = comparePool;
    const ratioNote =
      a && b && b.priceUsd > 0
        ? `Relative Valuation: 1 ${a.symbol} = ${(a.priceUsd / b.priceUsd).toFixed(4)} ${b.symbol} · 24h Performance Spread: ${(a.change24h - b.change24h) >= 0 ? '+' : ''}${(a.change24h - b.change24h).toFixed(2)}% in favor of ${a.change24h >= b.change24h ? a.symbol : b.symbol}.`
        : '';

    return (
      [
        `Here is a live side-by-side comparison of ${comparePool.map((c) => c.symbol).join(' vs ')} in ${currency}:`,
        ...comparePool.map((c) => {
          const { low, high, posPct } = computeRangePosition(c);
          return `• ${c.name} (${c.symbol}, #${c.rank}): ${formatDualPrice(c.priceUsd, currency, fxRates)} | 24h ${formatPercent(c.change24h)} | 7d ${formatPercent(c.change7d)}\n  - MCap: ${formatCompactCurrency(c.marketCapUsd, currency, fxRates)} · 24h Vol: ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)} · Range Position: ${posPct}% (${formatPrice(low, currency, fxRates)}–${formatPrice(high, currency, fxRates)})`;
        }),
        ratioNote,
      ]
        .filter(Boolean)
        .join('\n\n') +
      appendFollowUpSuggestions(
        a && b
          ? [
              `Show Trade Signal entry and targets for ${a.symbol}`,
              `Check whale inflows and concentration for ${b.symbol}`,
            ]
          : []
      )
    );
  }

  // 2. Whale & Bubble Anomaly
  if (hasWhaleIntent) {
    const focusCoin = mentioned[0] || btc;
    const sonar =
      coins.length > 0
        ? buildFilteredWhaleSonar(coins, mentioned.length > 0 ? focusCoin.symbol : '', 14)
        : null;
    const bubble = focusCoin ? buildBubbleRadarGraph(focusCoin) : null;
    const topSignals = (sonar?.signals ?? []).slice(0, 4);

    return (
      [
        `${mentioned.length > 0 ? `${focusCoin.name} (${focusCoin.symbol}) ` : ''}Whale Flow & Concentration Readout (${currency})`,
        focusCoin
          ? `• Spot Context: ${focusCoin.symbol} is trading at ${formatDualPrice(focusCoin.priceUsd, currency, fxRates)} (${formatPercent(focusCoin.change24h)} 24h) with ${formatCompactCurrency(focusCoin.volume24hUsd, currency, fxRates)} in 24h volume.`
          : '',
        sonar
          ? `• Net Whale Bias: ${sonar.summary.netBiasLabel} across ${formatCompactCurrency(sonar.summary.totalVolumeUsd, currency, fxRates)} traced volume (Exchange Inflow ${formatCompactCurrency(sonar.summary.inflowUsd, currency, fxRates)} vs. Cold Storage Outflow ${formatCompactCurrency(sonar.summary.outflowUsd, currency, fxRates)}).`
          : '',
        bubble
          ? `• Holder Concentration: ${bubble.coinSymbol} Centralization Score is ${bubble.centralizationScore}/100 · Top 10 Holders control ${bubble.top10HolderPct}% · Exchange Custody ${bubble.exchangeCustodyPct}% (${bubble.smartMoneyFlowLabel}).`
          : '',
        topSignals.length > 0
          ? `• Notable Transfers:\n${topSignals
              .map(
                (s) =>
                  `  - ${s.symbol} ${s.signalType}: ${formatCompactCurrency(s.amountUsd, currency, fxRates)} (${s.walletTag})`
              )
              .join('\n')}`
          : `• No outsized single-wallet anomalies flagged for ${focusCoin?.symbol || 'tracked assets'} right now.`,
      ]
        .filter(Boolean)
        .join('\n\n') +
      appendFollowUpSuggestions([
        `Give me entry, support, and stop-loss levels for ${focusCoin?.symbol || 'BTC'}`,
        `Compare ${focusCoin?.symbol || 'BTC'} against ETH`,
      ])
    );
  }

  // 3. Trade Signal / Buy-Sell / Support-Resistance
  if (hasBuySellIntent) {
    const targets =
      mentioned.length > 0
        ? mentioned.slice(0, 3)
        : [btc, eth, sol].filter((c): c is Coin => Boolean(c));
    const conversionLine = tryParseAmountConversion(prompt, targets, currency, fxRates);

    return (
      [
        `Here are the live technical levels and Trade Signal setups for ${targets.map((c) => c.symbol).join(' / ')} (${currency}):`,
        ...(conversionLine ? [conversionLine] : []),
        ...targets.map((c) => buildCoinSetupBullets(c, currency, fxRates)),
        `Macro Backdrop: BTC Dominance sits at ${globalStats.btcDominance.toFixed(1)}% with Fear & Greed at ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel}). Note: Levels reflect live 24h range telemetry for analysis and are not financial advice.`,
      ].join('\n\n') +
      appendFollowUpSuggestions([
        `Check whale flow bias for ${targets[0]?.symbol || 'BTC'}`,
        `How does my watchlist risk look right now?`,
      ])
    );
  }

  // 4. Portfolio Risk & Watchlist Advisor
  if (hasRiskIntent) {
    const targetPool =
      mentioned.length > 0 ? mentioned : watchedCoins.length > 0 ? watchedCoins : coins.slice(0, 4);
    const health = computePortfolioHealth(targetPool);

    return (
      [
        `Portfolio Risk & Allocation Review (${currency})`,
        `Your selected basket scores ${health.score}/100 (${health.grade}) with a ${health.volatilityLabel} short-term volatility profile.`,
        `Assets Reviewed (${mentioned.length > 0 ? 'Query Selection' : watchedCoins.length > 0 ? `${watchedCoins.length} Watchlist Coins` : 'Top 4 Benchmark'}):\n${targetPool
          .slice(0, 5)
          .map(
            (c) =>
              `• ${c.name} (${c.symbol}): ${formatDualPrice(c.priceUsd, currency, fxRates)} · 24h ${formatPercent(c.change24h)} · 7d ${formatPercent(c.change7d)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)}`
          )
          .join('\n')}`,
        `Suggested Analytical Split: ${health.corePct}% Core L1 (BTC/ETH) · ${health.altPct}% High-Beta Alts · ${health.stablePct}% Stablecoin Buffer (with BTC Dom ${globalStats.btcDominance.toFixed(1)}% & Altcoin Season ${globalStats.altcoinSeasonIndex}/100).`,
      ].join('\n\n') +
      appendFollowUpSuggestions([
        `Show Trade Signal levels for ${targetPool[0]?.symbol || 'BTC'}`,
        `Summarize today's top market movers`,
      ])
    );
  }

  // 5. News, Sentiment, Dominance, Altcoin Season
  if (hasNewsIntent) {
    const topicTerms = mentioned.flatMap((c) => [c.symbol.toLowerCase(), c.name.toLowerCase()]);
    const matchedNews =
      topicTerms.length > 0
        ? newsArticles.filter((n) =>
            topicTerms.some((t) => n.title.toLowerCase().includes(t) || n.summary.toLowerCase().includes(t))
          )
        : [];
    const headlines = (matchedNews.length > 0 ? matchedNews : newsArticles).slice(0, 4);

    return (
      [
        `${mentioned.length > 0 ? `${mentioned[0].symbol} & ` : ''}Market Sentiment & News Brief (${currency})`,
        ...(mentioned.length > 0
          ? mentioned.slice(0, 2).map(
              (c) =>
                `• ${c.name} (${c.symbol}) Spot: ${formatDualPrice(c.priceUsd, currency, fxRates)} (${formatPercent(c.change24h)} 24h) · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)}`
            )
          : []),
        `• Global Cap & Volume: ${formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates)} (${formatPercent(globalStats.marketCapChange24h)} 24h) · 24h Vol ${formatCompactCurrency(globalStats.totalVolume24hUsd, currency, fxRates)}`,
        `• Cycle Gauges: Fear & Greed ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel}) · Altcoin Season Index ${globalStats.altcoinSeasonIndex}/100 · BTC ${globalStats.btcDominance.toFixed(1)}% / ETH ${globalStats.ethDominance.toFixed(1)}%`,
        ...(headlines.length > 0
          ? [
              `• ${matchedNews.length > 0 ? 'Related Headlines' : 'Top Headlines'}:\n${headlines
                .map((h) => `  - [${h.category}] ${h.title} (${h.source})`)
                .join('\n')}`,
            ]
          : []),
      ].join('\n\n') +
      appendFollowUpSuggestions([
        `What are the top gainers and losers today?`,
        `Check whale activity on BTC and ETH`,
      ])
    );
  }

  // 6. Specific Coin Live Query
  if (mentioned.length > 0) {
    const conversionLine = tryParseAmountConversion(prompt, mentioned, currency, fxRates);
    return (
      [
        `Here is the live breakdown for ${mentioned.map((c) => `${c.name} (${c.symbol})`).join(', ')} in ${currency}:`,
        ...(conversionLine ? [conversionLine] : []),
        ...mentioned.slice(0, 4).map((c) => {
          const { low, high, posPct, zoneLabel } = computeRangePosition(c);
          const volRatio = c.marketCapUsd > 0 ? (c.volume24hUsd / c.marketCapUsd) * 100 : 0;
          const fundingNote =
            Number.isFinite(c.fundingRatePct) && c.fundingRatePct !== 0
              ? ` · Funding ${c.fundingRatePct >= 0 ? '+' : ''}${c.fundingRatePct.toFixed(4)}%`
              : '';
          return [
            `• ${c.name} (${c.symbol}, Rank #${c.rank} · ${c.category}): ${formatDualPrice(c.priceUsd, currency, fxRates)}`,
            `  - Momentum: 1h ${formatPercent(c.change1h)} · 24h ${formatPercent(c.change24h)} · 7d ${formatPercent(c.change7d)}`,
            `  - Liquidity: 24h Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)} (${volRatio.toFixed(1)}% of MCap ${formatCompactCurrency(c.marketCapUsd, currency, fxRates)})${fundingNote}`,
            `  - 24h Range: ${formatPrice(low, currency, fxRates)} – ${formatPrice(high, currency, fxRates)} (${posPct}% · ${zoneLabel})`,
          ].join('\n');
        }),
        `Macro Pulse: BTC Dominance ${globalStats.btcDominance.toFixed(1)}% · Fear & Greed ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel}).`,
      ].join('\n\n') +
      appendFollowUpSuggestions([
        `Give me entry, targets, and stop-loss for ${mentioned[0].symbol}`,
        `Compare ${mentioned[0].symbol} vs ${mentioned[0].symbol === 'BTC' ? 'ETH' : 'BTC'}`,
      ])
    );
  }

  // 7. Top Movers / Gainers / Losers query
  if (hasMoversIntent) {
    const wantsLosersOnly = /\b(loser|losers|dip|dipping|worst|red|down)\b/i.test(q) && !/\b(gainer|winner|best)\b/i.test(q);
    const wantsGainersOnly = /\b(gainer|gainers|winner|winners|pumping|surging|best)\b/i.test(q) && !/\b(loser|losers|worst|red|down)\b/i.test(q);

    return (
      [
        `Live 24h Market Movers (${currency})`,
        ...(!wantsLosersOnly
          ? [
              `Top 24h Gainers:\n${topGainers
                .map(
                  (c) =>
                    `• ${c.name} (${c.symbol}): ${formatDualPrice(c.priceUsd, currency, fxRates)} (${formatPercent(c.change24h)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)})`
                )
                .join('\n')}`,
            ]
          : []),
        ...(!wantsGainersOnly
          ? [
              `Largest 24h Pullbacks:\n${topLosers
                .map(
                  (c) =>
                    `• ${c.name} (${c.symbol}): ${formatDualPrice(c.priceUsd, currency, fxRates)} (${formatPercent(c.change24h)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)})`
                )
                .join('\n')}`,
            ]
          : []),
        `Market Breadth: BTC ${formatPercent(btc?.change24h ?? 0)} · ETH ${formatPercent(eth?.change24h ?? 0)} · Altcoin Season ${globalStats.altcoinSeasonIndex}/100.`,
      ].join('\n\n') +
      appendFollowUpSuggestions([
        `Analyze ${topGainers[0]?.symbol || 'SOL'} setup and resistance`,
        `Are whales accumulating or selling right now?`,
      ])
    );
  }

  // 8. Sector / Category query
  const sectorMap: Array<{ pattern: RegExp; label: string; match: (cat: string) => boolean }> = [
    { pattern: /\b(meme|memes|memecoin|memecoins)\b/i, label: 'Meme Coins', match: (c) => c.toLowerCase().includes('meme') },
    { pattern: /\b(defi|dex|lending|yield)\b/i, label: 'DeFi Tokens', match: (c) => c.toLowerCase().includes('defi') },
    { pattern: /\b(layer 1|l1|smart contract)\b/i, label: 'Layer 1 Networks', match: (c) => c.toLowerCase().includes('layer 1') },
    { pattern: /\b(layer 2|l2|rollup|rollups)\b/i, label: 'Layer 2 Scaling', match: (c) => c.toLowerCase().includes('layer 2') },
    { pattern: /\b(stablecoin|stablecoins|stables)\b/i, label: 'Stablecoins', match: (c) => c.toLowerCase().includes('stable') },
    { pattern: /\b(ai tokens|ai coins|artificial intelligence)\b/i, label: 'AI & Compute', match: (c) => c.toLowerCase().includes('ai') },
  ];
  const matchedSector = sectorMap.find((s) => s.pattern.test(q));
  if (matchedSector) {
    const sectorCoins = coins.filter((c) => matchedSector.match(c.category)).slice(0, 5);
    if (sectorCoins.length > 0) {
      return (
        [
          `${matchedSector.label} Live Pulse (${currency})`,
          sectorCoins
            .map(
              (c) =>
                `• ${c.name} (${c.symbol}, #${c.rank}): ${formatDualPrice(c.priceUsd, currency, fxRates)} · 24h ${formatPercent(c.change24h)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)}`
            )
            .join('\n'),
          `Sector Context: BTC Dominance ${globalStats.btcDominance.toFixed(1)}% · Altcoin Season Index ${globalStats.altcoinSeasonIndex}/100.`,
        ].join('\n\n') +
        appendFollowUpSuggestions([
          `Show Trade Signal levels for ${sectorCoins[0].symbol}`,
          `Compare ${sectorCoins[0].symbol} vs ${sectorCoins[1]?.symbol || 'ETH'}`,
        ])
      );
    }
  }

  // 9. General Conversational Crypto & Market Overview Fallback
  const top50 = coins.slice(0, 50);
  const greenCount = top50.filter((c) => c.change24h >= 0).length;
  const breadthPct = top50.length > 0 ? Math.round((greenCount / top50.length) * 100) : 50;

  return (
    [
      `Here is the live CryptoPulser market snapshot (${currency}):`,
      `• Market Breadth: ${greenCount}/${top50.length} Top 50 assets are green (${breadthPct}%), with Global Market Cap at ${formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates)} (${formatPercent(globalStats.marketCapChange24h)} 24h).`,
      `• Major Benchmarks: BTC ${formatDualPrice(btc?.priceUsd ?? 0, currency, fxRates)} (${formatPercent(btc?.change24h ?? 0)}) · ETH ${formatDualPrice(eth?.priceUsd ?? 0, currency, fxRates)} (${formatPercent(eth?.change24h ?? 0)}) · SOL ${formatDualPrice(sol?.priceUsd ?? 0, currency, fxRates)} (${formatPercent(sol?.change24h ?? 0)}).`,
      `• Sentiment & Flows: Fear & Greed ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel}) · BTC Dominance ${globalStats.btcDominance.toFixed(1)}% · Altcoin Season ${globalStats.altcoinSeasonIndex}/100.`,
      `• Top Movers: Gainers ${topGainers.slice(0, 3).map((c) => `${c.symbol} ${formatPercent(c.change24h)}`).join(' · ')} | Pullbacks ${topLosers.slice(0, 2).map((c) => `${c.symbol} ${formatPercent(c.change24h)}`).join(' · ')}.`,
    ].join('\n\n') +
    appendFollowUpSuggestions([
      'What is Arcium (ARX) and how does it work?',
      'Generate Trade Signal setups for BTC, ETH, and SOL',
      'Compare SOL vs ETH right now',
    ])
  );
}
