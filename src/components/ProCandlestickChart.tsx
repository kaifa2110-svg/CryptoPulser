import React, { useMemo, useState } from 'react';
import { CandlestickChart, LineChart } from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import {
  convertUsd,
  formatCompactCurrency,
  formatPercent,
  formatPrice,
} from '../utils/formatters';

interface ProCandlestickChartProps {
  coin: Coin;
  currency: CurrencyCode;
  fxRates: FxRates;
  isDark: boolean;
  isFullScreen?: boolean;
}

type ProTimeframe = '1H' | '24H' | '7D' | '30D' | '90D';
type ProChartStyle = 'candles' | 'area';

interface OhlcCandle {
  index: number;
  label: string;
  shortLabel: string;
  openUsd: number;
  highUsd: number;
  lowUsd: number;
  closeUsd: number;
  volumeUsd: number;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function formatAxisLabel(date: Date, tf: ProTimeframe): { full: string; short: string } {
  if (tf === '1H' || tf === '24H') {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const mon = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return {
      full: `${mon} ${day}, ${hh}:${mm}`,
      short: `${hh}:${mm}`,
    };
  }
  const mon = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  if (tf === '7D') {
    const hh = String(date.getHours()).padStart(2, '0');
    return {
      full: `${mon} ${day}, ${hh}:00`,
      short: `${mon} ${day}`,
    };
  }
  return {
    full: `${mon} ${day}, ${date.getFullYear()}`,
    short: `${mon} ${day}`,
  };
}

function buildOhlcSeries(coin: Coin, tf: ProTimeframe): {
  candles: OhlcCandle[];
  periodPct: number;
} {
  const currentPrice = Math.max(1e-8, coin.priceUsd || 1);
  const rawChange =
    tf === '1H'
      ? coin.change1h
      : tf === '24H'
      ? coin.change24h
      : tf === '7D'
      ? coin.change7d
      : tf === '30D'
      ? coin.change30d
      : typeof coin.change90d === 'number'
      ? coin.change90d
      : coin.change30d * 1.65;

  const clampedPct = Math.max(-85, Math.min(600, Number.isFinite(rawChange) ? rawChange : 0));
  const startPrice = currentPrice / Math.max(0.1, 1 + clampedPct / 100);

  const count = tf === '1H' ? 30 : tf === '24H' ? 48 : tf === '7D' ? 42 : 45;
  const stepMs =
    tf === '1H'
      ? 2 * 60_000
      : tf === '24H'
      ? 30 * 60_000
      : tf === '7D'
      ? 4 * 3600_000
      : tf === '30D'
      ? 16 * 3600_000
      : 48 * 3600_000;

  const rng = createRng(hashSeed(`${coin.id}:${tf}`));
  const baseVol = Math.max(25_000, coin.volume24hUsd || 500_000);
  const perCandleVolBase =
    tf === '1H'
      ? baseVol / 24 / count
      : tf === '24H'
      ? baseVol / count
      : baseVol * (tf === '7D' ? 0.16 : tf === '30D' ? 0.62 : 1.8);

  // Build Brownian bridge path from startPrice to currentPrice
  const closes: number[] = [];
  const baseVolatility = Math.min(
    0.045,
    Math.max(0.0035, (Math.abs(clampedPct) / 100) * 0.24 + (tf === '1H' ? 0.004 : 0.011))
  );

  // Optional 7D sparkline guidance
  const spark = Array.isArray(coin.sparkline7d) && coin.sparkline7d.length >= 6 ? coin.sparkline7d : null;

  let walk = 0;
  const rawWalks: number[] = [];
  for (let i = 0; i <= count; i++) {
    rawWalks.push(walk);
    walk += (rng() - 0.5) * 2 * baseVolatility;
  }

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    // Bridge removes end drift so i=0 is 0 and i=count is 0
    const bridgeOffset = rawWalks[i] - rawWalks[0] - t * (rawWalks[count] - rawWalks[0]);
    let baseTrend = startPrice * Math.pow(currentPrice / startPrice, t);

    if (tf === '7D' && spark) {
      const sparkPos = t * (spark.length - 1);
      const lo = Math.floor(sparkPos);
      const hi = Math.min(spark.length - 1, lo + 1);
      const frac = sparkPos - lo;
      const sparkVal = spark[lo] * (1 - frac) + spark[hi] * frac;
      const sparkEnd = spark[spark.length - 1] || currentPrice;
      const normalizedSpark = sparkEnd > 0 ? sparkVal * (currentPrice / sparkEnd) : baseTrend;
      baseTrend = baseTrend * 0.35 + normalizedSpark * 0.65;
    }

    const pricePoint = Math.max(1e-8, baseTrend * (1 + bridgeOffset));
    closes.push(pricePoint);
  }
  closes[0] = startPrice;
  closes[count] = currentPrice;

