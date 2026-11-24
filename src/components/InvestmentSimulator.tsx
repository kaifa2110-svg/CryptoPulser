import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Download, Lock, Search } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { Coin, CurrencyCode, FxRates, HistoryPoint, SimulatorTimeframe } from '../types/crypto';
import {
  CURRENCY_META,
  convertUsd,
  downloadCsvFile,
  formatCompactCurrency,
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
  isPro: boolean;
  onOpenProModal: () => void;
}

const TIMEFRAMES: Array<{ id: SimulatorTimeframe; label: string; days: number; proOnly?: boolean }> = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90, proOnly: true },
  { id: '1y', label: '1Y', days: 365, proOnly: true },
  { id: '3y', label: '3Y', days: 1095, proOnly: true },
  { id: '5y', label: '5Y', days: 1825, proOnly: true },
];

export const InvestmentSimulator: React.FC<InvestmentSimulatorProps> = ({
  coins,
  selectedCoin,
  onSelectCoin,
  currency,
  fxRates,
  isPro,
  onOpenProModal,
}) => {
  const { stealthMode } = usePrivacy();
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [timeframe, setTimeframe] = useState<SimulatorTimeframe>('30d');
  const [coinSearch, setCoinSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const effectiveTimeframe: SimulatorTimeframe =
    !isPro && timeframe !== '7d' && timeframe !== '30d' ? '30d' : timeframe;

  const activeTfMeta = TIMEFRAMES.find((t) => t.id === effectiveTimeframe) || TIMEFRAMES[1];

  useEffect(() => {
    if (!selectedCoin) return;
    let active = true;
    setLoading(true);
    fetch(
      `/api/coin/${encodeURIComponent(selectedCoin.id)}/history?days=${activeTfMeta.days}&price=${selectedCoin.priceUsd}&change30d=${selectedCoin.change30d}&change1y=${selectedCoin.change1y}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data?.points)) {
          setHistoryPoints(data.points);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCoin, activeTfMeta.days]);

  const numericAmountLocal = Math.max(1, Number(amountInput) || 0);
  const rate = fxRates[currency] || 1;
  const principalUsd = numericAmountLocal / rate;

  const simulation = useMemo(() => {
    if (historyPoints.length < 2) {
      return {
        series: [] as Array<{ date: string; priceUsd: number; valueLocal: number; roiPct: number }>,
        finalValueLocal: numericAmountLocal,
        profitLocal: 0,
        roiPct: 0,
        peakLocal: numericAmountLocal,
        maxDrawdownPct: 0,
        cagrPct: 0,
        tokensBought: 0,
      };
    }

    const entryPriceUsd = historyPoints[0].priceUsd || selectedCoin.priceUsd;
    const tokensBought = principalUsd / entryPriceUsd;

    let peakLocal = 0;
    let maxDrawdownPct = 0;

    const series = historyPoints.map((pt) => {
      const valueUsd = tokensBought * pt.priceUsd;
      const valueLocal = convertUsd(valueUsd, currency, fxRates);
      if (valueLocal > peakLocal) peakLocal = valueLocal;
      const drawdown = peakLocal > 0 ? ((peakLocal - valueLocal) / peakLocal) * 100 : 0;
      if (drawdown > maxDrawdownPct) maxDrawdownPct = drawdown;
      const roiPct = ((valueLocal - numericAmountLocal) / numericAmountLocal) * 100;
      return {
        date: pt.date,
        priceUsd: pt.priceUsd,
        valueLocal,
        roiPct,
      };
    });

    const finalValueLocal = series[series.length - 1].valueLocal;
    const profitLocal = finalValueLocal - numericAmountLocal;
    const roiPct = series[series.length - 1].roiPct;
    const years = activeTfMeta.days / 365;
    const ratio = finalValueLocal / Math.max(0.01, numericAmountLocal);
    const cagrPct = (Math.pow(ratio, 1 / Math.max(0.05, years)) - 1) * 100;

    return {
      series,
      finalValueLocal,
      profitLocal,
      roiPct,
      peakLocal,
      maxDrawdownPct,
      cagrPct,
      tokensBought,
    };
  }, [historyPoints, selectedCoin.priceUsd, principalUsd, currency, fxRates, numericAmountLocal, activeTfMeta.days]);

  const filteredCoins = useMemo(() => {
    const q = coinSearch.trim().toLowerCase();
    const pool = coins.slice(0, 250);
    if (!q) return pool.slice(0, 12);
    return coins
      .filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
      .slice(0, 15);
  }, [coins, coinSearch]);

  const handleDownloadCsv = () => {
    if (simulation.series.length === 0) return;
    const rows: string[][] = [
      [
        'Date',
        'Asset',
        'Symbol',
        `Asset Price (${currency})`,
        'Units Held',
        `Portfolio Value (${currency})`,
        'Cumulative ROI (%)',
      ],
      ...simulation.series.map((pt) => [
        pt.date,
        selectedCoin.name,
        selectedCoin.symbol,
        convertUsd(pt.priceUsd, currency, fxRates).toFixed(4),
        simulation.tokensBought.toFixed(6),
        pt.valueLocal.toFixed(2),
        pt.roiPct.toFixed(2),
      ]),
    ];
    downloadCsvFile(
      `crypto-pulser-sim-${selectedCoin.symbol.toLowerCase()}-${effectiveTimeframe}-${currency.toLowerCase()}.csv`,
      rows
    );
  };

  // Chart dimensions
  const w = 680;
  const h = 230;
  const vals = simulation.series.map((s) => s.valueLocal);
  const minV = vals.length ? Math.min(...vals, numericAmountLocal) : 0;
  const maxV = vals.length ? Math.max(...vals, numericAmountLocal) : 100;
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
  const presets = currency === 'PKR' ? ['50000', '250000', '1000000'] : ['500', '1000', '5000', '10000'];

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
            <span>Historical Backtester</span>
            <span aria-hidden="true">·</span>
            <span>Time-Series Portfolio Projection</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
            Investment Simulator
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isPro) {
              onOpenProModal();
              return;
            }
            handleDownloadCsv();
          }}
          disabled={isPro && simulation.series.length === 0}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0 ${
            isPro
              ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
          }`}
        >
          {isPro ? (
            <Download className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span>{isPro ? 'Download CSV' : 'Download CSV (Pro)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-4">
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
                <StealthValue>{formatPrice(selectedCoin.priceUsd, currency, fxRates)}</StealthValue>
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
                      }}
                      className="w-full px-2.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {c.name} <span className="font-mono text-slate-500">{c.symbol}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        <StealthValue>{formatPrice(c.priceUsd, currency, fxRates)}</StealthValue>
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
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(val)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono tabular-nums border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <StealthValue>
                    {meta.symbol}
                    {Number(val).toLocaleString('en-US')}
                  </StealthValue>
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Simulation Timeframe
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-1.5">
              {TIMEFRAMES.map((tf) => {
                const locked = tf.proOnly && !isPro;
                const active = effectiveTimeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        onOpenProModal();
                      } else {
                        setTimeframe(tf.id);
                      }
                    }}
                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-500'
                        : locked
                        ? 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {locked && <Lock className="w-3 h-3" />}
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
                  {formatCompactCurrency(simulation.finalValueLocal / rate, currency, fxRates)}
                </StealthValue>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Total ROI</div>
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
                  {simulation.profitLocal >= 0 ? '+' : ''}
                  {formatCompactCurrency(simulation.profitLocal / rate, currency, fxRates)}
                </StealthValue>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Max Drawdown</div>
              <div className="font-mono tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                <StealthValue>-{simulation.maxDrawdownPct.toFixed(1)}%</StealthValue>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Growth Chart Column */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101C] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
            <div className="text-slate-600 dark:text-slate-300">
              {hovered ? (
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {hovered.date} ·{' '}
                  <StealthValue>
                    {meta.symbol}
                    {hovered.valueLocal.toLocaleString('en-US', { maximumFractionDigits: 2 })} (
                    {formatPercent(hovered.roiPct)})
                  </StealthValue>
                </span>
              ) : (
                <span>
                  {selectedCoin.name} ({selectedCoin.symbol}) · {activeTfMeta.label} Backtest Curve ·{' '}
                  <span className="font-mono tabular-nums">
                    <StealthValue>
                      {simulation.tokensBought.toFixed(4)} {selectedCoin.symbol}
                    </StealthValue>
                  </span>{' '}
                  acquired
                </span>
              )}
            </div>
            <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Peak:{' '}
              <StealthValue>
                {meta.symbol}
                {simulation.peakLocal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </StealthValue>{' '}
              · Est. CAGR: <StealthValue>{formatPercent(simulation.cagrPct)}</StealthValue>
            </div>
          </div>

          {loading ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-slate-400">
              Calculating historical growth series...
            </div>
          ) : (
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
                className="text-slate-400/50 dark:text-slate-600"
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
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
            <span>{simulation.series[0]?.date ?? ''}</span>
            <span>
              Dashed line: Initial Principal (
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
