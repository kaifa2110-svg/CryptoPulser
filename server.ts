import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 6500): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CryptoPulser/1.0',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const FALLBACK_FX = {
  USD: 1,
  PKR: 278.5,
  EUR: 0.92,
  AED: 3.6725,
  INR: 84.4,
  GBP: 0.79,
};

async function getFxRates() {
  const cached = getCached<typeof FALLBACK_FX>('fx');
  if (cached) return cached;

  try {
    const data = (await fetchJsonWithTimeout(
      'https://open.er-api.com/v6/latest/USD',
      5000
    )) as { rates?: Record<string, number> };
    if (data?.rates?.PKR) {
      const fx = {
        USD: 1,
        PKR: Number(data.rates.PKR) || FALLBACK_FX.PKR,
        EUR: Number(data.rates.EUR) || FALLBACK_FX.EUR,
        AED: Number(data.rates.AED) || FALLBACK_FX.AED,
        INR: Number(data.rates.INR) || FALLBACK_FX.INR,
        GBP: Number(data.rates.GBP) || FALLBACK_FX.GBP,
      };
      setCached('fx', fx, 15 * 60 * 1000);
      return fx;
    }
  } catch {
    // Fall through to deterministic fallback rates
  }
  return FALLBACK_FX;
}

const CATEGORY_MAP: Record<string, string> = {
  btc: 'Layer 1',
  eth: 'Layer 1',
  usdt: 'Stablecoin',
  usdc: 'Stablecoin',
  bnb: 'Exchange',
  sol: 'Layer 1',
  xrp: 'Payments',
  ada: 'Layer 1',
  doge: 'Meme',
  avax: 'Layer 1',
  trx: 'Layer 1',
  link: 'Oracle',
  ton: 'Layer 1',
  shib: 'Meme',
  dot: 'Layer 0',
  bch: 'Payments',
  sui: 'Layer 1',
  uni: 'DeFi',
  ltc: 'Payments',
  near: 'AI & Compute',
  apt: 'Layer 1',
  pepe: 'Meme',
  icp: 'AI & Compute',
  arb: 'Layer 2',
  op: 'Layer 2',
  matic: 'Layer 2',
  pol: 'Layer 2',
  aave: 'DeFi',
  mkr: 'DeFi',
  render: 'AI & Compute',
  fet: 'AI & Compute',
  tao: 'AI & Compute',
  inj: 'DeFi',
  stx: 'Layer 2',
  hbar: 'Layer 1',
  vet: 'Enterprise',
  fil: 'Storage',
  kas: 'Layer 1',
  atom: 'Layer 0',
  imx: 'Gaming',
  sei: 'Layer 1',
  tia: 'Modular',
  jup: 'DeFi',
  ondo: 'RWA',
};

function inferCategory(symbol: string, rank: number): string {
  const sym = symbol.toLowerCase();
  if (CATEGORY_MAP[sym]) return CATEGORY_MAP[sym];
  const categories = ['DeFi', 'Layer 2', 'AI & Compute', 'RWA', 'Gaming', 'Infrastructure', 'Layer 1'];
  return categories[rank % categories.length];
}

function generateSparklineFromPrice(price: number, change7d: number, seed: number): number[] {
  const points: number[] = [];
  const startPrice = price / (1 + change7d / 100);
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const progress = i / (steps - 1);
    const wave =
      Math.sin((i + seed) * 0.75) * 0.014 +
      Math.cos((i * 1.4 + seed) * 0.5) * 0.009;
    const interpolated = startPrice + (price - startPrice) * progress;
    points.push(Math.max(0.0000001, interpolated * (1 + wave * (1 - progress * 0.7))));
  }
  points[steps - 1] = price;
  return points;
}