  const nowMs = Date.now();
  const candles: OhlcCandle[] = [];

  for (let i = 0; i < count; i++) {
    const open = closes[i];
    const close = closes[i + 1];
    const bodySpan = Math.abs(close - open);
    const wickScale = Math.max(open * baseVolatility * 0.48, bodySpan * 0.75);
    let high = Math.max(open, close) + rng() * wickScale;
    let low = Math.max(1e-8, Math.min(open, close) - rng() * wickScale);

    // Keep 24H candles anchored reasonably near reported 24h high/low
    if (tf === '24H' && coin.high24hUsd > 0 && coin.low24hUsd > 0) {
      high = Math.min(high, coin.high24hUsd * 1.015);
      low = Math.max(low, coin.low24hUsd * 0.985);
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);
    }

    const ts = new Date(nowMs - (count - 1 - i) * stepMs);
    const fmt = formatAxisLabel(ts, tf);
    const moveFactor = 1 + Math.min(2.2, (bodySpan / Math.max(1e-8, open)) * 18);
    const volumeUsd = Math.max(1_000, perCandleVolBase * (0.55 + rng() * 0.95) * moveFactor);

    candles.push({
      index: i,
      label: fmt.full,
      shortLabel: fmt.short,
      openUsd: open,
      highUsd: high,
      lowUsd: low,
      closeUsd: close,
      volumeUsd,
    });
  }

  return { candles, periodPct: clampedPct };
}

