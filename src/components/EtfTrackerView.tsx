import React, { useMemo, useState } from 'react';
import { BarChart3, Building2, TrendingDown, TrendingUp } from 'lucide-react';
import { buildSpotEtfData } from '../data/cryptoEngine';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatSupply } from '../utils/formatters';

interface EtfTrackerViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
}

type EtfAssetScope = 'BTC' | 'ETH' | 'ALL';

export const EtfTrackerView: React.FC<EtfTrackerViewProps> = ({
  coins,
  currency,
  fxRates,
}) => {
  const [scope, setScope] = useState<EtfAssetScope>('BTC');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const btcPrice = coins.find((c) => c.symbol === 'BTC')?.priceUsd ?? 94280;
  const ethPrice = coins.find((c) => c.symbol === 'ETH')?.priceUsd ?? 3340;

  const { btcIssuers, ethIssuers, dailyFlows } = useMemo(
    () => buildSpotEtfData(btcPrice, ethPrice),
    [btcPrice, ethPrice]
  );

  const activeIssuers = useMemo(() => {
    if (scope === 'BTC') return btcIssuers;
    if (scope === 'ETH') return ethIssuers;
    return [...btcIssuers, ...ethIssuers].sort((a, b) => b.aumUsd - a.aumUsd);
  }, [scope, btcIssuers, ethIssuers]);

  const totals = useMemo(() => {
    const totalAum = activeIssuers.reduce((acc, i) => acc + i.aumUsd, 0);
    const net1d = activeIssuers.reduce((acc, i) => acc + i.netFlow1dUsd, 0);
    const net7d = activeIssuers.reduce((acc, i) => acc + i.netFlow7dUsd, 0);
    const totalVol = activeIssuers.reduce((acc, i) => acc + i.volume24hUsd, 0);
    return { totalAum, net1d, net7d, totalVol };
  }, [activeIssuers]);

  const chartSeries = useMemo(
    () =>
      dailyFlows.map((d) => ({
        date: d.date,
        value:
          scope === 'BTC'
            ? d.btcNetFlowUsd
            : scope === 'ETH'
            ? d.ethNetFlowUsd
            : d.btcNetFlowUsd + d.ethNetFlowUsd,
      })),
    [dailyFlows, scope]
  );

  const maxAbsFlow = useMemo(
    () => Math.max(1, ...chartSeries.map((d) => Math.abs(d.value))),
    [chartSeries]
  );

  const hoveredPoint =
    hoveredDayIdx !== null ? chartSeries[hoveredDayIdx] : chartSeries[chartSeries.length - 1];

  return (
    <div className="space-y-5">
      {/* Scope Switcher + Headline */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-500" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                US Spot Bitcoin & Ethereum ETF Flow Tracker
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Institutional AUM synced to live spot prices · Daily net inflows/outflows & issuer custody breakdown
            </p>
          </div>

          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1 self-start">
            {(
              [
                { id: 'BTC', label: 'Bitcoin ETFs' },
                { id: 'ETH', label: 'Ethereum ETFs' },
                { id: 'ALL', label: 'Combined BTC + ETH' },
              ] as Array<{ id: EtfAssetScope; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  scope === opt.id
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Spot ETF AUM</div>
            <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatCompactCurrency(totals.totalAum, currency, fxRates)}
            </div>
            <div className="mt-1 text-[11px] font-mono text-cyan-500">
              {activeIssuers.length} institutional issuers tracked
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Daily Net Inflow / Outflow</div>
            <div
              className={`mt-1 font-mono tabular-nums text-xl font-bold flex items-center gap-1.5 ${
                totals.net1d >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {totals.net1d >= 0 ? (
                <TrendingUp className="w-4 h-4 shrink-0" />
              ) : (
                <TrendingDown className="w-4 h-4 shrink-0" />
              )}
              <span>
                {totals.net1d >= 0 ? '+' : ''}
                {formatCompactCurrency(totals.net1d, currency, fxRates)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Latest US market settlement session
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">7-Day Cumulative Net Flow</div>
            <div
              className={`mt-1 font-mono tabular-nums text-xl font-bold ${
                totals.net7d >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {totals.net7d >= 0 ? '+' : ''}
              {formatCompactCurrency(totals.net7d, currency, fxRates)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Rolling 7-day institutional demand
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101B] p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">24h ETF Share Volume</div>
            <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatCompactCurrency(totals.totalVol, currency, fxRates)}
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Leader: {activeIssuers[0]?.ticker} ({activeIssuers[0]?.issuer})
            </div>
          </div>
        </div>
      </div>

      {/* 21-Day Net Inflows / Outflows Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Daily Spot ETF Net Inflows vs Outflows (21 Sessions)
            </h3>
          </div>
          {hoveredPoint && (
            <div className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 mr-2">{hoveredPoint.date}:</span>
              <span className={hoveredPoint.value >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                {hoveredPoint.value >= 0 ? '+' : ''}
                {formatCompactCurrency(hoveredPoint.value, currency, fxRates)}
              </span>
            </div>
          )}
        </div>

        <div className="relative h-52 flex items-center gap-1.5 pt-2 pb-6 px-2 border border-slate-200/80 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-[#0B101B]">
          {/* Zero baseline */}
          <div className="absolute left-2 right-2 top-1/2 h-px bg-slate-300 dark:bg-slate-700 pointer-events-none" />

          {chartSeries.map((day, idx) => {
            const pct = Math.max(6, (Math.abs(day.value) / maxAbsFlow) * 44);
            const pos = day.value >= 0;
            const active = hoveredDayIdx === idx;
            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredDayIdx(idx)}
                className="relative flex-1 h-full flex flex-col items-center justify-center group cursor-pointer"
              >
                <div
                  className={`w-full max-w-[22px] rounded-sm transition-all ${
                    pos
                      ? active
                        ? 'bg-emerald-400'
                        : 'bg-emerald-500/85 hover:bg-emerald-400'
                      : active
                      ? 'bg-rose-400'
                      : 'bg-rose-500/85 hover:bg-rose-400'
                  }`}
                  style={{
                    height: `${pct}%`,
                    position: 'absolute',
                    ...(pos ? { bottom: '50%' } : { top: '50%' }),
                  }}
                />
                {(idx === 0 || idx === 10 || idx === chartSeries.length - 1) && (
                  <span className="absolute bottom-1 text-[9px] font-mono text-slate-400 whitespace-nowrap">
                    {day.date}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Issuer Breakdown Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            Issuer Breakdown (BlackRock, Fidelity, Grayscale, Ark & Peers)
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            AUM Share & Daily Flows ({currency})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                <th className="py-2.5 pl-4 pr-3">Ticker</th>
                <th className="py-2.5 px-3">Issuer & Fund Name</th>
                <th className="py-2.5 px-3 text-right">Fee</th>
                <th className="py-2.5 px-3 text-right">Holdings</th>
                <th className="py-2.5 px-3 text-right">Total AUM</th>
                <th className="py-2.5 px-3 text-right">1D Net Flow</th>
                <th className="py-2.5 px-3 text-right hidden md:table-cell">7D Net Flow</th>
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">24h Volume</th>
                <th className="py-2.5 pl-3 pr-4 text-right">AUM Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {activeIssuers.map((etf) => {
                const aumShare = totals.totalAum > 0 ? (etf.aumUsd / totals.totalAum) * 100 : 0;
                return (
                  <tr
                    key={etf.ticker}
                    className="h-12 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="pl-4 pr-3">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-cyan-500/15 dark:text-cyan-300 border border-cyan-500/30 font-mono font-bold text-[11px]">
                          {etf.ticker}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{etf.asset}</span>
                      </div>
                    </td>
                    <td className="px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {etf.issuer}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[230px]">
                        {etf.name}
                      </div>
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {etf.feePct.toFixed(2)}%
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatSupply(etf.holdingsUnits)} {etf.asset}
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatCompactCurrency(etf.aumUsd, currency, fxRates)}
                    </td>
                    <td
                      className={`px-3 text-right font-mono tabular-nums font-semibold ${
                        etf.netFlow1dUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {etf.netFlow1dUsd >= 0 ? '+' : ''}
                      {formatCompactCurrency(etf.netFlow1dUsd, currency, fxRates)}
                    </td>
                    <td
                      className={`px-3 text-right font-mono tabular-nums hidden md:table-cell ${
                        etf.netFlow7dUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {etf.netFlow7dUsd >= 0 ? '+' : ''}
                      {formatCompactCurrency(etf.netFlow7dUsd, currency, fxRates)}
                    </td>
                    <td className="px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                      {formatCompactCurrency(etf.volume24hUsd, currency, fxRates)}
                    </td>
                    <td className="pl-3 pr-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-cyan-500"
                            style={{ width: `${Math.min(100, aumShare).toFixed(1)}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-slate-700 dark:text-slate-300 w-10 text-right">
                          {aumShare.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