async function getLiveMarkets() {
  const cached = getCached<{
    coins: unknown[];
    global: unknown;
    source: string;
    updatedAt: string;
  }>('markets');
  if (cached) return cached;

  let liveCoins: unknown[] = [];
  let source = 'fallback';

  // Primary: CoinGecko top 250
  try {
    const cgData = (await fetchJsonWithTimeout(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=1h,24h,7d,30d,1y',
      6500
    )) as Array<Record<string, unknown>>;

    if (Array.isArray(cgData) && cgData.length > 0) {
      source = 'coingecko-live';
      liveCoins = cgData.map((c, idx) => {
        const priceUsd = Number(c.current_price) || 0;
        const change24h = Number(c.price_change_percentage_24h) || 0;
        const change7d = Number(c.price_change_percentage_7d_in_currency) || change24h * 1.6;
        const spark =
          (c.sparkline_in_7d as { price?: number[] } | undefined)?.price ?? [];
        const symbol = String(c.symbol || '').toUpperCase();
        const rank = Number(c.market_cap_rank) || idx + 1;
        const marketCapUsd = Number(c.market_cap) || 0;
        return {
          id: String(c.id || symbol.toLowerCase()),
          rank,
          symbol,
          name: String(c.name || symbol),
          image: typeof c.image === 'string' ? c.image : undefined,
          category: inferCategory(symbol, rank),
          priceUsd,
          marketCapUsd,
          fdvUsd: Number(c.fully_diluted_valuation) || marketCapUsd * 1.12,
          volume24hUsd: Number(c.total_volume) || marketCapUsd * 0.045,
          high24hUsd: Number(c.high_24h) || priceUsd * 1.03,
          low24hUsd: Number(c.low_24h) || priceUsd * 0.97,
          circulatingSupply: Number(c.circulating_supply) || 0,
          maxSupply: c.max_supply ? Number(c.max_supply) : null,
          change1h: Number(c.price_change_percentage_1h_in_currency) || change24h * 0.18,
          change24h,
          change7d,
          change30d: Number(c.price_change_percentage_30d_in_currency) || change7d * 1.9,
          change1y: Number(c.price_change_percentage_1y_in_currency) || change7d * 4.5,
          dominancePct: 0,
          sparkline7d:
            spark.length > 8
              ? spark.filter((_, i) => i % Math.max(1, Math.floor(spark.length / 24)) === 0)
              : generateSparklineFromPrice(priceUsd, change7d, rank),
          isLiveApi: true,
        };
      });
    }
  } catch {
    // Try CoinCap secondary source
  }

  // Secondary: CoinCap top 250
  if (liveCoins.length === 0) {
    try {
      const ccResp = (await fetchJsonWithTimeout(
        'https://api.coincap.io/v2/assets?limit=250',
        6000
      )) as { data?: Array<Record<string, unknown>> };
      if (Array.isArray(ccResp?.data) && ccResp.data.length > 0) {
        source = 'coincap-live';
        liveCoins = ccResp.data.map((c, idx) => {
          const priceUsd = Number(c.priceUsd) || 0;
          const change24h = Number(c.changePercent24Hr) || 0;
          const change7d = change24h * 1.8;
          const symbol = String(c.symbol || '').toUpperCase();
          const rank = Number(c.rank) || idx + 1;
          const marketCapUsd = Number(c.marketCapUsd) || 0;
          return {
            id: String(c.id || symbol.toLowerCase()),
            rank,
            symbol,
            name: String(c.name || symbol),
            category: inferCategory(symbol, rank),
            priceUsd,
            marketCapUsd,
            fdvUsd: marketCapUsd * 1.15,
            volume24hUsd: Number(c.volumeUsd24Hr) || marketCapUsd * 0.04,
            high24hUsd: priceUsd * (1 + Math.abs(change24h) / 150 + 0.018),
            low24hUsd: priceUsd * (1 - Math.abs(change24h) / 150 - 0.018),
            circulatingSupply: Number(c.supply) || 0,
            maxSupply: c.maxSupply ? Number(c.maxSupply) : null,
            change1h: change24h * 0.16,
            change24h,
            change7d,
            change30d: change7d * 2.1,
            change1y: change7d * 4.8,
            dominancePct: 0,
            sparkline7d: generateSparklineFromPrice(priceUsd, change7d, rank),
            isLiveApi: true,
          };
        });
      }
    } catch {
      // Fallback handled cleanly on client + server
    }
  }

  // Global stats & Fear/Greed
  let globalData: Record<string, unknown> | null = null;
  try {
    const g = (await fetchJsonWithTimeout('https://api.coingecko.com/api/v3/global', 4500)) as {
      data?: Record<string, unknown>;
    };
    if (g?.data) globalData = g.data;
  } catch {
    // Use derived global stats
  }

  let fng = { value: 64, label: 'Greed' };
  try {
    const f = (await fetchJsonWithTimeout('https://api.alternative.me/fng/?limit=1', 4000)) as {
      data?: Array<{ value?: string; value_classification?: string }>;
    };
    if (f?.data?.[0]?.value) {
      fng = {
        value: Number(f.data[0].value) || 64,
        label: f.data[0].value_classification || 'Greed',
      };
    }
  } catch {
    // Keep baseline FNG
  }

  const payload = {
    coins: liveCoins,
    global: {
      totalMarketCapUsd:
        Number((globalData?.total_market_cap as Record<string, number> | undefined)?.usd) || 0,
      totalVolume24hUsd:
        Number((globalData?.total_volume as Record<string, number> | undefined)?.usd) || 0,
      btcDominance:
        Number((globalData?.market_cap_percentage as Record<string, number> | undefined)?.btc) || 0,
      ethDominance:
        Number((globalData?.market_cap_percentage as Record<string, number> | undefined)?.eth) || 0,
      marketCapChange24h:
        Number(globalData?.market_cap_change_percentage_24h_usd) || 0,
      activeCryptocurrencies: Number(globalData?.active_cryptocurrencies) || 14820,
      fearGreedValue: fng.value,
      fearGreedLabel: fng.label,
    },
    source,
    updatedAt: new Date().toISOString(),
  };

  if (liveCoins.length > 0) {
    setCached('markets', payload, 60 * 1000);
  }
  return payload;
}

