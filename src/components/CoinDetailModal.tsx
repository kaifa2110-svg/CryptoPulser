import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  CandlestickChart,
  LineChart,
  Radar,
  ShieldAlert,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { Coin, CurrencyCode, FxRates, HistoryPoint } from '../types/crypto';
import {
  convertUsd,
  formatCompactCurrency,
  formatPercent,
  formatPrice,
  formatSupply,
} from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface CoinDetailModalProps {
  coin: Coin | null;
  onClose: () => void;
  currency: CurrencyCode;
  fxRates: FxRates;
  isDark: boolean;
  isStarred: boolean;
  onToggleWatchlist: (coinId: string) => void;
  onSimulateCoin: (coin: Coin) => void;
  onInspectBubbleRadar: (coin: Coin) => void;
  onOpenAlertForCoin: (coin: Coin) => void;
  onOpenAntiFomoGuard?: (coin: Coin) => void;
}

type ChartMode = 'tradingview' | 'cmc';
type CmcRange = '7' | '30' | '90' | '365';

export const CoinDetailModal: React.FC<CoinDetailModalProps> = ({
  coin,
  onClose,
  currency,
  fxRates,
  isDark,
  isStarred,
  onToggleWatchlist,
  onSimulateCoin,
  onInspectBubbleRadar,
  onOpenAlertForCoin,
  onOpenAntiFomoGuard,
}) => {
  const { recordLookup } = usePrivacy();
  const [chartMode, setChartMode] = useState<ChartMode>('tradingview');
  const [cmcRange, setCmcRange] = useState<CmcRange>('30');
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!coin) return;
    recordLookup('Coin Detail', `${coin.name} (${coin.symbol})`);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [coin, onClose, recordLookup]);

  useEffect(() => {
    if (!coin || chartMode !== 'cmc') return;
    let active = true;
    setLoadingChart(true);
    fetch(
      `/api/coin/${encodeURIComponent(coin.id)}/history?days=${cmcRange}&price=${coin.priceUsd}&change30d=${coin.change30d}&change1y=${coin.change1y}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data?.points)) {
          setHistoryPoints(data.points);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingChart(false);
      });
    return () => {
      active = false;
    };
  }, [coin, chartMode, cmcRange]);

  const tvUrl = useMemo(() => {
    if (!coin) return '';
    // Universal CRYPTO:${symbol}USD fallback so even small/newer coins never show "Invalid symbol"
    const tvSymbol = `CRYPTO:${coin.symbol.toUpperCase()}USD`;
    const theme = isDark ? 'dark' : 'light';
    return `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(
      tvSymbol
    )}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=${
      isDark ? '0f172a' : 'f8fafc'
    }&studies=[]&theme=${theme}&style=1&timezone=Etc%2FUTC&withdateranges=1`;
  }, [coin, isDark]);

  if (!coin) return null;

  const rangeSpan = Math.max(0.0000001, coin.high24hUsd - coin.low24hUsd);
  const rangePct = Math.min(
    100,
    Math.max(0, ((coin.priceUsd - coin.low24hUsd) / rangeSpan) * 100)
  );

  // Built-in CMC chart geometry
  const chartW = 720;
  const chartH = 260;
  const prices = historyPoints.map((p) => convertUsd(p.priceUsd, currency, fxRates));
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 1;
  const spanP = maxP - minP || 1;
  const isPositiveCmc =
    historyPoints.length > 1
      ? historyPoints[historyPoints.length - 1].priceUsd >= historyPoints[0].priceUsd
      : coin.change24h >= 0;

  const polyPoints = prices
    .map((val, idx) => {
      const x = (idx / Math.max(1, prices.length - 1)) * (chartW - 24) + 12;
      const y = chartH - 20 - ((val - minP) / spanP) * (chartH - 44);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath =
    prices.length > 1
      ? `M 12,${chartH - 20} L ${polyPoints.split(' ').join(' L ')} L ${chartW - 12},${chartH - 20} Z`
      : '';

  const hoveredPoint =
    hoverIdx !== null && historyPoints[hoverIdx] ? historyPoints[hoverIdx] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CoinLogo coin={coin} size="lg" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
                  {coin.name}
                </h2>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {coin.symbol}
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  Rank #{coin.rank}
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {coin.category}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                  {formatPrice(coin.priceUsd, currency, fxRates)}
                </span>
                <span
                  className={`font-mono tabular-nums text-sm font-semibold ${
                    coin.change24h >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPercent(coin.change24h)} (24h)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleWatchlist(coin.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{isStarred ? 'Watchlisted' : 'Watchlist'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAlertForCoin(coin)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/40 text-xs font-medium text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alert</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSimulateCoin(coin);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Simulate ROI</span>
            </button>
            {onOpenAntiFomoGuard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAntiFomoGuard(coin);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Anti-FOMO Guard</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onInspectBubbleRadar(coin);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Radar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bubble Radar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Layout */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 cols: Chart Switcher + Chart */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setChartMode('tradingview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    chartMode === 'tradingview'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <CandlestickChart className="w-3.5 h-3.5" />
                  <span>TradingView Candlestick</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('cmc')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    chartMode === 'cmc'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>CMC Price Trend</span>
                </button>
              </div>

              {chartMode === 'tradingview' ? (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Symbol: CRYPTO:{coin.symbol.toUpperCase()}USD
                </span>
              ) : (
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5">
                  {(
                    [
                      { id: '7', label: '7D' },
                      { id: '30', label: '30D' },
                      { id: '90', label: '90D' },
                      { id: '365', label: '1Y' },
                    ] as const
                  ).map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setCmcRange(tf.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold cursor-pointer ${
                        cmcRange === tf.id
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {chartMode === 'tradingview' ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 h-[380px]">
                <iframe
                  key={tvUrl}
                  src={tvUrl}
                  title={`TradingView ${coin.symbol} Candlestick Chart`}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B101C] p-4 h-[380px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-slate-500 dark:text-slate-400">
                    {hoveredPoint ? (
                      <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
                        {hoveredPoint.date} · {formatPrice(hoveredPoint.priceUsd, currency, fxRates)}
                      </span>
                    ) : (
                      <span>Hover across chart to inspect daily historical price</span>
                    )}
                  </div>
                  <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    High: {formatPrice(maxP / (fxRates[currency] || 1), currency, fxRates)} · Low:{' '}
                    {formatPrice(minP / (fxRates[currency] || 1), currency, fxRates)}
                  </div>
                </div>

                {loadingChart ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                    Loading price trend...
                  </div>
                ) : (
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-[290px] overflow-visible"
                    onMouseLeave={() => setHoverIdx(null)}
                    onMouseMove={(e) => {
                      if (historyPoints.length < 2) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const idx = Math.round(relX * (historyPoints.length - 1));
                      setHoverIdx(idx);
                    }}
                  >
                    <defs>
                      <linearGradient id="cmcAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={isPositiveCmc ? '#10b981' : '#f43f5e'}
                          stopOpacity="0.28"
                        />
                        <stop
                          offset="100%"
                          stopColor={isPositiveCmc ? '#10b981' : '#f43f5e'}
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    {[0.2, 0.5, 0.8].map((pct) => (
                      <line
                        key={pct}
                        x1="12"
                        x2={chartW - 12}
                        y1={chartH * pct}
                        y2={chartH * pct}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray="3 3"
                      />
                    ))}

                    {areaPath && <path d={areaPath} fill="url(#cmcAreaGrad)" />}
                    {polyPoints && (
                      <polyline
                        fill="none"
                        stroke={isPositiveCmc ? '#10b981' : '#f43f5e'}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polyPoints}
                      />
                    )}

                    {hoverIdx !== null && prices[hoverIdx] !== undefined && (
                      <g>
                        {(() => {
                          const cx =
                            (hoverIdx / Math.max(1, prices.length - 1)) * (chartW - 24) + 12;
                          const cy =
                            chartH - 20 - ((prices[hoverIdx] - minP) / spanP) * (chartH - 44);
                          return (
                            <>
                              <line
                                x1={cx}
                                x2={cx}
                                y1={12}
                                y2={chartH - 20}
                                stroke="currentColor"
                                className="text-slate-400 dark:text-slate-600"
                                strokeDasharray="3 3"
                              />
                              <circle
                                cx={cx}
                                cy={cy}
                                r="5"
                                fill={isPositiveCmc ? '#10b981' : '#f43f5e'}
                                stroke="#fff"
                                strokeWidth="2"
                              />
                            </>
                          );
                        })()}
                      </g>
                    )}
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* Right 4 cols: Full Live Stats */}
          <div className="lg:col-span-4 space-y-4">
            {/* 24h Range Bar */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131B2E]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>24h Low</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">24h Price Range</span>
                <span>24h High</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${rangePct}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                <span>{formatPrice(coin.low24hUsd, currency, fxRates)}</span>
                <span>{formatPrice(coin.high24hUsd, currency, fxRates)}</span>
              </div>
            </div>

            {/* Key Market Stats */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Market Cap
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatCompactCurrency(coin.marketCapUsd, currency, fxRates)}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Fully Diluted Val (FDV)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatCompactCurrency(coin.fdvUsd, currency, fxRates)}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">24h Trading Volume</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatCompactCurrency(coin.volume24hUsd, currency, fxRates)}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Vol / Market Cap</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {((coin.volume24hUsd / Math.max(1, coin.marketCapUsd)) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Circulating Supply</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatSupply(coin.circulatingSupply)} {coin.symbol}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Max Supply</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {coin.maxSupply ? `${formatSupply(coin.maxSupply)} ${coin.symbol}` : 'Uncapped'}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Market Rank</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  #{coin.rank}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Market Dominance</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {coin.dominancePct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
