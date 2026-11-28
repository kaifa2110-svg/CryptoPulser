import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CandlestickChart,
  CheckCircle2,
  LineChart,
  Maximize2,
  Minimize2,
  Radar,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingDown,
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
import { computeFomoAnalysis } from './AntiFomoGuardModal';
import { CoinLogo } from './CoinLogo';
import { CoinMarketsTab } from './CoinMarketsTab';
import { ProCandlestickChart } from './ProCandlestickChart';

interface CoinDetailModalProps {
  coin: Coin | null;
  allCoins?: Coin[];
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

type ModalTab = 'overview' | 'markets' | 'anti_fomo' | 'ai';
type ChartMode = 'tradingview' | 'cmc';
type CmcRange = '7' | '30' | '90' | '365';

const VERIFIED_TV_CRYPTO_ONLY = new Set([
  'USDT', 'USDC', 'DAI', 'OKB', 'XMR', 'KAS', 'CORE', 'CRO',
  'MATIC', 'FTM', 'EOS', 'OMG', 'AKT',
]);

const VERIFIED_TV_BINANCE = new Set([
  'BTC', 'ETH', 'XRP', 'BNB', 'SOL', 'DOGE', 'ADA', 'TRX', 'AVAX', 'SHIB',
  'TON', 'LINK', 'DOT', 'BCH', 'NEAR', 'POL', 'LTC', 'UNI', 'ICP', 'APT',
  'ETC', 'RENDER', 'FET', 'SUI', 'PEPE', 'ARB', 'OP', 'ATOM', 'XLM', 'FIL',
  'IMX', 'INJ', 'HBAR', 'VET', 'MKR', 'GRT', 'RUNE', 'ALGO', 'AAVE', 'TIA',
  'SEI', 'JUP', 'WIF', 'BONK', 'FLOKI', 'GALA', 'SAND', 'MANA', 'AXS', 'THETA',
  'EGLD', 'FLOW', 'QNT', 'CHZ', 'XTZ', 'NEO', 'KAVA', 'ZEC', 'DASH', 'COMP',
  'SNX', 'CRV', '1INCH', 'ENJ', 'BAT', 'ZRX', 'WLD', 'STRK', 'PYTH', 'JTO',
  'ONDO', 'ENA', 'W', 'PENDLE', 'AR', 'JASMY', 'BOME', 'NOT', 'IO', 'ZK',
  'ZRO', 'EIGEN', 'TAO', 'STX', 'LDO', 'ENS', 'DYDX', 'GMX', 'CAKE', 'ORDI',
  'PAXG', 'S', 'TRUMP', 'PENGU',
]);

function resolveTradingViewSymbol(symbol?: string): { supported: boolean; tvSymbol: string } {
  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) return { supported: false, tvSymbol: '' };
  if (VERIFIED_TV_CRYPTO_ONLY.has(sym)) {
    return { supported: true, tvSymbol: `CRYPTO:${sym}USD` };
  }
  if (VERIFIED_TV_BINANCE.has(sym)) {
    return { supported: true, tvSymbol: `BINANCE:${sym}USDT` };
  }
  return { supported: false, tvSymbol: '' };
}