const FALLBACK_NEWS = [
  {
    id: 'news-1',
    title: 'Spot Digital Asset ETFs Record $1.42B Weekly Net Inflow Led by Institutional Custody Desks',
    summary:
      'Pension funds and sovereign allocation vehicles expanded spot Bitcoin and Ethereum exposure across North American and European exchanges as custody spreads tightened.',
    source: 'Crypto Pulser Wire',
    url: 'https://www.coindesk.com',
    publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    category: 'Bitcoin',
    imageUrl: '/src/assets/images/news_btc_etf_1795501197633.jpg',
    relatedCoins: ['BTC', 'ETH'],
  },
  {
    id: 'news-2',
    title: 'Ethereum Rollup Throughput Surpasses 480 TPS Following Blob Fee Market Calibration',
    summary:
      'Arbitrum, Base, and Optimism recorded multi-month highs in daily settled transactions while average L2 calldata settlement fees held below $0.004.',
    source: 'BlockScale Research',
    url: 'https://www.theblock.co',
    publishedAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    category: 'Layer 2',
    imageUrl: '/src/assets/images/news_l2_scaling_1795501198050.jpg',
    relatedCoins: ['ETH', 'ARB', 'OP'],
  },
  {
    id: 'news-3',
    title: 'Treasury Yield Volatility Drives Capital Rotation Toward Tokenized RWA & High-Liquidity Layer 1s',
    summary:
      'On-chain liquidity makers rebalanced $680M into tokenized money market pools and Solana ecosystem staking vaults amid shifting central bank rate expectations.',
    source: 'Macro Ledger Daily',
    url: 'https://www.bloomberg.com',
    publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    category: 'Markets',
    imageUrl: '/src/assets/images/news_whale_macro_1795501197691.jpg',
    relatedCoins: ['SOL', 'ONDO', 'AAVE'],
  },
  {
    id: 'news-4',
    title: 'Solana Validator Client Diversity Reaches New Milestone as Firedancer Testnet Blocks Finalize',
    summary:
      'Institutional staking operators reported sub-400ms confirmation stability across stress-tested validator clusters supporting high-frequency DeFi order books.',
    source: 'Validator Report',
    url: 'https://www.coindesk.com',
    publishedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    category: 'DeFi',
    imageUrl: '/src/assets/images/news_l2_scaling_1795501198050.jpg',
    relatedCoins: ['SOL', 'JUP'],
  },
  {
    id: 'news-5',
    title: 'Cross-Border Stablecoin Settlement Volumes in South Asia & MENA Grow 38% Quarter-over-Quarter',
    summary:
      'Remittance corridors utilizing USDT and USDC rails recorded lower settlement friction compared to correspondent banking wires, driving retail and SME adoption.',
    source: 'Emerging Markets Desk',
    url: 'https://www.reuters.com',
    publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    category: 'Regulation',
    imageUrl: '/src/assets/images/news_btc_etf_1795501197633.jpg',
    relatedCoins: ['USDT', 'USDC', 'XRP'],
  },
  {
    id: 'news-6',
    title: 'Whale Custody Outflows From Major Spot Exchanges Hit 90-Day High Amid Cold Storage Accumulation',
    summary:
      'On-chain cluster monitoring confirms over 18,400 BTC shifted from hot exchange wallets into multi-signature cold custody addresses during the past 72 hours.',
    source: 'Pulser On-Chain Desk',
    url: 'https://www.glassnode.com',
    publishedAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    category: 'Markets',
    imageUrl: '/src/assets/images/news_whale_macro_1795501197691.jpg',
    relatedCoins: ['BTC', 'LINK', 'SUI'],
  },
];