export const ProCandlestickChart: React.FC<ProCandlestickChartProps> = ({
  coin,
  currency,
  fxRates,
  isDark,
  isFullScreen = false,
}) => {
  const [timeframe, setTimeframe] = useState<ProTimeframe>('24H');
  const [chartStyle, setChartStyle] = useState<ProChartStyle>('candles');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { candles, periodPct } = useMemo(
    () => buildOhlcSeries(coin, timeframe),
    [coin, timeframe]
  );

  // Dimensions in SVG coordinate space
  const svgW = 760;
  const svgH = 310;
  const padLeft = 14;
  const padRight = 76;
  const padTop = 16;
  const priceZoneBottom = 224;
  const volZoneTop = 240;
  const volZoneBottom = 290;
  const plotW = svgW - padLeft - padRight;
  const priceH = priceZoneBottom - padTop;
  const volH = volZoneBottom - volZoneTop;

  const convertedCandles = useMemo(() => {
    return candles.map((c) => ({
      ...c,
      open: convertUsd(c.openUsd, currency, fxRates),
      high: convertUsd(c.highUsd, currency, fxRates),
      low: convertUsd(c.lowUsd, currency, fxRates),
      close: convertUsd(c.closeUsd, currency, fxRates),
    }));
  }, [candles, currency, fxRates]);

  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (convertedCandles.length === 0) {
      return { minPrice: 0, maxPrice: 1, maxVol: 1 };
    }
    let lo = Infinity;
    let hi = -Infinity;
    let vMax = 0;
    for (const c of convertedCandles) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
      if (c.volumeUsd > vMax) vMax = c.volumeUsd;
    }
    const pad = Math.max((hi - lo) * 0.08, hi * 0.002);
    return {
      minPrice: Math.max(0, lo - pad),
      maxPrice: hi + pad,
      maxVol: Math.max(1, vMax),
    };
  }, [convertedCandles]);

  const priceSpan = Math.max(1e-9, maxPrice - minPrice);
  const priceToY = (p: number) =>
    padTop + priceH - ((p - minPrice) / priceSpan) * priceH;

  const stepX = plotW / Math.max(1, convertedCandles.length);
  const candleWidth = Math.max(3, Math.min(12, stepX * 0.62));

  const areaLinePoints = useMemo(() => {
    return convertedCandles
      .map((c, idx) => {
        const x = padLeft + idx * stepX + stepX / 2;
        const y = priceToY(c.close);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [convertedCandles, stepX, minPrice, priceSpan]);

  const areaPath = useMemo(() => {
    if (convertedCandles.length < 2) return '';
    const firstX = padLeft + stepX / 2;
    const lastX = padLeft + (convertedCandles.length - 1) * stepX + stepX / 2;
    return `M ${firstX.toFixed(1)},${priceZoneBottom} L ${areaLinePoints
      .split(' ')
      .join(' L ')} L ${lastX.toFixed(1)},${priceZoneBottom} Z`;
  }, [convertedCandles.length, stepX, areaLinePoints]);

  const activeCandle =
    hoverIdx !== null && convertedCandles[hoverIdx]
      ? convertedCandles[hoverIdx]
      : convertedCandles[convertedCandles.length - 1];

  const activeRawCandle =
    hoverIdx !== null && candles[hoverIdx] ? candles[hoverIdx] : candles[candles.length - 1];

  const isOverallPositive = periodPct >= 0;
  const lastConvertedClose = convertedCandles[convertedCandles.length - 1]?.close ?? 0;
  const liveLineY = priceToY(lastConvertedClose);

  const yTicks = [0.15, 0.4, 0.65, 0.9].map((ratio) => {
    const valUsd =
      (maxPrice - ratio * priceSpan) / Math.max(1e-9, fxRates[currency] || 1);
    return {
      y: padTop + ratio * priceH,
      label: formatPrice(valUsd, currency, fxRates),
    };
  });

  const xTickIndices = useMemo(() => {
    const len = candles.length;
    if (len <= 4) return candles.map((_, i) => i);
    return [0, Math.floor(len * 0.25), Math.floor(len * 0.5), Math.floor(len * 0.75), len - 1];
  }, [candles]);

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B101C] p-3.5 sm:p-4 flex flex-col justify-between ${
        isFullScreen ? 'flex-1 min-h-[500px] lg:min-h-0' : 'h-[380px]'
      }`}
    >
      {/* Top Toolbar: Timeframes + Style Toggle + Live Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['1H', '24H', '7D', '30D', '90D'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                timeframe === tf
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}

          <span
            className={`ml-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
              isOverallPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
            }`}
          >
            {formatPercent(periodPct)} ({timeframe})
          </span>
        </div>

        {/* Candlestick vs Area Line Toggle */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
          <button
            type="button"
            onClick={() => setChartStyle('candles')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              chartStyle === 'candles'
                ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CandlestickChart className="w-3 h-3" />
            <span>Candles</span>
          </button>
          <button
            type="button"
            onClick={() => setChartStyle('area')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              chartStyle === 'area'
                ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3 h-3" />
            <span>Area</span>
          </button>
        </div>
      </div>

      {/* Live OHLC Readout Strip */}
      {activeRawCandle && (
        <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">{activeRawCandle.label}</span>
            <span>
              O:{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatPrice(activeRawCandle.openUsd, currency, fxRates)}
              </strong>
            </span>
            <span>
              H:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {formatPrice(activeRawCandle.highUsd, currency, fxRates)}
              </strong>
            </span>
            <span>
              L:{' '}
              <strong className="text-rose-600 dark:text-rose-400">
                {formatPrice(activeRawCandle.lowUsd, currency, fxRates)}
              </strong>
            </span>
            <span>
              C:{' '}
              <strong
                className={
                  activeRawCandle.closeUsd >= activeRawCandle.openUsd
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {formatPrice(activeRawCandle.closeUsd, currency, fxRates)}
              </strong>
            </span>
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Vol:{' '}
            <strong className="text-cyan-600 dark:text-cyan-300">
              {formatCompactCurrency(activeRawCandle.volumeUsd, currency, fxRates)}
            </strong>
          </div>
        </div>
      )}

      {/* Interactive SVG Canvas */}
      <div className="relative flex-1 min-h-0">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible select-none touch-none cursor-crosshair"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            if (convertedCandles.length === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * svgW;
            const relX = Math.max(0, Math.min(plotW - 0.01, svgX - padLeft));
            const idx = Math.min(
              convertedCandles.length - 1,
              Math.max(0, Math.floor(relX / stepX))
            );
            setHoverIdx(idx);
          }}
        >
          <defs>
            <linearGradient id="proAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isOverallPositive ? '#10b981' : '#f43f5e'}
                stopOpacity="0.32"
              />
              <stop
                offset="100%"
                stopColor={isOverallPositive ? '#10b981' : '#f43f5e'}
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* Horizontal Price Grid Lines & Right Y-Axis Labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                x2={svgW - padRight}
                y1={t.y}
                y2={t.y}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeDasharray="3 3"
              />
              <text
                x={svgW - padRight + 6}
                y={t.y + 3}
                fontSize="10"
                fontFamily="monospace"
                fill={isDark ? '#64748b' : '#64748b'}
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Volume Divider Line */}
          <line
            x1={padLeft}
            x2={svgW - padRight}
            y1={volZoneTop - 8}
            y2={volZoneTop - 8}
            stroke={isDark ? '#1e293b' : '#e2e8f0'}
          />

          {/* Price Rendering: Candlesticks OR Area Line */}
          {chartStyle === 'area' ? (
            <>
              {areaPath && <path d={areaPath} fill="url(#proAreaGrad)" />}
              {areaLinePoints && (
                <polyline
                  fill="none"
                  stroke={isOverallPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={areaLinePoints}
                />
              )}
            </>
          ) : (
            convertedCandles.map((c, idx) => {
              const cx = padLeft + idx * stepX + stepX / 2;
              const isBull = c.close >= c.open;
              const color = isBull ? '#10b981' : '#f43f5e';
              const yHigh = priceToY(c.high);
              const yLow = priceToY(c.low);
              const yOpen = priceToY(c.open);
              const yClose = priceToY(c.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
              const isHovered = hoverIdx === idx;

              return (
                <g key={idx} opacity={hoverIdx !== null && !isHovered ? 0.72 : 1}>
                  {/* Wick */}
                  <line
                    x1={cx}
                    x2={cx}
                    y1={yHigh}
                    y2={yLow}
                    stroke={color}
                    strokeWidth={isHovered ? 1.8 : 1.3}
                  />
                  {/* Body */}
                  <rect
                    x={cx - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    rx={1}
                    fill={color}
                    stroke={isHovered ? '#ffffff' : 'none'}
                    strokeWidth={isHovered ? 0.8 : 0}
                  />
                </g>
              );
            })
          )}

          {/* Volume Histogram Bars */}
          {convertedCandles.map((c, idx) => {
            const cx = padLeft + idx * stepX + stepX / 2;
            const isBull = c.close >= c.open;
            const barH = Math.max(2, (c.volumeUsd / maxVol) * volH);
            const barY = volZoneBottom - barH;
            const isHovered = hoverIdx === idx;
            return (
              <rect
                key={`v-${idx}`}
                x={cx - candleWidth / 2}
                y={barY}
                width={candleWidth}
                height={barH}
                rx={1}
                fill={isBull ? '#10b981' : '#f43f5e'}
                opacity={isHovered ? 0.95 : 0.42}
              />
            );
          })}

          {/* Live Current Price Reference Line + Pill */}
          <line
            x1={padLeft}
            x2={svgW - padRight}
            y1={liveLineY}
            y2={liveLineY}
            stroke={isOverallPositive ? '#10b981' : '#f43f5e'}
            strokeDasharray="4 4"
            strokeOpacity="0.7"
          />
          <rect
            x={svgW - padRight + 2}
            y={Math.max(4, Math.min(priceZoneBottom - 16, liveLineY - 9))}
            width={72}
            height={18}
            rx={4}
            fill={isOverallPositive ? '#10b981' : '#f43f5e'}
          />
          <text
            x={svgW - padRight + 38}
            y={Math.max(16, Math.min(priceZoneBottom - 4, liveLineY + 3))}
            textAnchor="middle"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
            fill="#090d16"
          >
            {formatPrice(coin.priceUsd, currency, fxRates)}
          </text>

          {/* X-Axis Timestamps */}
          {xTickIndices.map((idx) => {
            const c = convertedCandles[idx];
            if (!c) return null;
            const cx = padLeft + idx * stepX + stepX / 2;
            return (
              <text
                key={`xt-${idx}`}
                x={cx}
                y={svgH - 4}
                textAnchor="middle"
                fontSize="9.5"
                fontFamily="monospace"
                fill="#64748b"
              >
                {c.shortLabel}
              </text>
            );
          })}

          {/* Hover Crosshair */}
          {hoverIdx !== null && activeCandle && (
            <g pointerEvents="none">
              {(() => {
                const hx = padLeft + hoverIdx * stepX + stepX / 2;
                const hy = priceToY(activeCandle.close);
                return (
                  <>
                    <line
                      x1={hx}
                      x2={hx}
                      y1={padTop}
                      y2={volZoneBottom}
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeDasharray="3 3"
                      strokeOpacity="0.65"
                    />
                    <line
                      x1={padLeft}
                      x2={svgW - padRight}
                      y1={hy}
                      y2={hy}
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeDasharray="3 3"
                      strokeOpacity="0.55"
                    />
                    <circle
                      cx={hx}
                      cy={hy}
                      r={4.2}
                      fill="#06b6d4"
                      stroke="#ffffff"
                      strokeWidth={1.6}
                    />
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* Floating Glassmorphism Crosshair Tooltip */}
        {hoverIdx !== null && activeRawCandle && (
          <div
            className={`pointer-events-none absolute top-2 z-20 px-3 py-2 rounded-xl border border-cyan-500/35 bg-slate-950/90 backdrop-blur-md text-[11px] font-mono text-slate-100 shadow-lg space-y-0.5 ${
              hoverIdx > candles.length * 0.55 ? 'left-3' : 'right-20'
            }`}
          >
            <div className="text-cyan-300 font-semibold">{activeRawCandle.label}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-slate-400">Open:</span>
              <span className="text-right">{formatPrice(activeRawCandle.openUsd, currency, fxRates)}</span>
              <span className="text-slate-400">High:</span>
              <span className="text-right text-emerald-400">{formatPrice(activeRawCandle.highUsd, currency, fxRates)}</span>
              <span className="text-slate-400">Low:</span>
              <span className="text-right text-rose-400">{formatPrice(activeRawCandle.lowUsd, currency, fxRates)}</span>
              <span className="text-slate-400">Close:</span>
              <span className="text-right font-bold">{formatPrice(activeRawCandle.closeUsd, currency, fxRates)}</span>
              <span className="text-slate-400">Vol:</span>
              <span className="text-right text-cyan-300">{formatCompactCurrency(activeRawCandle.volumeUsd, currency, fxRates)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
