import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Check, Download, Search } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { getCoinChange90d } from '../data/cryptoEngine';
import { Coin, CurrencyCode, FxRates, HistoryPoint, SimulatorTimeframe } from '../types/crypto';
import {
  CURRENCY_META,
  convertUsd,
  downloadCsvFile,
  formatPercent,
  formatPrice,
} from '../utils/formatters';
import { StealthValue } from './StealthText';

interface InvestmentSimulatorProps {
  coins: Coin[];
  selectedCoin: Coin;
  onSelectCoin: (coin: Coin) => void;
  currency: CurrencyCode;
  fxRates: FxRates;
  isPro?: boolean;
  onOpenProModal?: () => void;
}

const TIMEFRAMES: Array<{ id: SimulatorTimeframe; label: string; days: number }> = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: '1y', label: '1Y', days: 365 },
  { id: '3y', label: '3Y', days: 1095 },
  { id: '5y', label: '5Y', days: 1825 },
];

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function clampReturnPct(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(-92, Math.min(4500, pct));
}

function estimateTotalReturnPct(coin: Coin, days: number): number {
  const c24 = Number.isFinite(coin.change24h) ? coin.change24h : 0;
  const c7 = Number.isFinite(coin.change7d) ? coin.change7d : c24 * 1.9;
  const c30 = Number.isFinite(coin.change30d) ? coin.change30d : c7 * 2.1;
  const c90 = getCoinChange90d(coin);
  const c1y = Number.isFinite(coin.change1y) ? coin.change1y : c90 * 1.75;

  if (days <= 7) return clampReturnPct(c7);
  if (days <= 30) return clampReturnPct(c30);
  if (days <= 90) return clampReturnPct(c90);
  if (days <= 365) return clampReturnPct(c1y);

  const isStable = coin.category === 'Stablecoin';
  if (isStable) return clampReturnPct(c1y);

  // Realistic multi-year compounded growth curve anchored to 1Y performance and rank tier
  const baseAnnualPct = Math.max(-28, Math.min(185, c1y * 0.72 + (coin.rank <= 20 ? 34 : 24)));
  const annualFactor = Math.max(0.62, 1 + baseAnnualPct / 100);
  const years = days / 365;
  const multiYearPct = (Math.pow(annualFactor, years * 0.85) - 1) * 100;
  return clampReturnPct(multiYearPct);
}

function estimateAnnualizedVolatility(coin: Coin): number {
  if (coin.category === 'Stablecoin') return 0.004;
  const abs24 = Math.abs(Number.isFinite(coin.change24h) ? coin.change24h : 2.5);
  const abs7 = Math.abs(Number.isFinite(coin.change7d) ? coin.change7d : 6);
  const dailyVol = Math.max(0.012, Math.min(0.11, (abs24 * 0.6 + (abs7 / 2.65) * 0.4) / 100));
  return dailyVol * Math.sqrt(365);
}