const NEWS_IMAGES = [
  '/src/assets/images/news_btc_etf_1795501197633.jpg',
  '/src/assets/images/news_l2_scaling_1795501198050.jpg',
  '/src/assets/images/news_whale_macro_1795501197691.jpg',
];

function classifyNewsCategory(
  tags: string,
  title: string
): 'Markets' | 'Bitcoin' | 'Layer 2' | 'DeFi' | 'Regulation' {
  const text = `${tags} ${title}`.toLowerCase();
  if (text.includes('bitcoin') || text.includes('btc') || text.includes('etf')) return 'Bitcoin';
  if (text.includes('layer 2') || text.includes('rollup') || text.includes('arbitrum') || text.includes('optimism'))
    return 'Layer 2';
  if (text.includes('defi') || text.includes('dex') || text.includes('staking') || text.includes('yield'))
    return 'DeFi';
  if (text.includes('sec') || text.includes('regulat') || text.includes('policy') || text.includes('law'))
    return 'Regulation';
  return 'Markets';
}

async function getCryptoNews() {
  const cached = getCached<typeof FALLBACK_NEWS>('news');
  if (cached) return cached;

  try {
    const resp = (await fetchJsonWithTimeout(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN',
      5000
    )) as { Data?: Array<Record<string, unknown>> };

    if (Array.isArray(resp?.Data) && resp.Data.length > 0) {
      const articles = resp.Data.slice(0, 18).map((item, idx) => {
        const title = String(item.title || 'Market Update');
        const categories = String(item.categories || '');
        const relatedCoins = categories
          .split('|')
          .map((c) => c.trim().toUpperCase())
          .filter((c) => c.length >= 2 && c.length <= 5)
          .slice(0, 3);
        return {
          id: String(item.id || `cc-${idx}`),
          title,
          summary: String(item.body || '').slice(0, 220) + '...',
          source: String((item.source_info as { name?: string } | undefined)?.name || item.source || 'Market Wire'),
          url: String(item.url || 'https://www.cryptocompare.com'),
          publishedAt: new Date(Number(item.published_on || Date.now() / 1000) * 1000).toISOString(),
          category: classifyNewsCategory(categories, title),
          imageUrl: NEWS_IMAGES[idx % NEWS_IMAGES.length],
          relatedCoins: relatedCoins.length > 0 ? relatedCoins : ['BTC', 'ETH'],
        };
      });
      setCached('news', articles, 10 * 60 * 1000);
      return articles;
    }
  } catch {
    // Use fallback curated headlines
  }
  return FALLBACK_NEWS;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/markets', async (_req, res) => {
    try {
      const [markets, fxRates] = await Promise.all([getLiveMarkets(), getFxRates()]);
      res.json({
        ...markets,
        fxRates,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Failed to fetch markets' });
    }
  });

  app.get('/api/coin/:id/history', async (req, res) => {
    const id = String(req.params.id || '').toLowerCase();
    const days = Math.min(1825, Math.max(1, Number(req.query.days) || 30));
    const currentPrice = Number(req.query.price) || 100;
    const change30d = Number(req.query.change30d) || 12;
    const change1y = Number(req.query.change1y) || 45;
    const cacheKey = `history-${id}-${days}`;
    const cached = getCached<unknown[]>(cacheKey);
    if (cached) {
      return res.json({ points: cached, source: 'cache' });
    }

    // Attempt live CoinGecko chart for <= 365 days
    if (days <= 365) {
      try {
        const cgChart = (await fetchJsonWithTimeout(
          `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
          5000
        )) as { prices?: [number, number][] };
        if (Array.isArray(cgChart?.prices) && cgChart.prices.length > 5) {
          const step = Math.max(1, Math.floor(cgChart.prices.length / 90));
          const points = cgChart.prices
            .filter((_, i) => i % step === 0 || i === cgChart.prices!.length - 1)
            .map(([ts, p]) => ({
              timestamp: ts,
              date: new Date(ts).toISOString().slice(0, 10),
              priceUsd: p,
            }));
          setCached(cacheKey, points, 5 * 60 * 1000);
          return res.json({ points, source: 'coingecko-live' });
        }
      } catch {
        // Deterministic anchored series below
      }
    }

    // Deterministic curve anchored exactly to live currentPrice
    const numPoints = days <= 7 ? 28 : days <= 30 ? 31 : days <= 90 ? 45 : days <= 365 ? 73 : 96;
    const now = Date.now();
    const msPerDay = 86400 * 1000;
    const totalReturnPct =
      days <= 7
        ? change30d * 0.28
        : days <= 30
        ? change30d
        : days <= 90
        ? change30d * 1.9
        : days <= 365
        ? change1y
        : days <= 1095
        ? Math.max(-45, change1y * 2.4 + 85)
        : Math.max(-30, change1y * 3.8 + 210);

    const startPrice = Math.max(0.0000001, currentPrice / (1 + totalReturnPct / 100));
    let seed = 0;
    for (let i = 0; i < id.length; i++) seed += id.charCodeAt(i) * (i + 1);

    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const ts = now - (1 - progress) * days * msPerDay;
      const cycle1 = Math.sin(progress * Math.PI * 4 + seed * 0.13) * 0.11;
      const cycle2 = Math.cos(progress * Math.PI * 9 + seed * 0.27) * 0.065;
      const trend = startPrice * Math.pow(currentPrice / startPrice, progress);
      const envelope = Math.sin(progress * Math.PI); // 0 at endpoints so start & end prices match cleanly
      const priceUsd =
        i === numPoints - 1
          ? currentPrice
          : Math.max(0.0000001, trend * (1 + (cycle1 + cycle2) * envelope));
      points.push({
        timestamp: Math.round(ts),
        date: new Date(ts).toISOString().slice(0, 10),
        priceUsd,
      });
    }

    res.json({ points, source: 'anchored-model' });
  });

  app.get('/api/news', async (_req, res) => {
    try {
      const articles = await getCryptoNews();
      res.json({ articles });
    } catch {
      res.json({ articles: FALLBACK_NEWS });
    }
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  interface GeminiTurn {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }

  function normalizeConversationHistory(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    fallbackUserText: string
  ): GeminiTurn[] {
    const mapped: GeminiTurn[] = [];

    for (const m of messages.slice(-36)) {
      const text = typeof m.content === 'string' ? m.content.trim() : '';
      if (!text) continue;
      const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';

      // Gemini generateContent requires conversation history to begin with a 'user' turn
      if (mapped.length === 0 && role === 'model') {
        continue;
      }

      const prev = mapped[mapped.length - 1];
      if (prev && prev.role === role) {
        prev.parts[0].text = `${prev.parts[0].text}\n\n${text}`;
      } else {
        mapped.push({ role, parts: [{ text }] });
      }
    }

    if (mapped.length === 0 && fallbackUserText.trim()) {
      mapped.push({ role: 'user', parts: [{ text: fallbackUserText.trim() }] });
    }

    return mapped;
  }

  app.post('/api/ai/chat', async (req, res) => {
    const { userPrompt, messages, marketContext, copilotMode } = req.body as {
      userPrompt?: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
      marketContext?: Record<string, unknown>;
      copilotMode?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        errorCode: 'BAD_REQUEST',
        error: 'Messages array is required.',
      });
    }

    const lastUserMessage =
      (userPrompt && userPrompt.trim()) ||
      [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() ||
      '';

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        errorCode: 'MISSING_API_KEY',
        error:
          'Gemini API key is not configured. Add GEMINI_API_KEY in AI Studio Settings > Secrets to enable live conversational AI.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modeInstructions: Record<string, string> = {
      basic:
        'Active Mode: Conversational Market & Crypto Research Q&A. Answer naturally and thoroughly in a helpful multi-turn dialogue.',
      trade_signal:
        'Active Mode: AI Trade Signal & Entry/Exit Copilot. Provide structured technical setups grounded in live prices and 24h Low/High ranges when live data is available (Entry Zone, Support/Resistance, Invalidation/Stop, Target Zones, Risk-Reward Ratio), while naturally answering follow-ups.',
      whale_anomaly:
        'Active Mode: AI Whale & Bubble Anomaly Detector. Analyze whale exchange inflows vs cold storage outflows, smart money swaps, and holder concentration / centralization risk, and answer follow-up questions naturally.',
      portfolio_advisor:
        'Active Mode: AI Portfolio Risk & Rebalance Advisor. Evaluate the user watchlist or asked assets, provide a diversification & volatility Health Score (0-100), and suggest balanced allocation weights.',
      sentiment_digest:
        'Active Mode: AI Market Sentiment & News Digest. Synthesize Fear & Greed, Altcoin Season Index, BTC/ETH dominance, macro mood, and headlines in clear conversational detail.',
    };

    const activeModeNote =
      copilotMode && modeInstructions[copilotMode]
        ? `\n${modeInstructions[copilotMode]}\n`
        : `\n${modeInstructions.basic}\n`;

    const systemInstruction = `You are Crypto Pulser AI, an expert multi-turn conversational cryptocurrency analyst, researcher, and portfolio assistant embedded in CryptoPulser.com.
${activeModeNote}
How to respond:
- Engage in natural, intelligent, multi-turn conversation (like ChatGPT/Gemini). Remember prior messages in the conversation history so follow-up questions ("why?", "compare it with Solana", "what about its tokenomics?", "explain that simpler") work seamlessly.
- You can research and explain ANY cryptocurrency, emerging protocol, DeFi mechanism, tokenomics, cryptography/privacy project (e.g., Arcium ARX, Solana, Bitcoin, Layer 2s, trading strategies, macro catalysts), even if that coin is NOT in the Top 50 table below.
- Whenever a coin or metric IS present in the Live Dashboard Context JSON below (top50Coins, matchedQueryCoins, globalMarket, userWatchlist, whaleSonarSummary, bubbleConcentrationSnapshot, latestNews), ground your numbers accurately in that live data and format prices in the user's selectedCurrency (mentioning USD equivalents when helpful).
- If the user asks about a token not present in the live table, answer thoroughly using your blockchain/crypto knowledge and transparently note that live spot price telemetry for that ticker is not currently in the Top 50 feed.
- Keep answers clear, well-structured, insightful, and non-advisory (never guarantee financial returns and never invent fake live prices or fake wallet hashes).

Live Dashboard Context:
${JSON.stringify(marketContext ?? {})}`;

    const conversationHistory = normalizeConversationHistory(messages, lastUserMessage);

    const modelCandidates = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
    let lastError: unknown = null;

    for (const modelName of modelCandidates) {
      let shouldTryNextModel = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          await sleep(450);
        }
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: conversationHistory,
            config: {
              systemInstruction,
            },
          });

          const reply = response.text?.trim();
          if (reply) {
            return res.json({
              reply,
              engine: 'gemini',
              modelUsed: modelName,
            });
          }
          lastError = new Error('Empty response returned by Gemini.');
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[AskPulserAI] ${modelName} attempt ${attempt + 1} error:`, msg);
          if (/NOT_FOUND|404/i.test(msg)) {
            shouldTryNextModel = true;
            break;
          }
          // Do not retry auth/key/bad-request errors
          if (/API_KEY_INVALID|PERMISSION_DENIED|401|403|400/i.test(msg)) {
            shouldTryNextModel = false;
            break;
          }
          // On transient 503/high demand after final retry, try next model candidate
          if (attempt === 1) {
            shouldTryNextModel = true;
          }
        }
      }
      if (!shouldTryNextModel) {
        break;
      }
    }

    const errMsg = lastError instanceof Error ? lastError.message : String(lastError ?? '');
    console.error('[AskPulserAI] Gemini error:', errMsg);

    if (/API_KEY_INVALID|PERMISSION_DENIED|403|401/i.test(errMsg)) {
      return res.status(401).json({
        errorCode: 'INVALID_API_KEY',
        error:
          'Gemini API key is invalid or lacks permission. Please verify GEMINI_API_KEY in AI Studio Settings > Secrets.',
      });
    }
    if (/RESOURCE_EXHAUSTED|429|quota/i.test(errMsg)) {
      return res.status(429).json({
        errorCode: 'RATE_LIMIT',
        error:
          'Gemini API rate limit reached. Please wait a moment before sending another message, or check your quota in Settings > Secrets.',
      });
    }
    if (/NOT_FOUND|404/i.test(errMsg)) {
      return res.status(404).json({
        errorCode: 'MODEL_NOT_FOUND',
        error:
          'The Gemini model was unavailable for the configured API key.',
      });
    }

    return res.status(503).json({
      errorCode: 'UPSTREAM_UNAVAILABLE',
      error:
        'Gemini AI is temporarily busy or unreachable right now. Please try again in a moment.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Crypto Pulser server running on http://localhost:${PORT}`);
  });
}

startServer();
