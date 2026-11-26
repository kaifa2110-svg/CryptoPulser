import React, { useMemo, useState } from 'react';
import { Activity, ArrowDownUp, Layers, ShieldAlert } from 'lucide-react';
import { buildCoinLiquidityMap } from '../data/cryptoEngine';
import { Coin, CurrencyCode, FxRates, LiquidityLevel } from '../types/crypto';
import { formatCompactCurrency, formatPrice } from '../utils/formatters';

interface LiquidityMapViewProps {
  coins: Coin[];
  selectedCoin: Coin;
  onSelectCoin: (coin: Coin) => void;
  currency: CurrencyCode;
  fxRates: FxRates;
  onOpenCoinModal: (coin: Coin) => void;
}

export const LiquidityMapView: React.FC<LiquidityMapViewProps> = ({
  coins,
  selectedCoin,
  onSelectCoin,
  currency,
  fxRates,
  onOpenCoinModal,
}) => {
  const [hoveredLevel, setHoveredLevel] = useState<LiquidityLevel | null>(null);

  const liquidityMap = useMemo(() => buildCoinLiquidityMap(selectedCoin), [selectedCoin]);

  const quickCoins = useMemo(
    () => coins.filter((c) => c.category !== 'Stablecoin').slice(0, 10),
    [coins]
  );

  const maxBarSize = useMemo(() => {
    const allSizes = [...liquidityMap.bids, ...liquidityMap.asks].map((l) => l.sizeUsd);
    return Math.max(1, ...allSizes);
  }, [liquidityMap]);

  const maxCumDepth = useMemo(() => {
    const maxBid = liquidityMap.bids[liquidityMap.bids.length - 1]?.cumulativeUsd ?? 1;
    const maxAsk = liquidityMap.asks[liquidityMap.asks.length - 1]?.cumulativeUsd ?? 1;
    return Math.max(1, maxBid, maxAsk);
  }, [liquidityMap]);

  const imbalancePct = useMemo(() => {
    const total = liquidityMap.bidDepth2PctUsd + liquidityMap.askDepth2PctUsd;
    return total > 0 ? (liquidityMap.bidDepth2PctUsd / total) * 100 : 50;
  }, [liquidityMap]);

  // Combined ordered levels from deepest bid (-5.5%) up to mid then highest ask (+5.5%)
  const orderedBids = useMemo(() => [...liquidityMap.bids].reverse(), [liquidityMap]);

  const svgWidth = 860;
  const svgHeight = 250;
  const padX = 28;
  const padY = 24;
  const chartW = svgWidth - padX * 2;
  const chartH = svgHeight - padY * 2;
  const midX = padX + chartW / 2;

  const bidDepthPoints = useMemo(() => {
    const step = (chartW / 2) / Math.max(1, liquidityMap.bids.length);
    const pts = [`${midX},${padY + chartH}`];
    liquidityMap.bids.forEach((b, i) => {
      const x = midX - (i + 1) * step;
      const y = padY + chartH - (b.cumulativeUsd / maxCumDepth) * (chartH - 12);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    const polyPts = [...pts, `${padX},${padY + chartH}`].join(' ');
    const linePts = pts.join(' ');
    return { polyPts, linePts };
  }, [liquidityMap.bids, maxCumDepth, chartW, chartH, midX, padX, padY]);

  const askDepthPoints = useMemo(() => {
    const step = (chartW / 2) / Math.max(1, liquidityMap.asks.length);
    const pts = [`${midX},${padY + chartH}`];
    liquidityMap.asks.forEach((a, i) => {
      const x = midX + (i + 1) * step;
      const y = padY + chartH - (a.cumulativeUsd / maxCumDepth) * (chartH - 12);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    const polyPts = [...pts, `${padX + chartW},${padY + chartH}`].join(' ');
    const linePts = pts.join(' ');
    return { polyPts, linePts };
  }, [liquidityMap.asks, maxCumDepth, chartW, chartH, midX, padX, padY]);

  const focused = hoveredLevel ?? liquidityMap.biggestBidWall;

  return (
    <div className="space-y-5">
      {/* Header & Asset Picker */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Orderbook Depth & Liquidity Wall Heatmap · {selectedCoin.name} ({selectedCoin.symbol})
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Aggregated ±5.5% spot & perpetual orderbook depth clusters showing institutional buy/sell liquidity walls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCoin.id}
              onChange={(e) => {
                const found = coins.find((c) => c.id === e.target.value);
                if (found) onSelectCoin(found);
              }}
              aria-label="Select asset for liquidity map"
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {coins.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.rank} {c.name} ({c.symbol})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onOpenCoinModal(selectedCoin)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/35 text-cyan-600 dark:text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 cursor-pointer"
            >
              Open {selectedCoin.symbol} Chart Modal
            </button>
          </div>
        </div>

        {/* Quick Coin Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {quickCoins.map((c) => {
            const active = c.id === selectedCoin.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCoin(c)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c.symbol}
              </button>
            );
          })}
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Spot Mid Price / Spread</div>
            <div className="mt-1 font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-100">
              {formatPrice(liquidityMap.midPriceUsd, currency, fxRates)}
            </div>
            <div className="text-[10px] font-mono text-cyan-500 mt-0.5">
              Spread: {liquidityMap.spreadBps} bps
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Biggest Bid Support Wall</div>
            <div className="mt-1 font-mono tabular-nums text-base font-bold text-emerald-500">
              {formatPrice(liquidityMap.biggestBidWall.priceUsd, currency, fxRates)}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              Size: {formatCompactCurrency(liquidityMap.biggestBidWall.sizeUsd, currency, fxRates)}{' '}
              ({liquidityMap.biggestBidWall.distancePct.toFixed(2)}%)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Biggest Ask Resistance Wall</div>
            <div className="mt-1 font-mono tabular-nums text-base font-bold text-rose-500">
              {formatPrice(liquidityMap.biggestAskWall.priceUsd, currency, fxRates)}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              Size: {formatCompactCurrency(liquidityMap.biggestAskWall.sizeUsd, currency, fxRates)}{' '}
              (+{liquidityMap.biggestAskWall.distancePct.toFixed(2)}%)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowDownUp className="w-3 h-3 text-cyan-500" />
              <span>±2% Depth Imbalance</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-rose-500/30 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${imbalancePct.toFixed(1)}%` }} />
              <div className="h-full bg-rose-500" style={{ width: `${(100 - imbalancePct).toFixed(1)}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
              <span className="text-emerald-500">
                Bids {imbalancePct.toFixed(0)}% ({formatCompactCurrency(liquidityMap.bidDepth2PctUsd, currency, fxRates)})
              </span>
              <span className="text-rose-500">Asks {(100 - imbalancePct).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive SVG Cumulative Depth Curve + Cluster Walls */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Interactive Cumulative Liquidity Depth & Wall Histogram (±5.5%)</span>
          </div>
          {focused && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className={focused.side === 'bid' ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                {focused.side === 'bid' ? 'BID CLUSTER' : 'ASK CLUSTER'}
              </span>
              <span>
                Price: {formatPrice(focused.priceUsd, currency, fxRates)} ({focused.distancePct > 0 ? '+' : ''}{focused.distancePct.toFixed(2)}%)
              </span>
              <span>
                Resting Size: {formatCompactCurrency(focused.sizeUsd, currency, fxRates)}
              </span>
              {focused.clusterLabel && (
                <span className="text-amber-500 font-semibold">{focused.clusterLabel}</span>
              )}
            </div>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[620px] h-64 select-none"
            role="img"
            aria-label={`Liquidity depth chart for ${selectedCoin.symbol}`}
          >
            <defs>
              <linearGradient id="bidDepthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id="askDepthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[0.25, 0.5, 0.75, 1].map((t) => {
              const y = padY + chartH * (1 - t);
              return (
                <line
                  key={t}
                  x1={padX}
                  x2={padX + chartW}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800/80"
                  strokeDasharray="3 4"
                />
              );
            })}

            {/* Center mid price divider */}
            <line
              x1={midX}
              x2={midX}
              y1={padY}
              y2={padY + chartH}
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={midX}
              y={14}
              textAnchor="middle"
              className="fill-cyan-500 font-mono text-[10px] font-bold"
            >
              MID {formatPrice(liquidityMap.midPriceUsd, currency, fxRates)}
            </text>

            {/* Cumulative Bid / Ask Areas */}
            <polygon points={bidDepthPoints.polyPts} fill="url(#bidDepthGrad)" />
            <polyline
              points={bidDepthPoints.linePts}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
            />

            <polygon points={askDepthPoints.polyPts} fill="url(#askDepthGrad)" />
            <polyline
              points={askDepthPoints.linePts}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.2"
            />

            {/* Wall Histogram Bars (Bids Left, Asks Right) */}
            {liquidityMap.bids.map((b, i) => {
              const step = (chartW / 2) / liquidityMap.bids.length;
              const x = midX - (i + 1) * step;
              const barH = (b.sizeUsd / maxBarSize) * (chartH * 0.52);
              return (
                <g
                  key={`bid-${i}`}
                  onMouseEnter={() => setHoveredLevel(b)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x - 7}
                    y={padY + chartH - barH}
                    width={14}
                    height={barH}
                    rx={2}
                    fill={b.isWall ? '#34d399' : '#10b981'}
                    opacity={b.isWall ? 0.92 : 0.45}
                  />
                  {b.isWall && (
                    <circle cx={x} cy={padY + chartH - barH - 6} r={3.5} fill="#fbbf24" />
                  )}
                </g>
              );
            })}

            {liquidityMap.asks.map((a, i) => {
              const step = (chartW / 2) / liquidityMap.asks.length;
              const x = midX + (i + 1) * step;
              const barH = (a.sizeUsd / maxBarSize) * (chartH * 0.52);
              return (
                <g
                  key={`ask-${i}`}
                  onMouseEnter={() => setHoveredLevel(a)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x - 7}
                    y={padY + chartH - barH}
                    width={14}
                    height={barH}
                    rx={2}
                    fill={a.isWall ? '#fb7185' : '#f43f5e'}
                    opacity={a.isWall ? 0.92 : 0.45}
                  />
                  {a.isWall && (
                    <circle cx={x} cy={padY + chartH - barH - 6} r={3.5} fill="#fbbf24" />
                  )}
                </g>
              );
            })}

            {/* Axis Labels */}
            <text x={padX} y={svgHeight - 4} className="fill-slate-400 font-mono text-[10px]">
              -5.5% Support
            </text>
            <text
              x={midX}
              y={svgHeight - 4}
              textAnchor="middle"
              className="fill-slate-400 font-mono text-[10px]"
            >
              0.0% Spread
            </text>
            <text
              x={padX + chartW}
              y={svgHeight - 4}
              textAnchor="end"
              className="fill-slate-400 font-mono text-[10px]"
            >
              +5.5% Resistance
            </text>
          </svg>
        </div>
      </div>

      {/* Side-by-side Orderbook Wall Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bids Ladder */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500">Buy Liquidity Walls (Bids)</span>
            <span className="text-[11px] font-mono text-slate-400">Hover row to highlight</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {orderedBids.slice().reverse().map((b, idx) => {
              const widthPct = Math.max(6, (b.sizeUsd / maxBarSize) * 100);
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredLevel(b)}
                  className="relative px-4 py-2 flex items-center justify-between text-xs font-mono hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-emerald-500/12 pointer-events-none"
                    style={{ width: `${widthPct.toFixed(1)}%` }}
                  />
                  <div className="relative flex items-center gap-2">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatPrice(b.priceUsd, currency, fxRates)}
                    </span>
                    <span className="text-[10px] text-slate-400">{b.distancePct.toFixed(2)}%</span>
                    {b.isWall && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[10px] font-semibold">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        Wall
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center gap-4 tabular-nums">
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">
                      {formatCompactCurrency(b.sizeUsd, currency, fxRates)}
                    </span>
                    <span className="text-slate-400 w-20 text-right hidden sm:inline">
                      {formatCompactCurrency(b.cumulativeUsd, currency, fxRates)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asks Ladder */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-500">Sell Liquidity Walls (Asks)</span>
            <span className="text-[11px] font-mono text-slate-400">Size · Cumulative</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {liquidityMap.asks.map((a, idx) => {
              const widthPct = Math.max(6, (a.sizeUsd / maxBarSize) * 100);
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredLevel(a)}
                  className="relative px-4 py-2 flex items-center justify-between text-xs font-mono hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-rose-500/12 pointer-events-none"
                    style={{ width: `${widthPct.toFixed(1)}%` }}
                  />
                  <div className="relative flex items-center gap-2">
                    <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatPrice(a.priceUsd, currency, fxRates)}
                    </span>
                    <span className="text-[10px] text-slate-400">+{a.distancePct.toFixed(2)}%</span>
                    {a.isWall && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[10px] font-semibold">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        Wall
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center gap-4 tabular-nums">
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">
                      {formatCompactCurrency(a.sizeUsd, currency, fxRates)}
                    </span>
                    <span className="text-slate-400 w-20 text-right hidden sm:inline">
                      {formatCompactCurrency(a.cumulativeUsd, currency, fxRates)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