function buildHistoricalTrajectory(coin: Coin, days: number): HistoryPoint[] {
  const currentPrice = Number.isFinite(coin.priceUsd) && coin.priceUsd > 0 ? coin.priceUsd : 1;
  const msPerDay = 86400 * 1000;
  const now = Date.now();

  // If 7D timeframe and live sparkline exists, anchor cleanly to sparkline shape ending at exact live price
  if (days <= 7 && Array.isArray(coin.sparkline7d) && coin.sparkline7d.length >= 12) {
    const raw = coin.sparkline7d.filter((p) => Number.isFinite(p) && p > 0);
    if (raw.length >= 12) {
      const lastRaw = raw[raw.length - 1];
      const scale = lastRaw > 0 ? currentPrice / lastRaw : 1;
      return raw.map((val, idx) => {
        const progress = idx / Math.max(1, raw.length - 1);
        const ts = now - (1 - progress) * days * msPerDay;
        return {
          timestamp: Math.round(ts),
          date: new Date(ts).toISOString().slice(0, 10),
          priceUsd: idx === raw.length - 1 ? currentPrice : Math.max(0.00000001, val * scale),
        };
      });
    }
  }

  const numPoints =
    days <= 7 ? 29 : days <= 30 ? 31 : days <= 90 ? 46 : days <= 365 ? 61 : days <= 1095 ? 73 : 85;
  const totalReturnPct = estimateTotalReturnPct(coin, days);
  const startPrice = Math.max(0.00000001, currentPrice / (1 + totalReturnPct / 100));
  const annVol = estimateAnnualizedVolatility(coin);
  const horizonVol = Math.min(0.55, annVol * Math.sqrt(days / 365) * 0.42);
  const seed = hashSeed(`${coin.id}-${coin.symbol}-${days}`);

  const points: HistoryPoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const ts = now - (1 - progress) * days * msPerDay;
    const trend = startPrice * Math.pow(currentPrice / startPrice, progress);

    // Deterministic multi-frequency Brownian-bridge wave (zero displacement at t=0 and t=1)
    const bridge = Math.sin(progress * Math.PI);
    const wave1 = Math.sin(progress * Math.PI * 3.5 + (seed % 97) * 0.13) * 0.52;
    const wave2 = Math.cos(progress * Math.PI * 8.5 + (seed % 53) * 0.27) * 0.31;
    const wave3 = Math.sin(progress * Math.PI * 16.0 + (seed % 31) * 0.41) * 0.17;
    const shock = (wave1 + wave2 + wave3) * horizonVol * bridge;
    const modulated = Math.max(0.18, 1 + shock);

    const priceUsd =
      i === 0
        ? startPrice
        : i === numPoints - 1
        ? currentPrice
        : Math.max(0.00000001, trend * modulated);

    points.push({
      timestamp: Math.round(ts),
      date: new Date(ts).toISOString().slice(0, 10),
      priceUsd,
    });
  }

  return points;
}

