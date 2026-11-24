import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { applyProMarketFilters, countActiveProFilters, EMPTY_PRO_FILTERS } from '../data/cryptoEngine';
import { BlockchainNetwork, Coin, ProMarketFilters } from '../types/crypto';

interface ProFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coins: Coin[];
  selectedNetwork: BlockchainNetwork;
  filters: ProMarketFilters;
  onApplyFilters: (next: ProMarketFilters) => void;
  onResetFilters: () => void;
}

interface RangeRowConfig {
  label: string;
  unitHint: string;
  minKey: keyof ProMarketFilters;
  maxKey: keyof ProMarketFilters;
  minPlaceholder: string;
  maxPlaceholder: string;
  presets?: Array<{ label: string; min: string; max: string }>;
}

const FILTER_ROWS: RangeRowConfig[] = [
  {
    label: 'Market Cap ($)',
    unitHint: 'USD value',
    minKey: 'marketCapMin',
    maxKey: 'marketCapMax',
    minPlaceholder: 'e.g. 100000000',
    maxPlaceholder: 'e.g. 50000000000',
    presets: [
      { label: '>$10B', min: '10000000000', max: '' },
      { label: '$1B–$10B', min: '1000000000', max: '10000000000' },
      { label: '$100M–$1B', min: '100000000', max: '1000000000' },
      { label: '<$100M', min: '', max: '100000000' },
    ],
  },
  {
    label: 'FDV ($)',
    unitHint: 'Fully Diluted Valuation',
    minKey: 'fdvMin',
    maxKey: 'fdvMax',
    minPlaceholder: 'Min FDV $',
    maxPlaceholder: 'Max FDV $',
  },
  {
    label: 'Price 24h %',
    unitHint: '% change',
    minKey: 'change24hMin',
    maxKey: 'change24hMax',
    minPlaceholder: 'e.g. -15',
    maxPlaceholder: 'e.g. 25',
    presets: [
      { label: 'Gainers >+3%', min: '3', max: '' },
      { label: 'Losers <-3%', min: '', max: '-3' },
    ],
  },
  {
    label: 'Vol 24h ($)',
    unitHint: 'Spot 24h Volume',
    minKey: 'vol24hMin',
    maxKey: 'vol24hMax',
    minPlaceholder: 'e.g. 10000000',
    maxPlaceholder: 'Max Vol $',
  },
  {
    label: 'Vol 24h %',
    unitHint: '24h volume change %',
    minKey: 'vol24hPctMin',
    maxKey: 'vol24hPctMax',
    minPlaceholder: 'e.g. -50',
    maxPlaceholder: 'e.g. 200',
  },
  {
    label: 'Open Interest (OI) ($)',
    unitHint: 'USD notional',
    minKey: 'oiMin',
    maxKey: 'oiMax',
    minPlaceholder: 'e.g. 50000000',
    maxPlaceholder: 'Max OI $',
    presets: [
      { label: '>$500M OI', min: '500000000', max: '' },
      { label: '>$50M OI', min: '50000000', max: '' },
    ],
  },
  {
    label: 'OI 24h %',
    unitHint: 'Open Interest 24h %',
    minKey: 'oi24hPctMin',
    maxKey: 'oi24hPctMax',
    minPlaceholder: 'e.g. -10',
    maxPlaceholder: 'e.g. 30',
  },
  {
    label: 'Derivatives Vol 24h ($)',
    unitHint: 'Perps & Futures 24h Vol',
    minKey: 'derivVol24hMin',
    maxKey: 'derivVol24hMax',
    minPlaceholder: 'Min Deriv Vol $',
    maxPlaceholder: 'Max Deriv Vol $',
  },
  {
    label: 'Funding Rate (%)',
    unitHint: '8h perpetual funding %',
    minKey: 'fundingRateMin',
    maxKey: 'fundingRateMax',
    minPlaceholder: 'e.g. -0.05',
    maxPlaceholder: 'e.g. 0.08',
    presets: [
      { label: 'Negative (<0%)', min: '', max: '0' },
      { label: 'Elevated (>0.02%)', min: '0.02', max: '' },
    ],
  },
  {
    label: 'Long Liq 24h ($)',
    unitHint: 'Long liquidations USD',
    minKey: 'longLiq24hMin',
    maxKey: 'longLiq24hMax',
    minPlaceholder: 'Min Long Liq $',
    maxPlaceholder: 'Max Long Liq $',
  },
  {
    label: 'Short Liq 24h ($)',
    unitHint: 'Short liquidations USD',
    minKey: 'shortLiq24hMin',
    maxKey: 'shortLiq24hMax',
    minPlaceholder: 'Min Short Liq $',
    maxPlaceholder: 'Max Short Liq $',
  },
  {
    label: 'Total Liq 24h ($)',
    unitHint: 'Combined 24h liquidations USD',
    minKey: 'totalLiq24hMin',
    maxKey: 'totalLiq24hMax',
    minPlaceholder: 'Min Total Liq $',
    maxPlaceholder: 'Max Total Liq $',
    presets: [
      { label: '>$5M Liq', min: '5000000', max: '' },
      { label: '>$1M Liq', min: '1000000', max: '' },
    ],
  },
];

export const ProFilterDrawer: React.FC<ProFilterDrawerProps> = ({
  isOpen,
  onClose,
  coins,
  selectedNetwork,
  filters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [draft, setDraft] = useState<ProMarketFilters>(filters);

  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
    }
  }, [isOpen, filters]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    coins.forEach((c) => set.add(c.category));
    return Array.from(set);
  }, [coins]);

  const previewCount = useMemo(
    () => applyProMarketFilters(coins, selectedNetwork, draft).length,
    [coins, selectedNetwork, draft]
  );

  const activeDraftCount = useMemo(() => countActiveProFilters(draft), [draft]);

  if (!isOpen) return null;

  const updateField = (key: keyof ProMarketFilters, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-xs" onClick={onClose}>
      <aside
        className="w-full max-w-md h-full bg-white dark:bg-[#0D1321] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-label="Advanced Multi-Metric Pro Filters"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Pro Multi-Metric Filters
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeDraftCount} active filter{activeDraftCount === 1 ? '' : 's'} · Network: {selectedNetwork}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filter Fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Category Dropdown */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A]/70 p-3.5">
            <label
              htmlFor="pro-filter-category"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2"
            >
              Category / Sector
            </label>
            <select
              id="pro-filter-category"
              value={draft.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Numeric Min/Max Ranges */}
          {FILTER_ROWS.map((row) => (
            <div
              key={row.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A]/70 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {row.label}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {row.unitHint}
                </span>
              </div>

              {row.presets && (
                <div className="flex flex-wrap gap-1.5">
                  {row.presets.map((p) => {
                    const isActive =
                      draft[row.minKey] === p.min && draft[row.maxKey] === p.max;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            [row.minKey]: isActive ? '' : p.min,
                            [row.maxKey]: isActive ? '' : p.max,
                          }))
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Min
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={draft[row.minKey]}
                    onChange={(e) => updateField(row.minKey, e.target.value)}
                    placeholder={row.minPlaceholder}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Max
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={draft[row.maxKey]}
                    onChange={(e) => updateField(row.maxKey, e.target.value)}
                    placeholder={row.maxPlaceholder}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0B101B] flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY_PRO_FILTERS);
              onResetFilters();
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyFilters(draft);
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Apply Filters</span>
            <span className="font-mono tabular-nums">({previewCount} coins)</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
