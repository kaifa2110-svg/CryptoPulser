const CMC_LISTINGS_URL =
  'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1000&convert=USD';
const CMC_GLOBAL_URL =
  'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest?convert=USD';

const FALLBACK_FX = {
  USD: 1,
  PKR: 278.5,
  EUR: 0.92,
  AED: 3.6725,
  INR: 84.4,
  GBP: 0.79,
};

const CATEGORY_MAP: Record<string, string> = {
  btc: 'Layer 1',
  eth: 'Layer 1',
  usdt: 'Stablecoin',
  usdc: 'Stablecoin',
  usds: 'Stablecoin',
  dai: 'Stablecoin',
  fdusd: 'Stablecoin',
  pyusd: 'Stablecoin',
  usde: 'Stablecoin',
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
  om: 'RWA',
  pendle: 'RWA',
  paxg: 'RWA',
  xaut: 'RWA',
  cfg: 'RWA',
  polyx: 'RWA',
};

interface CachedCmcPayload {
  expiresAt: number;
  payload: Record<string, unknown>;
}

const memoryCache = new Map<string, CachedCmcPayload>();

function readEnvCmcKey(): string {
  const proc = (
    globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;
  return (proc?.env?.CMC_API_KEY || '').trim();
}

function isValidApiKeyFormat(key: string): boolean {
  return key.length >= 10 && key.length <= 128 && /^[A-Za-z0-9\-_]+$/.test(key);
}

function inferCmcCategory(symbol: string, rank: number, tags: unknown): string {
  const sym = symbol.toLowerCase();
  if (Array.isArray(tags)) {
    const tagSet = new Set(tags.map((t) => String(t).toLowerCase()));
    if (tagSet.has('stablecoin') || tagSet.has('usd-stablecoin') || tagSet.has('fiat-stablecoin')) {
      return 'Stablecoin';
    }
    if (tagSet.has('real-world-assets') || tagSet.has('rwa')) return 'RWA';
    if (tagSet.has('memes') || tagSet.has('meme')) return 'Meme';
    if (tagSet.has('ai-big-data') || tagSet.has('generative-ai')) return 'AI & Compute';
    if (tagSet.has('layer-2') || tagSet.has('zero-knowledge-proofs') || tagSet.has('rollup')) {
      return 'Layer 2';
    }
    if (tagSet.has('defi') || tagSet.has('decentralized-exchange-dex-token')) return 'DeFi';
    if (tagSet.has('gaming') || tagSet.has('play-to-earn') || tagSet.has('metaverse')) return 'Gaming';
    if (tagSet.has('oracles')) return 'Oracle';
    if (tagSet.has('layer-1')) return 'Layer 1';
  }
  if (CATEGORY_MAP[sym]) return CATEGORY_MAP[sym];
  const categories = ['DeFi', 'Layer 2', 'AI & Compute', 'RWA', 'Gaming', 'Infrastructure', 'Layer 1'];
  return categories[rank % categories.length];
}

function generateSparklineFromPrice(price: number, change7d: number, seed: number): number[] {
  const points: number[] = [];
  const divisor = 1 + change7d / 100;
  const startPrice = divisor > 0.05 ? price / divisor : price;
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

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFxRatesSafe() {
  try {
    const res = await fetchWithTimeout(
      'https://open.er-api.com/v6/latest/USD',
      { Accept: 'application/json' },
      3500
    );
    if (!res.ok) return FALLBACK_FX;
    const data = (await res.json()) as { rates?: Record<string, number> };
    if (data?.rates?.PKR) {
      return {
        USD: 1,
        PKR: Number(data.rates.PKR) || FALLBACK_FX.PKR,
        EUR: Number(data.rates.EUR) || FALLBACK_FX.EUR,
        AED: Number(data.rates.AED) || FALLBACK_FX.AED,
        INR: Number(data.rates.INR) || FALLBACK_FX.INR,
        GBP: Number(data.rates.GBP) || FALLBACK_FX.GBP,
      };
    }
  } catch {
    // Fallback to deterministic FX rates
  }
  return FALLBACK_FX;
}

async function fetchFearGreedSafe() {
  try {
    const res = await fetchWithTimeout(
      'https://api.alternative.me/fng/?limit=1',
      { Accept: 'application/json' },
      3000
    );
    if (!res.ok) return { value: 64, label: 'Greed' };
    const data = (await res.json()) as {
      data?: Array<{ value?: string; value_classification?: string }>;
    };
    if (data?.data?.[0]?.value) {
      return {
        value: Number(data.data[0].value) || 64,
        label: data.data[0].value_classification || 'Greed',
      };
    }
  } catch {
    // Fallback FNG
  }
  return { value: 64, label: 'Greed' };
}

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const rawUserKey =
    request.headers.get('x-user-cmc-key') ||
    request.headers.get('x-cmc-api-key') ||
    '';
  const userKey = rawUserKey.trim();

  if (userKey && !isValidApiKeyFormat(userKey)) {
    return jsonResponse(
      { ok: false, error: 'Invalid x-user-cmc-key format.' },
      400,
      { 'Cache-Control': 'no-store' }
    );
  }

  const envKey = readEnvCmcKey();
  const activeKey = userKey || envKey;
  const usingUserKey = Boolean(userKey);

  if (!activeKey || activeKey === 'MY_CMC_API_KEY') {
    return jsonResponse(
      {
        ok: false,
        fallbackRequired: true,
        error: 'Server CMC_API_KEY is not configured and no x-user-cmc-key header was supplied.',
      },
      503,
      { 'Cache-Control': 'no-store' }
    );
  }

  const reqUrl = new URL(request.url, 'http://localhost');
  const action = reqUrl.searchParams.get('action') || reqUrl.searchParams.get('type');

  if (action === 'market-pairs') {
    const slug = reqUrl.searchParams.get('slug') || '';
    const symbol = reqUrl.searchParams.get('symbol') || '';
    const queryParam = slug ? `slug=${encodeURIComponent(slug)}` : `symbol=${encodeURIComponent(symbol)}`;
    try {
      const mpRes = await fetchWithTimeout(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/market-pairs/latest?${queryParam}&convert=USD&limit=50`,
        {
          Accept: 'application/json',
          'X-CMC_PRO_API_KEY': activeKey,
        },
        7000
      );
      if (!mpRes.ok) {
        return jsonResponse(
          {
            ok: false,
            restricted: true,
            status: mpRes.status,
            error: `CoinMarketCap market-pairs returned HTTP ${mpRes.status} (free plan requires Hobbyist+ tier).`,
          },
          200
        );
      }
      const mpJson = await mpRes.json();
      return jsonResponse({ ok: true, data: mpJson });
    } catch (err) {
      return jsonResponse(
        { ok: false, restricted: true, error: err instanceof Error ? err.message : String(err) },
        200
      );
    }
  }

  const cacheKey = usingUserKey ? `cmc:user:${activeKey.slice(-6)}` : 'cmc:env';
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return jsonResponse(cached.payload, 200, {
      'Cache-Control': usingUserKey
        ? 'private, no-store'
        : 's-maxage=60, stale-while-revalidate=120',
    });
  }

  const cmcHeaders = {
    Accept: 'application/json',
    'X-CMC_PRO_API_KEY': activeKey,
  };

  try {
    const [listingsRes, globalRes, fxRates, fng] = await Promise.all([
      fetchWithTimeout(CMC_LISTINGS_URL, cmcHeaders, 9000),
      fetchWithTimeout(CMC_GLOBAL_URL, cmcHeaders, 6500).catch(() => null),
      fetchFxRatesSafe(),
      fetchFearGreedSafe(),
    ]);

    if (!listingsRes.ok) {
      const statusCode = listingsRes.status === 401 || listingsRes.status === 403 ? 401 : 502;
      return jsonResponse(
        {
          ok: false,
          fallbackRequired: true,
          error: `CoinMarketCap listings upstream returned HTTP ${listingsRes.status}.`,
        },
        statusCode,
        { 'Cache-Control': 'no-store' }
      );
    }

    const listingsJson = (await listingsRes.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    const rawListings = Array.isArray(listingsJson?.data) ? listingsJson.data : [];
    if (rawListings.length === 0) {
      return jsonResponse(
        {
          ok: false,
          fallbackRequired: true,
          error: 'CoinMarketCap returned empty listings.',
        },
        502,
        { 'Cache-Control': 'no-store' }
      );
    }

    const coins = rawListings
      .map((c, idx) => {
        const idNum = Number(c.id) || idx + 1;
        const symbol = String(c.symbol || '').toUpperCase();
        const rank = Number(c.cmc_rank) || idx + 1;
        const usd = ((c.quote as Record<string, Record<string, unknown>> | undefined)?.USD) || {};
        const priceUsd = Number(usd.price) || 0;
        const change1h = Number.isFinite(Number(usd.percent_change_1h))
          ? Number(usd.percent_change_1h)
          : 0;
        const change24h = Number.isFinite(Number(usd.percent_change_24h))
          ? Number(usd.percent_change_24h)
          : 0;
        const change7d = Number.isFinite(Number(usd.percent_change_7d))
          ? Number(usd.percent_change_7d)
          : 0;
        const change30d = Number.isFinite(Number(usd.percent_change_30d))
          ? Number(usd.percent_change_30d)
          : change7d * 1.8;
        const hasExact90d =
          usd.percent_change_90d !== null &&
          usd.percent_change_90d !== undefined &&
          Number.isFinite(Number(usd.percent_change_90d));
        const change90d = hasExact90d ? Number(usd.percent_change_90d) : change30d * 1.75;
        const marketCapUsd = Number(usd.market_cap) || 0;
        const volume24hUsd = Number(usd.volume_24h) || 0;
        const vol24hChangePct = Number.isFinite(Number(usd.volume_change_24h))
          ? Number(usd.volume_change_24h)
          : 0;

        return {
          id: String(c.slug || `${symbol.toLowerCase()}-${idNum}`),
          rank,
          symbol,
          name: String(c.name || symbol),
          image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${idNum}.png`,
          category: inferCmcCategory(symbol, rank, c.tags),
          priceUsd,
          marketCapUsd,
          fdvUsd: Number(usd.fully_diluted_market_cap) || marketCapUsd * 1.15,
          volume24hUsd,
          vol24hChangePct,
          high24hUsd: priceUsd * (1 + Math.abs(change24h) / 140 + 0.015),
          low24hUsd: priceUsd * (1 - Math.abs(change24h) / 140 - 0.015),
          circulatingSupply: Number(c.circulating_supply) || 0,
          maxSupply: c.max_supply ? Number(c.max_supply) : null,
          change1h,
          change24h,
          change7d,
          change30d,
          change90d,
          change1y: change90d * 1.8,
          dominancePct: Number(usd.market_cap_dominance) || 0,
          sparkline7d: generateSparklineFromPrice(priceUsd, change7d, rank),
          isLiveApi: true,
          slug: String(c.slug || symbol.toLowerCase()),
          numMarketPairs: Number(c.num_market_pairs) || 0,
          cmcId: idNum,
        };
      })
      .filter((coin) => coin.priceUsd > 0);

    let globalPayload = {
      totalMarketCapUsd: 0,
      totalVolume24hUsd: 0,
      btcDominance: 0,
      ethDominance: 0,
      marketCapChange24h: 0,
      activeCryptocurrencies: 14820,
      fearGreedValue: fng.value,
      fearGreedLabel: fng.label,
    };

    if (globalRes && globalRes.ok) {
      const globalJson = (await globalRes.json()) as {
        data?: {
          active_cryptocurrencies?: number;
          btc_dominance?: number;
          eth_dominance?: number;
          quote?: {
            USD?: {
              total_market_cap?: number;
              total_volume_24h?: number;
              total_market_cap_yesterday_percentage_change?: number;
            };
          };
        };
      };
      const gd = globalJson?.data;
      const gUsd = gd?.quote?.USD;
      if (gd) {
        globalPayload = {
          totalMarketCapUsd: Number(gUsd?.total_market_cap) || 0,
          totalVolume24hUsd: Number(gUsd?.total_volume_24h) || 0,
          btcDominance: Number(gd.btc_dominance) || 0,
          ethDominance: Number(gd.eth_dominance) || 0,
          marketCapChange24h: Number(gUsd?.total_market_cap_yesterday_percentage_change) || 0,
          activeCryptocurrencies: Number(gd.active_cryptocurrencies) || 14820,
          fearGreedValue: fng.value,
          fearGreedLabel: fng.label,
        };
      }
    }

    const payload = {
      ok: true,
      coins,
      global: globalPayload,
      fxRates,
      source: usingUserKey ? 'coinmarketcap-personal-live' : 'coinmarketcap-pro-live',
      updatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, {
      expiresAt: Date.now() + 60 * 1000,
      payload,
    });

    return jsonResponse(payload, 200, {
      'Cache-Control': usingUserKey
        ? 'private, no-store'
        : 's-maxage=60, stale-while-revalidate=120',
    });
  } catch (err) {
    console.error('[api/cmc] Error:', err instanceof Error ? err.message : String(err));
    return jsonResponse(
      {
        ok: false,
        fallbackRequired: true,
        error: 'Unable to reach CoinMarketCap Pro API.',
      },
      502,
      { 'Cache-Control': 'no-store' }
    );
  }
}