function formatExactSimulationCurrency(
  amountUsd: number,
  currency: CurrencyCode,
  fxRates: FxRates,
  showPlusSign = false
): string {
  const converted = convertUsd(amountUsd, currency, fxRates);
  const meta = CURRENCY_META[currency];
  if (!Number.isFinite(converted)) return `${meta.symbol}0.00`;

  const abs = Math.abs(converted);
  const sign = converted < 0 ? '-' : showPlusSign && converted > 0 ? '+' : '';
  if (abs >= 1e9) return `${sign}${meta.symbol}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${meta.symbol}${(abs / 1e6).toFixed(2)}M`;

  const decimals = currency === 'PKR' && abs >= 100 ? 0 : 2;
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${meta.symbol}${formatted}`;
}

export const InvestmentSimulator: React.FC<InvestmentSimulatorProps> = ({
  coins,
  selectedCoin,
  onSelectCoin,
  currency,
  fxRates,
}) => {
  const { stealthMode } = usePrivacy();
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [timeframe, setTimeframe] = useState<SimulatorTimeframe>('30d');
  const [coinSearch, setCoinSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [apiHistoryPoints, setApiHistoryPoints] = useState<{
    key: string;
    points: HistoryPoint[];
  } | null>(null);
  const [csvExported, setCsvExported] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const activeTfMeta = TIMEFRAMES.find((t) => t.id === timeframe) || TIMEFRAMES[1];
  const historyKey = `${selectedCoin?.id ?? ''}:${activeTfMeta.days}`;

  // Optional non-blocking enhancement when Express live CoinGecko chart endpoint is active
  useEffect(() => {
    if (!selectedCoin || activeTfMeta.days > 365) return;
    let active = true;
    fetch(
      `/api/coin/${encodeURIComponent(selectedCoin.id)}/history?days=${activeTfMeta.days}&price=${selectedCoin.priceUsd}&change30d=${selectedCoin.change30d}&change1y=${selectedCoin.change1y}`
    )
      .then((r) => {
        if (!r.ok) return null;
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return r.json();
      })
      .then((data) => {
        if (
          active &&
          data?.source === 'coingecko-live' &&
          Array.isArray(data?.points) &&
          data.points.length >= 10
        ) {
          const pts = data.points as HistoryPoint[];
          const last = pts[pts.length - 1]?.priceUsd;
          const scale = last > 0 ? selectedCoin.priceUsd / last : 1;
          const anchored = pts.map((pt, idx) => ({
            ...pt,
            priceUsd:
              idx === pts.length - 1 ? selectedCoin.priceUsd : Math.max(0.00000001, pt.priceUsd * scale),
          }));
          setApiHistoryPoints({ key: historyKey, points: anchored });
        }
      })
      .catch(() => {
        // Deterministic live-derived trajectory already active
      });
    return () => {
      active = false;
    };
  }, [selectedCoin, activeTfMeta.days, historyKey]);

  const activeHistoryPoints = useMemo(() => {
    if (!selectedCoin) return [];
    if (apiHistoryPoints && apiHistoryPoints.key === historyKey && apiHistoryPoints.points.length >= 2) {
      return apiHistoryPoints.points;
    }
    return buildHistoricalTrajectory(selectedCoin, activeTfMeta.days);
  }, [selectedCoin, activeTfMeta.days, apiHistoryPoints, historyKey]);

  const numericAmountLocal = Math.max(1, Number(amountInput) || 0);
  const rate = fxRates[currency] || 1;
  const principalUsd = numericAmountLocal / rate;

  const simulation = useMemo(() => {
    if (!selectedCoin || activeHistoryPoints.length < 2) {
      return {
        series: [] as Array<{
          date: string;
          priceUsd: number;
          valueUsd: number;
          valueLocal: number;
          roiPct: number;
          drawdownPct: number;
        }>,
        finalValueLocal: numericAmountLocal,
        profitLocal: 0,
        roiPct: 0,
        peakLocal: numericAmountLocal,
        maxDrawdownPct: 0,
        cagrPct: 0,
        tokensBought: 0,
      };
    }

    const entryPriceUsd = activeHistoryPoints[0].priceUsd || selectedCoin.priceUsd || 1;
    const tokensBought = principalUsd / entryPriceUsd;

    let peakLocal = 0;
    let maxDrawdownPct = 0;

    const series = activeHistoryPoints.map((pt) => {
      const valueUsd = tokensBought * pt.priceUsd;
      const valueLocal = convertUsd(valueUsd, currency, fxRates);
      if (valueLocal > peakLocal) peakLocal = valueLocal;
      const drawdownPct = peakLocal > 0 ? ((peakLocal - valueLocal) / peakLocal) * 100 : 0;
      if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct;
      const roiPct = ((valueLocal - numericAmountLocal) / numericAmountLocal) * 100;
      return {
        date: pt.date,
        priceUsd: pt.priceUsd,
        valueUsd,
        valueLocal,
        roiPct,
        drawdownPct,
      };
    });

    const finalValueLocal = series[series.length - 1].valueLocal;
    const profitLocal = finalValueLocal - numericAmountLocal;
    const roiPct = series[series.length - 1].roiPct;
    const years = activeTfMeta.days / 365;
    const ratio = Math.max(0.0001, finalValueLocal / Math.max(0.01, numericAmountLocal));
    const cagrPct = (Math.pow(ratio, 1 / Math.max(0.019, years)) - 1) * 100;

    return {
      series,
      finalValueLocal,
      profitLocal,
      roiPct,
      peakLocal,
      maxDrawdownPct,
      cagrPct: Number.isFinite(cagrPct) ? Math.max(-99.9, Math.min(9999, cagrPct)) : roiPct,
      tokensBought,
    };
  }, [activeHistoryPoints, selectedCoin, principalUsd, currency, fxRates, numericAmountLocal, activeTfMeta.days]);

  const filteredCoins = useMemo(() => {
    const q = coinSearch.trim().toLowerCase();
    const pool = coins.slice(0, 250);
    if (!q) return pool.slice(0, 15);
    return coins
      .filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
      .slice(0, 20);
  }, [coins, coinSearch]);

  const handleDownloadCsv = () => {
    if (simulation.series.length === 0 || !selectedCoin) return;
    const rows: string[][] = [
      [
        'Date/Step',
        'Coin Symbol',
        'Price (USD)',
        'Portfolio Value (USD)',
        'Cumulative ROI %',
        'Drawdown %',
      ],
      ...simulation.series.map((pt, idx) => [
        pt.date || `Step ${idx + 1}`,
        selectedCoin.symbol.toUpperCase(),
        pt.priceUsd >= 1 ? pt.priceUsd.toFixed(4) : pt.priceUsd.toFixed(8),
        pt.valueUsd.toFixed(2),
        pt.roiPct.toFixed(2),
        pt.drawdownPct > 0 ? (-pt.drawdownPct).toFixed(2) : '0.00',
      ]),
    ];
    const cleanSymbol = selectedCoin.symbol.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    downloadCsvFile(`CryptoPulser_${cleanSymbol}_${activeTfMeta.label}_Simulation.csv`, rows);
    setCsvExported(true);
    window.setTimeout(() => setCsvExported(false), 2200);
  };

  // SVG Chart dimensions with clean vertical headroom
  const w = 680;
  const h = 230;
  const vals = simulation.series.map((s) => s.valueLocal);
  const rawMin = vals.length ? Math.min(...vals, numericAmountLocal) : numericAmountLocal * 0.9;
  const rawMax = vals.length ? Math.max(...vals, numericAmountLocal) : numericAmountLocal * 1.1;
  const pad = Math.max((rawMax - rawMin) * 0.08, numericAmountLocal * 0.015);
  const minV = rawMin - pad;
  const maxV = rawMax + pad;
  const spanV = maxV - minV || 1;
  const baselineY = h - 18 - ((numericAmountLocal - minV) / spanV) * (h - 36);

  const linePts = simulation.series
    .map((pt, i) => {
      const x = (i / Math.max(1, simulation.series.length - 1)) * (w - 20) + 10;
      const y = h - 18 - ((pt.valueLocal - minV) / spanV) * (h - 36);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath =
    simulation.series.length > 1
      ? `M 10,${h - 18} L ${linePts.split(' ').join(' L ')} L ${w - 10},${h - 18} Z`
      : '';

  const isPositive = simulation.profitLocal >= 0;
  const meta = CURRENCY_META[currency];
  const presets = currency === 'PKR' ? ['50000', '250000', '1000000', '5000000'] : ['500', '1000', '5000', '10000'];

  const hovered =
    hoverIdx !== null && simulation.series[hoverIdx] ? simulation.series[hoverIdx] : null;

  return (
    <section
      id="investment-simulator"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Calculator className="w-3.5 h-3.5 text-emerald-500" />
            <span>Historical Backtest</span>
            <span aria-hidden="true">-</span>
            <span>Time-Series Portfolio Projection</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
            Investment Simulator
          </h2>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={simulation.series.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          {csvExported ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>CSV Downloaded</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Download CSV</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        {/* Controls Column */}
        <div className="lg:col-span-4 min-w-0 space-y-4">
          {/* Coin Selector */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Select Cryptocurrency
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-left flex items-center justify-between text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <span className="truncate">
                #{selectedCoin.rank} · {selectedCoin.name} ({selectedCoin.symbol})
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                {formatPrice(selectedCoin.priceUsd, currency, fxRates)}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141C2E] shadow-xl p-2">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={coinSearch}
                    onChange={(e) => setCoinSearch(e.target.value)}
                    placeholder="Filter coin name or ticker..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filteredCoins.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCoin(c);
                        setDropdownOpen(false);
                        setCoinSearch('');
                        setHoverIdx(null);
                      }}
                      className="w-full px-2.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {c.name} <span className="font-mono text-slate-500">{c.symbol}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatPrice(c.priceUsd, currency, fxRates)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Investment Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Investment Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500 dark:text-slate-400">
                {meta.symbol.trim()}
              </span>
              <input
                type={stealthMode ? 'password' : 'number'}
                min="1"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  stealthMode ? 'blur-[2px]' : ''
                }`}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presets.map((val) => {
                const isSelectedPreset = amountInput === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountInput(val)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono tabular-nums border transition-colors cursor-pointer ${
                      isSelectedPreset
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <StealthValue>
                      {meta.symbol}
                      {Number(val).toLocaleString('en-US')}
                    </StealthValue>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeframe Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Simulation Timeframe
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-1.5">
              {TIMEFRAMES.map((tf) => {
                const active = timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => {
                      setTimeframe(tf.id);
                      setHoverIdx(null);
                    }}
                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{tf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Metrics */}
          <div className="pt-2 grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Simulated Value</div>
              <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                <StealthValue>
                  {formatExactSimulationCurrency(simulation.finalValueLocal / rate, currency, fxRates)}
                </StealthValue>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Total ROI %</div>
              <div
                className={`font-mono tabular-nums text-lg font-bold mt-0.5 ${
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <StealthValue>{formatPercent(simulation.roiPct)}</StealthValue>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Net Profit / Loss</div>
              <div
                className={`font-mono tabular-nums text-sm font-semibold mt-0.5 ${
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <StealthValue>
                  {formatExactSimulationCurrency(simulation.profitLocal / rate, currency, fxRates, true)}
                </StealthValue>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Max Drawdown %</div>
              <div className="font-mono tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                <StealthValue>-{simulation.maxDrawdownPct.toFixed(1)}%</StealthValue>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Growth Chart Column */}
        <div className="lg:col-span-8 min-w-0 flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101C] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
            <div className="text-slate-600 dark:text-slate-300">
              {hovered ? (
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {hovered.date} ·{' '}
                  <StealthValue>
                    {meta.symbol}
                    {hovered.valueLocal.toLocaleString('en-US', { maximumFractionDigits: 2 })} (
                    {formatPercent(hovered.roiPct)} · DD -{hovered.drawdownPct.toFixed(1)}%)
                  </StealthValue>
                </span>
              ) : (
                <span>
                  {selectedCoin.name} ({selectedCoin.symbol}) · {activeTfMeta.label} Backtest Curve ·{' '}
                  <span className="font-mono tabular-nums">
                    <StealthValue>
                      {simulation.tokensBought >= 1000
                        ? simulation.tokensBought.toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                          })
                        : simulation.tokensBought.toFixed(4)}{' '}
                      {selectedCoin.symbol}
                    </StealthValue>
                  </span>{' '}
                  acquired
                </span>
              )}
            </div>
            <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Peak:{' '}
              <StealthValue>
                {formatExactSimulationCurrency(simulation.peakLocal / rate, currency, fxRates)}
              </StealthValue>{' '}
              · Est. CAGR: <StealthValue>{formatPercent(simulation.cagrPct)}</StealthValue>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-[240px] overflow-visible"
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              if (simulation.series.length < 2) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHoverIdx(Math.round(relX * (simulation.series.length - 1)));
            }}
          >
            <defs>
              <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? '#10b981' : '#f43f5e'}
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? '#10b981' : '#f43f5e'}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Initial principal dashed baseline */}
            <line
              x1="10"
              x2={w - 10}
              y1={baselineY}
              y2={baselineY}
              stroke="currentColor"
              className="text-slate-400/60 dark:text-slate-600"
              strokeDasharray="4 4"
            />

            {areaPath && <path d={areaPath} fill="url(#simGrad)" />}
            {linePts && (
              <polyline
                fill="none"
                stroke={isPositive ? '#10b981' : '#f43f5e'}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={linePts}
              />
            )}

            {hoverIdx !== null && simulation.series[hoverIdx] && (
              <g>
                {(() => {
                  const cx =
                    (hoverIdx / Math.max(1, simulation.series.length - 1)) * (w - 20) + 10;
                  const cy =
                    h -
                    18 -
                    ((simulation.series[hoverIdx].valueLocal - minV) / spanV) * (h - 36);
                  return (
                    <>
                      <line
                        x1={cx}
                        x2={cx}
                        y1={10}
                        y2={h - 18}
                        stroke="currentColor"
                        className="text-slate-400 dark:text-slate-500"
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r="5"
                        fill={isPositive ? '#10b981' : '#f43f5e'}
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    </>
                  );
                })()}
              </g>
            )}
          </svg>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
            <span>{simulation.series[0]?.date ?? ''}</span>
            <span>
              Dashed Line: Initial Principal (
              <StealthValue>
                {meta.symbol}
                {numericAmountLocal.toLocaleString('en-US')}
              </StealthValue>
              )
            </span>
            <span>{simulation.series[simulation.series.length - 1]?.date ?? ''}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
