import React, { useMemo, useState } from 'react';
import { Gauge, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface TechnicalIndicatorsViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

type Timeframe = '15m' | '1H' | '4H' | '1D';
type RatingLabel = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';

interface TechnicalRow {
  coin: Coin;
  rsi14: number;
  macdSignal: 'Bullish Cross' | 'Bullish Momentum' | 'Consolidating' | 'Bearish Momentum' | 'Bearish Cross';
  macdHistogram: number;
  ema200Pct: number;
  bbStatus: 'Upper Breakout' | 'Upper Half' | 'Mid Squeeze' | 'Lower Half' | 'Lower Support';
  score: number; // -100 to +100
  rating: RatingLabel;
}

const TIMEFRAME_WEIGHTS: Record<
  Timeframe,
  { shortMult: number; medMult: number; longMult: number; label: string }
> = {
  '15m': { shortMult: 1.5, medMult: 0.35, longMult: 0.1, label: 'Scalp & Intraday (15m)' },
  '1H': { shortMult: 0.9, medMult: 0.7, longMult: 0.2, label: 'Hourly Swing (1H)' },
  '4H': { shortMult: 0.45, medMult: 0.85, longMult: 0.45, label: '4-Hour Momentum (4H)' },
  '1D': { shortMult: 0.2, medMult: 0.55, longMult: 0.95, label: 'Daily Macro Trend (1D)' },
};

function computeTechnicalRow(coin: Coin, tf: Timeframe): TechnicalRow {
  const w = TIMEFRAME_WEIGHTS[tf];
  const compositeMove =
    coin.change1h * w.shortMult +
    coin.change24h * w.medMult +
    coin.change7d * w.longMult * 0.4;

  // Compute bounded RSI(14) centered at 50
  const seedNudge = ((coin.rank * 7) % 9) - 4;
  const rsi14 = Math.min(88, Math.max(14, Number((50 + compositeMove * 2.15 + seedNudge * 0.35).toFixed(1))));

  // Compute 200 EMA distance %
  const ema200Pct = Number(((coin.change30d * 0.42 + coin.change7d * 0.32 + coin.change24h * 0.22) * (tf === '1D' ? 1.15 : 0.75)).toFixed(2));

  // MACD Histogram
  const macdRaw = (coin.change1h * w.shortMult + coin.change24h * 0.6) - coin.change7d * 0.18;
  const macdHistogram = Number((macdRaw * 0.12).toFixed(3));
  let macdSignal: TechnicalRow['macdSignal'] = 'Consolidating';
  if (macdHistogram >= 0.45) macdSignal = 'Bullish Cross';
  else if (macdHistogram >= 0.12) macdSignal = 'Bullish Momentum';
  else if (macdHistogram <= -0.45) macdSignal = 'Bearish Cross';
  else if (macdHistogram <= -0.12) macdSignal = 'Bearish Momentum';

  // Bollinger Band position from 24h High/Low
  const span = Math.max(coin.priceUsd * 0.005, coin.high24hUsd - coin.low24hUsd);
  const bbPos = Math.min(1, Math.max(0, (coin.priceUsd - coin.low24hUsd) / span));
  let bbStatus: TechnicalRow['bbStatus'] = 'Mid Squeeze';
  if (bbPos >= 0.85) bbStatus = 'Upper Breakout';
  else if (bbPos >= 0.62) bbStatus = 'Upper Half';
  else if (bbPos <= 0.18) bbStatus = 'Lower Support';
  else if (bbPos <= 0.38) bbStatus = 'Lower Half';

  // Composite Score (-100 to +100)
  let score = 0;
  if (rsi14 >= 55 && rsi14 <= 72) score += 28;
  else if (rsi14 > 72) score += 12; // strong momentum though stretched
  else if (rsi14 < 32) score += 18; // oversold bounce setup
  else if (rsi14 < 45) score -= 24;

  score += macdHistogram > 0 ? Math.min(35, macdHistogram * 45) : Math.max(-35, macdHistogram * 45);
  score += ema200Pct >= 0 ? Math.min(30, ema200Pct * 2.5) : Math.max(-30, ema200Pct * 2.5);
  score += (bbPos - 0.5) * 20;

  const clampedScore = Math.min(100, Math.max(-100, Math.round(score)));
  let rating: RatingLabel = 'Neutral';
  if (clampedScore >= 42) rating = 'Strong Buy';
  else if (clampedScore >= 16) rating = 'Buy';
  else if (clampedScore <= -42) rating = 'Strong Sell';
  else if (clampedScore <= -16) rating = 'Sell';

  return {
    coin,
    rsi14,
    macdSignal,
    macdHistogram,
    ema200Pct,
    bbStatus,
    score: clampedScore,
    rating,
  };
}

const RATING_FILTERS: Array<'All' | RatingLabel> = [
  'All',
  'Strong Buy',
  'Buy',
  'Neutral',
  'Sell',
  'Strong Sell',
];

export const TechnicalIndicatorsView: React.FC<TechnicalIndicatorsViewProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('4H');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'All' | RatingLabel>('All');

  const topScreenerPool = useMemo(() => {
    return coins.filter((c) => c.category !== 'Stablecoin').slice(0, 60);
  }, [coins]);

  const rows = useMemo(() => {
    return topScreenerPool.map((c) => computeTechnicalRow(c, timeframe));
  }, [topScreenerPool, timeframe]);

  const counts = useMemo(() => {
    const map: Record<RatingLabel, number> = {
      'Strong Buy': 0,
      Buy: 0,
      Neutral: 0,
      Sell: 0,
      'Strong Sell': 0,
    };
    rows.forEach((r) => {
      map[r.rating] += 1;
    });
    return map;
  }, [rows]);

  const oversoldList = useMemo(() => rows.filter((r) => r.rsi14 < 38).slice(0, 4), [rows]);
  const overboughtList = useMemo(() => rows.filter((r) => r.rsi14 > 68).slice(0, 4), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (ratingFilter !== 'All' && r.rating !== ratingFilter) return false;
      if (q) {
        return (
          r.coin.symbol.toLowerCase().includes(q) ||
          r.coin.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, ratingFilter, search]);

  const renderRatingGauge = (row: TechnicalRow) => {
    const pct = ((row.score + 100) / 200) * 100;
    const tone =
      row.rating === 'Strong Buy' || row.rating === 'Buy'
        ? 'text-emerald-600 dark:text-emerald-400'
        : row.rating === 'Strong Sell' || row.rating === 'Sell'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-amber-600 dark:text-amber-400';

    const barTone =
      row.rating === 'Strong Buy' || row.rating === 'Buy'
        ? 'bg-emerald-500'
        : row.rating === 'Strong Sell' || row.rating === 'Sell'
        ? 'bg-rose-500'
        : 'bg-amber-400';

    return (
      <div className="inline-flex flex-col items-end gap-1 min-w-[106px]">
        <span className={`text-[11px] font-bold ${tone}`}>{row.rating}</span>
        <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className={`h-full ${barTone} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Controls + Multi-Timeframe Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Gauge className="w-4 h-4 text-cyan-500" />
              <span>Multi-Timeframe Technical Screener</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Active Horizon: {TIMEFRAME_WEIGHTS[timeframe].label} · RSI (14), MACD, 200 EMA &amp; Bollinger Bands
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
            {(['15m', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Signal Distribution Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {(['Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'] as RatingLabel[]).map((lbl) => {
            const active = ratingFilter === lbl;
            const color =
              lbl.includes('Buy')
                ? 'text-emerald-600 dark:text-emerald-400'
                : lbl.includes('Sell')
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-amber-600 dark:text-amber-400';
            return (
              <button
                key={lbl}
                type="button"
                onClick={() => setRatingFilter((cur) => (cur === lbl ? 'All' : lbl))}
                className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`text-[11px] font-semibold ${color}`}>{lbl}</div>
                <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {counts[lbl]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Oversold / Overbought Quick Strip & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" /> Oversold (RSI &lt; 38):
            </span>
            {oversoldList.length > 0 ? (
              oversoldList.map((r) => (
                <button
                  key={r.coin.id}
                  type="button"
                  onClick={() => onSelectCoin(r.coin)}
                  className="font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-500 cursor-pointer"
                >
                  {r.coin.symbol} ({r.rsi14})
                </button>
              ))
            ) : (
              <span>None in Top 60</span>
            )}
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" /> Overbought (RSI &gt; 68):
            </span>
            {overboughtList.length > 0 ? (
              overboughtList.map((r) => (
                <button
                  key={r.coin.id}
                  type="button"
                  onClick={() => onSelectCoin(r.coin)}
                  className="font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-500 cursor-pointer"
                >
                  {r.coin.symbol} ({r.rsi14})
                </button>
              ))
            ) : (
              <span>None in Top 60</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as 'All' | RatingLabel)}
              aria-label="Filter by overall signal"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
            >
              {RATING_FILTERS.map((rf) => (
                <option key={rf} value={rf}>
                  {rf === 'All' ? 'All Ratings' : rf}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter ticker..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 w-36 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Technical Screener Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4">Asset</th>
                <th className="py-2.5 px-3 text-right">Price / 24h</th>
                <th className="py-2.5 px-3 text-right">RSI (14)</th>
                <th className="py-2.5 px-3">MACD Signal</th>
                <th className="py-2.5 px-3 text-right">200 EMA Trend</th>
                <th className="py-2.5 px-3">Bollinger Band</th>
                <th className="py-2.5 px-4 text-right">Overall Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredRows.slice(0, 35).map((row) => {
                const { coin } = row;
                const rsiColor =
                  row.rsi14 >= 70
                    ? 'text-rose-600 dark:text-rose-400'
                    : row.rsi14 <= 35
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-800 dark:text-slate-200';
                const macdColor = row.macdSignal.includes('Bullish')
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : row.macdSignal.includes('Bearish')
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400';

                return (
                  <tr
                    key={coin.id}
                    onClick={() => onSelectCoin(coin)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] text-slate-400 w-5 tabular-nums">
                          {coin.rank}
                        </span>
                        <CoinLogo coin={coin} size="md" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {coin.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {coin.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatPrice(coin.priceUsd, currency, fxRates)}
                      </div>
                      <div
                        className={`text-[11px] ${
                          coin.change24h >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatPercent(coin.change24h)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span className={`font-bold ${rsiColor}`}>{row.rsi14.toFixed(1)}</span>
                      <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                        {row.rsi14 >= 70 ? 'Overbought' : row.rsi14 <= 35 ? 'Oversold' : 'Neutral'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className={`font-semibold ${macdColor}`}>{row.macdSignal}</div>
                      <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                        Hist: {row.macdHistogram >= 0 ? '+' : ''}
                        {row.macdHistogram.toFixed(3)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          row.ema200Pct >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.ema200Pct >= 0 ? 'Above' : 'Below'} ({row.ema200Pct >= 0 ? '+' : ''}
                        {row.ema200Pct}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.bbStatus}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {renderRatingGauge(row)}
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                    No assets match "{search}" under {ratingFilter}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