export const CoinDetailModal: React.FC<CoinDetailModalProps> = ({
  coin,
  allCoins = [],
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
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  const [chartMode, setChartMode] = useState<ChartMode>('tradingview');
  const [cmcRange, setCmcRange] = useState<CmcRange>('30');
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const prevCoinIdRef = React.useRef<string | null>(null);

  // Reset tab to overview ONLY when switching to a DIFFERENT coin
  const coinId = coin?.id;
  useEffect(() => {
    if (!coinId) {
      setIsFullScreen(false);
      prevCoinIdRef.current = null;
      return;
    }
    if (prevCoinIdRef.current !== coinId) {
      prevCoinIdRef.current = coinId;
      setActiveTab('overview');
      if (coin) {
        recordLookup('Coin Detail', `${coin.name} (${coin.symbol})`);
      }
    }
  }, [coinId, coin, recordLookup]);

  // Handle ESC key listener without resetting activeTab
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen, onClose]);

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

  const tvSymbolInfo = useMemo(() => {
    return resolveTradingViewSymbol(coin?.symbol);
  }, [coin?.symbol]);

  const tvUrl = useMemo(() => {
    if (!coin || !tvSymbolInfo.supported) return '';
    const theme = isDark ? 'dark' : 'light';
    return `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(
      tvSymbolInfo.tvSymbol
    )}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=${
      isDark ? '0f172a' : 'f8fafc'
    }&studies=[]&theme=${theme}&style=1&timezone=Etc%2FUTC&withdateranges=1`;
  }, [coin, tvSymbolInfo, isDark]);

  const fomoAnalysis = useMemo(() => {
    if (!coin) return null;
    return computeFomoAnalysis(coin, allCoins);
  }, [coin, allCoins]);

  if (!coin) return null;

  const rangeSpan = Math.max(0.0000001, coin.high24hUsd - coin.low24hUsd);
  const rangePct = Math.min(
    100,
    Math.max(0, ((coin.priceUsd - coin.low24hUsd) / rangeSpan) * 100)
  );

  // CMC chart geometry
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm ${
        isFullScreen ? 'p-0' : 'p-2 sm:p-5'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-[#0E1422] shadow-2xl flex flex-col ${
          isFullScreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0 overflow-hidden'
            : 'w-full max-w-5xl max-h-[94vh] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-[#0E1422]">
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
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onToggleWatchlist(coin.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{isStarred ? 'Watchlisted' : 'Watchlist'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAlertForCoin(coin)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 text-xs font-medium text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold transition-colors cursor-pointer"
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
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
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
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Radar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bubble Radar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen((fs) => !fs)}
              aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen View'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isFullScreen
                  ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullScreen ? 'Exit Full' : 'Full Screen'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="relative z-20 pointer-events-auto px-5 pt-2 pb-0 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0 bg-slate-50/70 dark:bg-[#0C121F]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('overview');
            }}
            className={`relative z-20 pointer-events-auto select-none touch-manipulation inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-slate-900 dark:text-white bg-white dark:bg-slate-800/80 rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CandlestickChart className="w-4 h-4 text-emerald-500" />
            <span>Overview & Chart</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('markets');
            }}
            className={`relative z-20 pointer-events-auto select-none touch-manipulation inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'markets'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-300'
            }`}
          >
            <Building2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span>Markets & Exchanges</span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
              CEX · DEX
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('anti_fomo');
            }}
            className={`relative z-20 pointer-events-auto select-none touch-manipulation inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'anti_fomo'
                ? 'border-amber-500 text-amber-600 dark:text-amber-300 bg-amber-500/10 rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Anti-FOMO Guard</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('ai')}
            }
            className={`relative z-20 pointer-events-auto select-none touch-manipulation inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-purple-500 text-purple-600 dark:text-purple-300 bg-purple-500/10 rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>AI Intelligence</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* TAB 1: OVERVIEW & CHART */}
          {activeTab === 'overview' && (
            <div
              className={`p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 ${
                isFullScreen ? 'h-full min-h-0' : ''
              }`}
            >
              {/* Left Chart Column */}
              <div
                className={`space-y-3 ${
                  isFullScreen
                    ? 'lg:col-span-9 flex flex-col min-h-0 h-full'
                    : 'lg:col-span-8'
                }`}
              >
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
                      <span>Pro Candlestick</span>
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
                    tvSymbolInfo.supported ? (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        TradingView: {tvSymbolInfo.tvSymbol}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live OHLC · {coin.symbol.toUpperCase()}/USD (CMC Anchored)
                      </span>
                    )
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
                  tvSymbolInfo.supported ? (
                    <div
                      className={`rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 ${
                        isFullScreen ? 'flex-1 min-h-[500px] lg:min-h-0' : 'h-[380px]'
                      }`}
                    >
                      <iframe
                        key={tvUrl}
                        src={tvUrl}
                        title={`TradingView ${coin.symbol} Candlestick Chart`}
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <ProCandlestickChart
                      coin={coin}
                      currency={currency}
                      fxRates={fxRates}
                      isDark={isDark}
                      isFullScreen={isFullScreen}
                    />
                  )
                ) : (
                  <div
                    className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B101C] p-4 flex flex-col justify-between ${
                      isFullScreen ? 'flex-1 min-h-[500px] lg:min-h-0' : 'h-[380px]'
                    }`}
                  >
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
                        className={`w-full overflow-visible ${
                          isFullScreen ? 'flex-1 min-h-[380px] h-full' : 'h-[290px]'
                        }`}
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

              {/* Right Live Stats Column */}
              <div
                className={`space-y-4 ${
                  isFullScreen ? 'lg:col-span-3 lg:overflow-y-auto lg:pr-1' : 'lg:col-span-4'
                }`}
              >
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
          )}

          {/* TAB 2: MARKETS & EXCHANGES */}
          {activeTab === 'markets' && (
            <div className="p-5">
              <CoinMarketsTab coin={coin} currency={currency} fxRates={fxRates} />
            </div>
          )}

          {/* TAB 3: ANTI-FOMO GUARD */}
          {activeTab === 'anti_fomo' && fomoAnalysis && (
            <div className="p-5 space-y-5 max-w-4xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101C]">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Anti-FOMO Guard Risk Rating
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Multi-factor evaluation guarding against exit-liquidity traps and vertical pump chasing.
                  </p>
                </div>

                {onOpenAntiFomoGuard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAntiFomoGuard(coin);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>Launch Full Anti-FOMO Terminal</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Score & Verdict Card */}
              <div
                className={`p-5 rounded-xl border ${
                  fomoAnalysis.tone === 'rose'
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : fomoAnalysis.tone === 'amber'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-emerald-500/30 bg-emerald-500/5'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
                      fomoAnalysis.tone === 'rose'
                        ? 'border-rose-500/30 bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : fomoAnalysis.tone === 'amber'
                        ? 'border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {fomoAnalysis.verdict}
                  </span>
                  <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white">
                    Risk Score: {fomoAnalysis.score} / 100
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fomoAnalysis.tone === 'rose'
                        ? 'bg-rose-500'
                        : fomoAnalysis.tone === 'amber'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${fomoAnalysis.score}%` }}
                  />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {fomoAnalysis.explanation}
                </p>
              </div>

              {/* 4 Risk Factors Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span>24h Pump Velocity</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {fomoAnalysis.pump24hRisk.toFixed(0)} / 34 pts
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {formatPercent(coin.change24h)} 24h Move
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span>7d Momentum Stretch</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {fomoAnalysis.momentum7dRisk.toFixed(0)} / 28 pts
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {formatPercent(coin.change7d)} 7d Move
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span>Turnover Frenzy (Vol/MCap)</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {fomoAnalysis.volFrenzyRisk.toFixed(0)} / 20 pts
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {fomoAnalysis.volToMcapPct.toFixed(1)}% Turnover
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span>Whale Inflow Pressure</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {fomoAnalysis.whaleInflowRisk.toFixed(0)} / 18 pts
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {fomoAnalysis.whaleInflowSharePct.toFixed(1)}% Inflow Share
                  </div>
                </div>
              </div>

              {/* Recommended Dip Accumulation Zone */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Suggested Dip Accumulation Zone</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Target DCA entry level ({fomoAnalysis.dipDiscountPct.toFixed(1)}% discount from current price):
                  </p>
                </div>
                <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                  {formatPrice(fomoAnalysis.dipLowUsd, currency, fxRates)} –{' '}
                  {formatPrice(fomoAnalysis.dipHighUsd, currency, fxRates)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI INTELLIGENCE */}
          {activeTab === 'ai' && (
            <div className="p-5 space-y-5 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    CryptoPulser AI Copilot · {coin.name} Intelligence
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time market structure, order book liquidity, and technical levels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Technical Momentum Bias
                  </div>
                  <div className="font-display font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {coin.change24h >= 2 && coin.change7d >= 5
                      ? 'Bullish Expansion'
                      : coin.change24h <= -2 && coin.change7d <= -5
                      ? 'Bearish Retracement'
                      : 'Rangebound Consolidation'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    24h: {formatPercent(coin.change24h)} · 7d: {formatPercent(coin.change7d)}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Dynamic Key Resistance
                  </div>
                  <div className="font-mono tabular-nums font-bold text-base text-rose-600 dark:text-rose-400 mt-1">
                    {formatPrice(coin.high24hUsd * 1.018, currency, fxRates)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">24h High Breakout Target</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Dynamic Key Support
                  </div>
                  <div className="font-mono tabular-nums font-bold text-base text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatPrice(coin.low24hUsd * 0.982, currency, fxRates)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Order Book Demand Zone</div>
                </div>
              </div>

              {/* Derivatives & Liquidation Exposure */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111728]">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">
                  Derivatives & Liquidity Telemetry
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Open Interest</span>
                    <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatCompactCurrency(coin.openInterestUsd, currency, fxRates)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Funding Rate</span>
                    <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                      {coin.fundingRatePct.toFixed(4)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">24h Long Liq</span>
                    <div className="font-mono tabular-nums font-bold text-rose-500 mt-0.5">
                      {formatCompactCurrency(coin.longLiq24hUsd, currency, fxRates)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">24h Short Liq</span>
                    <div className="font-mono tabular-nums font-bold text-emerald-500 mt-0.5">
                      {formatCompactCurrency(coin.shortLiq24hUsd, currency, fxRates)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
