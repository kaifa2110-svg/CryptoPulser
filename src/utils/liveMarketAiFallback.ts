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

interface FallbackParams {
  prompt: string;
  copilotMode: AiCopilotMode;
  coins: Coin[];
  watchlistIds: string[];
  globalStats: GlobalMarketStats;
  currency: CurrencyCode;
  fxRates: FxRates;
  newsArticles: NewsArticle[];
}

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
  'LOW',
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

    // 2. Full name substring match (for names > 3 chars or exact token)
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

  // Sort by appearance order in user's prompt (tie-break by matchScore / rank)
  scored.sort((a, b) => (a.pos !== b.pos ? a.pos - b.pos : b.score - a.score));
  return scored.slice(0, limit).map((s) => s.coin);
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
    `  - Analytical Entry Band: ${formatPrice(entryLow, currency, fxRates)} – ${formatPrice(entryHigh, currency, fxRates)} | Stop/Invalidation: ${formatPrice(stopLoss, currency, fxRates)}`,
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

  // Pattern A: "<amount> <COIN>" e.g. "2.5 ETH" or "100 SOL"
  const coinRegex = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*${coin.symbol.toLowerCase()}\\b`, 'i');
  const coinMatch = lower.match(coinRegex);
  if (coinMatch) {
    const qty = Number(coinMatch[1].replace(/,/g, ''));
    if (Number.isFinite(qty) && qty > 0) {
      const valueUsd = qty * coin.priceUsd;
      return `• Position Valuation: ${qty.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${coin.symbol} = ${formatDualPrice(valueUsd, currency, fxRates)}`;
    }
  }

  // Pattern B: "$500" or "500 USD" or "50000 PKR" etc.
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

export function buildLiveMarketEngineReply({
  prompt,
  copilotMode,
  coins,
  watchlistIds,
  globalStats,
  currency,
  fxRates,
  newsArticles,
}: FallbackParams): string {
  const btc = coins.find((c) => c.symbol === 'BTC') || coins[0];
  const eth = coins.find((c) => c.symbol === 'ETH') || coins[1];
  const sol = coins.find((c) => c.symbol === 'SOL') || coins[2];

  const nonStables = coins.slice(0, 100).filter((c) => c.category !== 'Stablecoin');
  const topGainers = [...nonStables].sort((a, b) => b.change24h - a.change24h).slice(0, 4);
  const topLosers = [...nonStables].sort((a, b) => a.change24h - b.change24h).slice(0, 4);
  const watchedCoins = coins.filter((c) => watchlistIds.includes(c.id));
  const mentioned = extractMentionedCoinsFromPrompt(prompt, coins);
  const q = prompt.toLowerCase();

  // Detect intents from exact typed prompt
  const hasCompareIntent =
    /\b(vs|versus|compare|comparison|between|better than|outperform)\b/i.test(q) &&
    (mentioned.length >= 2 || (mentioned.length === 1 && /\b(market|btc|eth)\b/i.test(q)));
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

  // 1. Compare 2+ coins dynamically
  if (hasCompareIntent) {
    const comparePool =
      mentioned.length >= 2
        ? mentioned.slice(0, 3)
        : [mentioned[0], mentioned[0]?.symbol === 'BTC' ? eth : btc].filter((c): c is Coin => Boolean(c));
    const [a, b] = comparePool;
    const ratioNote =
      a && b && b.priceUsd > 0
        ? `• Relative Rate: 1 ${a.symbol} = ${(a.priceUsd / b.priceUsd).toFixed(4)} ${b.symbol} · 24h Spread: ${(a.change24h - b.change24h) >= 0 ? '+' : ''}${(a.change24h - b.change24h).toFixed(2)}% in favor of ${a.change24h >= b.change24h ? a.symbol : b.symbol}`
        : '';

    return [
      `Live Comparison: ${comparePool.map((c) => c.symbol).join(' vs ')} (${currency})`,
      ...comparePool.map((c) => {
        const { low, high, posPct } = computeRangePosition(c);
        return `• ${c.name} (${c.symbol}, #${c.rank}): ${formatDualPrice(c.priceUsd, currency, fxRates)} | 24h ${formatPercent(c.change24h)} | 7d ${formatPercent(c.change7d)}\n  - MCap: ${formatCompactCurrency(c.marketCapUsd, currency, fxRates)} · 24h Vol: ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)} · Range Pos: ${posPct}% (${formatPrice(low, currency, fxRates)}–${formatPrice(high, currency, fxRates)})`;
      }),
      ratioNote,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // 2. Whale & Bubble Anomaly (coin-specific if user mentioned a coin!)
  if (hasWhaleIntent) {
    const focusCoin = mentioned[0] || btc;
    const sonar =
      coins.length > 0
        ? buildFilteredWhaleSonar(coins, mentioned.length > 0 ? focusCoin.symbol : '', 14)
        : null;
    const bubble = focusCoin ? buildBubbleRadarGraph(focusCoin) : null;
    const topSignals = (sonar?.signals ?? []).slice(0, 4);

    return [
      `${mentioned.length > 0 ? `${focusCoin.name} (${focusCoin.symbol}) ` : ''}Whale & Holder Concentration Pulse (${currency})`,
      focusCoin
        ? `• ${focusCoin.symbol} Spot Context: ${formatDualPrice(focusCoin.priceUsd, currency, fxRates)} (${formatPercent(focusCoin.change24h)} 24h) · 24h Vol ${formatCompactCurrency(focusCoin.volume24hUsd, currency, fxRates)}`
        : '',
      sonar
        ? `• Net Whale Flow Bias: ${sonar.summary.netBiasLabel} · Traced Volume ${formatCompactCurrency(sonar.summary.totalVolumeUsd, currency, fxRates)} (Inflow ${formatCompactCurrency(sonar.summary.inflowUsd, currency, fxRates)} vs Cold Outflow ${formatCompactCurrency(sonar.summary.outflowUsd, currency, fxRates)})`
        : '',
      bubble
        ? `• ${bubble.coinSymbol} Centralization Score: ${bubble.centralizationScore}/100 · Top 10 Holders ${bubble.top10HolderPct}% · Exchange Custody ${bubble.exchangeCustodyPct}% (${bubble.smartMoneyFlowLabel})`
        : '',
      topSignals.length > 0
        ? `• Latest Large Transfers:\n${topSignals
            .map(
              (s) =>
                `  - ${s.symbol} ${s.signalType}: ${formatCompactCurrency(s.amountUsd, currency, fxRates)} (${s.walletTag})`
            )
            .join('\n')}`
        : `• No outsized single-wallet spikes detected for ${focusCoin?.symbol || 'tracked assets'} in this window.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // 3. Trade Signal / Buy-Sell / Support-Resistance (dynamically targets user's mentioned coin!)
  if (hasBuySellIntent) {
    const targets =
      mentioned.length > 0
        ? mentioned.slice(0, 3)
        : [btc, eth, sol].filter((c): c is Coin => Boolean(c));
    const conversionLine = tryParseAmountConversion(prompt, targets, currency, fxRates);

    return [
      `${targets.map((c) => c.symbol).join(' / ')} Technical Levels & Setup (${currency})`,
      ...(conversionLine ? [conversionLine] : []),
      ...targets.map((c) => buildCoinSetupBullets(c, currency, fxRates)),
      `• Macro Filter: BTC Dominance ${globalStats.btcDominance.toFixed(1)}% · Fear & Greed ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel})`,
      `• Analytical telemetry derived from live 24h price/volume ranges (non-advisory).`,
    ].join('\n\n');
  }

  // 4. Portfolio Risk & Watchlist Advisor
  if (hasRiskIntent) {
    const targetPool =
      mentioned.length > 0 ? mentioned : watchedCoins.length > 0 ? watchedCoins : coins.slice(0, 4);
    const health = computePortfolioHealth(targetPool);

    return [
      `Portfolio Risk & Rebalance Analysis (${currency})`,
      `• Health Score: ${health.score}/100 (${health.grade}) · Volatility Profile: ${health.volatilityLabel}`,
      `• Analyzed Assets (${mentioned.length > 0 ? 'Query Selection' : watchedCoins.length > 0 ? `${watchedCoins.length} Watchlist` : 'Top 4 Benchmark'}):`,
      ...targetPool.slice(0, 5).map(
        (c) =>
          `  - ${c.name} (${c.symbol}): ${formatDualPrice(c.priceUsd, currency, fxRates)} · 24h ${formatPercent(c.change24h)} · 7d ${formatPercent(c.change7d)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)}`
      ),
      `• Suggested Analytical Weighting: ${health.corePct}% Core L1 (BTC/ETH) · ${health.altPct}% High-Beta Alts · ${health.stablePct}% Stablecoin Buffer`,
      `• Macro Anchor: BTC Dominance ${globalStats.btcDominance.toFixed(1)}% · Altcoin Season ${globalStats.altcoinSeasonIndex}/100`,
    ].join('\n');
  }

  // 5. News, Sentiment, Dominance, Altcoin Season (filtered to coin/topic if mentioned!)
  if (hasNewsIntent) {
    const topicTerms = mentioned.flatMap((c) => [c.symbol.toLowerCase(), c.name.toLowerCase()]);
    const matchedNews =
      topicTerms.length > 0
        ? newsArticles.filter((n) =>
            topicTerms.some((t) => n.title.toLowerCase().includes(t) || n.summary.toLowerCase().includes(t))
          )
        : [];
    const headlines = (matchedNews.length > 0 ? matchedNews : newsArticles).slice(0, 4);

    return [
      `${mentioned.length > 0 ? `${mentioned[0].symbol} & ` : ''}Market Sentiment & News Digest (${currency})`,
      ...(mentioned.length > 0
        ? mentioned.slice(0, 2).map(
            (c) =>
              `• ${c.name} (${c.symbol}) Live: ${formatDualPrice(c.priceUsd, currency, fxRates)} (${formatPercent(c.change24h)} 24h) · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)}`
          )
        : []),
      `• Global Market Cap: ${formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates)} (${formatPercent(globalStats.marketCapChange24h)} 24h) · 24h Vol: ${formatCompactCurrency(globalStats.totalVolume24hUsd, currency, fxRates)}`,
      `• Cycle & Sentiment: Fear & Greed ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel}) · Altcoin Season ${globalStats.altcoinSeasonIndex}/100 · BTC ${globalStats.btcDominance.toFixed(1)}% / ETH ${globalStats.ethDominance.toFixed(1)}%`,
      ...(headlines.length > 0
        ? [
            `• ${matchedNews.length > 0 ? 'Related Headlines' : 'Top Wire Headlines'}:\n${headlines
              .map((h) => `  - [${h.category}] ${h.title} (${h.source})`)
              .join('\n')}`,
          ]
        : []),
    ].join('\n');
  }

  // 6. Specific Coin Live Query (price, volume, mcap, amount conversion, general coin check)
  if (mentioned.length > 0) {
    const conversionLine = tryParseAmountConversion(prompt, mentioned, currency, fxRates);
    return [
      `${mentioned.map((c) => `${c.name} (${c.symbol})`).join(', ')} — Live Telemetry (${currency})`,
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
          `  - 24h Support / Resistance: ${formatPrice(low, currency, fxRates)} – ${formatPrice(high, currency, fxRates)} (${posPct}% range · ${zoneLabel})`,
        ].join('\n');
      }),
      `• Macro Context: BTC Dom ${globalStats.btcDominance.toFixed(1)}% · Fear & Greed ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel})`,
    ].join('\n');
  }

  // 7. Top Movers / Gainers / Losers query
  if (hasMoversIntent) {
    const wantsLosersOnly = /\b(loser|losers|dip|dipping|worst|red|down)\b/i.test(q) && !/\b(gainer|winner|best)\b/i.test(q);
    const wantsGainersOnly = /\b(gainer|gainers|winner|winners|pumping|surging|best)\b/i.test(q) && !/\b(loser|losers|worst|red|down)\b/i.test(q);

    return [
      `Live 24h Market Movers (${currency})`,
      ...(!wantsLosersOnly
        ? [
            `• Top 24h Gainers:\n${topGainers
              .map(
                (c) =>
                  `  - ${c.name} (${c.symbol}): ${formatDualPrice(c.priceUsd, currency, fxRates)} (${formatPercent(c.change24h)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)})`
              )
              .join('\n')}`,
          ]
        : []),
      ...(!wantsGainersOnly
        ? [
            `• Largest 24h Pullbacks:\n${topLosers
              .map(
                (c) =>
                  `  - ${c.name} (${c.symbol}): ${formatDualPrice(c.priceUsd, currency, fxRates)} (${formatPercent(c.change24h)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)})`
              )
              .join('\n')}`,
          ]
        : []),
      `• Market Breadth: BTC ${formatPercent(btc?.change24h ?? 0)} · ETH ${formatPercent(eth?.change24h ?? 0)} · Altcoin Season ${globalStats.altcoinSeasonIndex}/100`,
    ].join('\n');
  }

  // 8. Sector / Category query (Meme, DeFi, Layer 1, Layer 2, AI, Stablecoin)
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
      return [
        `${matchedSector.label} Live Pulse (${currency})`,
        ...sectorCoins.map(
          (c) =>
            `• ${c.name} (${c.symbol}, #${c.rank}): ${formatDualPrice(c.priceUsd, currency, fxRates)} · 24h ${formatPercent(c.change24h)} · Vol ${formatCompactCurrency(c.volume24hUsd, currency, fxRates)}`
        ),
        `• Sector Benchmark: BTC Dom ${globalStats.btcDominance.toFixed(1)}% · Altcoin Index ${globalStats.altcoinSeasonIndex}/100`,
      ].join('\n');
    }
  }

  // 9. Dynamic Custom Market Breadth Answer (uses live top 50 breadth & query focus)
  const top50 = coins.slice(0, 50);
  const greenCount = top50.filter((c) => c.change24h >= 0).length;
  const breadthPct = top50.length > 0 ? Math.round((greenCount / top50.length) * 100) : 50;

  return [
    `Live Market Read for "${prompt.length > 64 ? `${prompt.slice(0, 61)}...` : prompt}" (${currency})`,
    `• Top 50 Breadth: ${greenCount}/${top50.length} assets green (${breadthPct}%) · Global MCap ${formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates)} (${formatPercent(globalStats.marketCapChange24h)} 24h)`,
    `• Core Benchmarks: BTC ${formatDualPrice(btc?.priceUsd ?? 0, currency, fxRates)} (${formatPercent(btc?.change24h ?? 0)}) · ETH ${formatDualPrice(eth?.priceUsd ?? 0, currency, fxRates)} (${formatPercent(eth?.change24h ?? 0)}) · SOL ${formatDualPrice(sol?.priceUsd ?? 0, currency, fxRates)} (${formatPercent(sol?.change24h ?? 0)})`,
    `• Sentiment & Dominance: Fear & Greed ${globalStats.fearGreedValue} (${globalStats.fearGreedLabel}) · BTC ${globalStats.btcDominance.toFixed(1)}% Dom · Altcoin Season ${globalStats.altcoinSeasonIndex}/100`,
    `• Standout Movers: Gainers ${topGainers.slice(0, 3).map((c) => `${c.symbol} ${formatPercent(c.change24h)}`).join(' · ')} | Pullbacks ${topLosers.slice(0, 2).map((c) => `${c.symbol} ${formatPercent(c.change24h)}`).join(' · ')}`,
  ].join('\n');
}
