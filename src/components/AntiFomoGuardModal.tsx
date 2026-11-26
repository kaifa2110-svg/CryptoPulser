import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  CheckCircle2,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  X,
} from 'lucide-react';
import { buildBubbleRadarGraph, buildFilteredWhaleSonar } from '../data/cryptoEngine';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface AntiFomoGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: Coin[];
  initialCoin: Coin | null;
  currency: CurrencyCode;
  fxRates: FxRates;
  onOpenCoinDetail?: (coin: Coin) => void;
}

type InvestCurrency = 'USD' | 'PKR';

export interface FomoAnalysis {
  score: number;
  verdict:
    | 'SAFE ACCUMULATION ZONE'
    | 'CAUTION: ELEVATED FOMO'
    | 'DANGER: CHASING PUMP (HIGH PULLBACK RISK)';
  tone: 'emerald' | 'amber' | 'rose';
  pump24hRisk: number;
  momentum7dRisk: number;
  volFrenzyRisk: number;
  whaleInflowRisk: number;
  volToMcapPct: number;
  whaleInflowSharePct: number;
  exchangeCustodyPct: number;
  dipLowUsd: number;
  dipHighUsd: number;
  dipDiscountPct: number;
  explanation: string;
}

const QUICK_PICKS = ['BTC', 'ETH', 'SOL', 'XRP', 'PEPE', 'DOGE', 'SUI', 'BNB'];

export function computeFomoAnalysis(coin: Coin, allCoins: Coin[] = []): FomoAnalysis {
  const ch24 = coin.change24h;
  const ch7d = coin.change7d;
  const volToMcapPct =
    coin.marketCapUsd > 0 ? (coin.volume24hUsd / coin.marketCapUsd) * 100 : 0;

  // 1. 24h Pump Velocity component (0-34 pts)
  let pump24hRisk = 8;
  if (ch24 >= 20) pump24hRisk = 34;
  else if (ch24 >= 12) pump24hRisk = 28 + ((ch24 - 12) / 8) * 6;
  else if (ch24 >= 5) pump24hRisk = 16 + ((ch24 - 5) / 7) * 12;
  else if (ch24 > 0) pump24hRisk = 9 + (ch24 / 5) * 7;
  else if (ch24 <= -8) pump24hRisk = 2;
  else if (ch24 < 0) pump24hRisk = Math.max(3, 8 + ch24 * 0.6);

  // 2. 7d Momentum Stretch component (0-28 pts)
  let momentum7dRisk = 7;
  if (ch7d >= 45) momentum7dRisk = 28;
  else if (ch7d >= 20) momentum7dRisk = 18 + ((ch7d - 20) / 25) * 10;
  else if (ch7d >= 6) momentum7dRisk = 10 + ((ch7d - 6) / 14) * 8;
  else if (ch7d > 0) momentum7dRisk = 7 + (ch7d / 6) * 3;
  else if (ch7d <= -15) momentum7dRisk = 2;
  else momentum7dRisk = Math.max(3, 7 + ch7d * 0.3);

  // 3. Volume-to-Market-Cap frenzy ratio (0-20 pts)
  let volFrenzyRisk = 4;
  if (volToMcapPct >= 28) volFrenzyRisk = 20;
  else if (volToMcapPct >= 14) volFrenzyRisk = 12 + ((volToMcapPct - 14) / 14) * 8;
  else if (volToMcapPct >= 6) volFrenzyRisk = 6 + ((volToMcapPct - 6) / 8) * 6;
  else volFrenzyRisk = Math.max(2, (volToMcapPct / 6) * 6);

  // 4. Whale Exchange Inflow Pressure (0-18 pts)
  const sonar = buildFilteredWhaleSonar(allCoins, coin.symbol, 14);
  const bubble = buildBubbleRadarGraph(coin);
  const totalFlow = sonar.summary.inflowUsd + sonar.summary.outflowUsd;
  const whaleInflowSharePct =
    totalFlow > 0 ? (sonar.summary.inflowUsd / totalFlow) * 100 : 50;
  const whaleInflowRisk = Math.min(
    18,
    Math.max(
      2,
      Math.round((whaleInflowSharePct / 100) * 13 + (bubble.exchangeCustodyPct / 100) * 5)
    )
  );

  const rawScore = Math.round(pump24hRisk + momentum7dRisk + volFrenzyRisk + whaleInflowRisk);
  const score = Math.min(99, Math.max(5, rawScore));

  let verdict: FomoAnalysis['verdict'] = 'SAFE ACCUMULATION ZONE';
  let tone: FomoAnalysis['tone'] = 'emerald';
  let explanation =
    'Price momentum and exchange inflow pressure are muted. Entering in tranches avoids chasing vertical green candles.';

  if (score >= 67) {
    verdict = 'DANGER: CHASING PUMP (HIGH PULLBACK RISK)';
    tone = 'rose';
    explanation =
      'Extended multi-day momentum combined with heightened turnover or whale exchange inflows signals elevated exit-liquidity trap risk.';
  } else if (score >= 38) {
    verdict = 'CAUTION: ELEVATED FOMO';
    tone = 'amber';
    explanation =
      'Short-term momentum is heating up. Avoid market-buying spikes; scale in closer to the Smart Dip-Buy Target Zone.';
  }

  // Smart Dip-Buy Target Zone anchored to 24h range & FOMO overextension
  const pullbackScale =
    score >= 67 ? 0.065 + (score - 67) * 0.0018 : score >= 38 ? 0.032 + (score - 38) * 0.001 : 0.014;
  const structuralFloor = Math.min(coin.low24hUsd, coin.priceUsd * (1 - pullbackScale * 1.15));
  const dipHighUsd = Math.max(structuralFloor * 1.005, coin.priceUsd * (1 - pullbackScale * 0.68));
  const dipLowUsd = Math.max(0.0000001, Math.min(dipHighUsd * 0.965, coin.priceUsd * (1 - pullbackScale * 1.28)));
  const midDip = (dipLowUsd + dipHighUsd) / 2;
  const dipDiscountPct =
    coin.priceUsd > 0 ? Math.max(0.5, ((coin.priceUsd - midDip) / coin.priceUsd) * 100) : 2.0;

  return {
    score,
    verdict,
    tone,
    pump24hRisk: Math.round(pump24hRisk),
    momentum7dRisk: Math.round(momentum7dRisk),
    volFrenzyRisk: Math.round(volFrenzyRisk),
    whaleInflowRisk,
    volToMcapPct,
    whaleInflowSharePct,
    exchangeCustodyPct: bubble.exchangeCustodyPct,
    dipLowUsd,
    dipHighUsd,
    dipDiscountPct,
    explanation,
  };
}

export const AntiFomoGuardModal: React.FC<AntiFomoGuardModalProps> = ({
  isOpen,
  onClose,
  coins,
  initialCoin,
  currency,
  fxRates,
  onOpenCoinDetail,
}) => {
  const [selectedCoinId, setSelectedCoinId] = useState<string>(
    initialCoin?.id || coins[0]?.id || 'bitcoin'
  );
  const [coinSearch, setCoinSearch] = useState('');
  const [investCurrency, setInvestCurrency] = useState<InvestCurrency>(
    currency === 'PKR' ? 'PKR' : 'USD'
  );
  const [investAmountStr, setInvestAmountStr] = useState<string>(
    currency === 'PKR' ? '100000' : '1000'
  );
  const [spreadPct, setSpreadPct] = useState<number>(3.5);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (initialCoin) {
        setSelectedCoinId(initialCoin.id);
      } else if (coins[0]) {
        setSelectedCoinId(coins[0].id);
      }
      setCoinSearch('');
      const nextCur: InvestCurrency = currency === 'PKR' ? 'PKR' : 'USD';
      setInvestCurrency(nextCur);
      setInvestAmountStr(nextCur === 'PKR' ? '100000' : '1000');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialCoin, coins, currency]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const selectedCoin = useMemo(
    () => coins.find((c) => c.id === selectedCoinId) ?? coins[0],
    [coins, selectedCoinId]
  );

  const matchingCoins = useMemo(() => {
    const q = coinSearch.trim().toLowerCase();
    if (!q) return coins.slice(0, 100);
    return coins
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          String(c.rank) === q
      )
      .slice(0, 40);
  }, [coins, coinSearch]);

  const selectOptions = useMemo(() => {
    if (!selectedCoin) return matchingCoins;
    if (matchingCoins.some((c) => c.id === selectedCoin.id)) return matchingCoins;
    return [selectedCoin, ...matchingCoins];
  }, [matchingCoins, selectedCoin]);

  const quickCoins = useMemo(() => {
    return QUICK_PICKS.map((sym) =>
      coins.find((c) => c.symbol.toUpperCase() === sym)
    ).filter((c): c is Coin => Boolean(c));
  }, [coins]);

  const analysis = useMemo(() => {
    if (!selectedCoin) return null;
    return computeFomoAnalysis(selectedCoin, coins);
  }, [selectedCoin, coins]);

  if (!isOpen || !selectedCoin || !analysis) return null;

  const pkrRate = fxRates.PKR || 278.5;
  const rawInvest = Math.max(0, Number(investAmountStr) || 0);
  const investUsd = investCurrency === 'PKR' ? rawInvest / pkrRate : rawInvest;
  const hiddenCostLocal = rawInvest * (spreadPct / 100);
  const hiddenCostUsd = investUsd * (spreadPct / 100);
  const netDeployedUsd = Math.max(0, investUsd - hiddenCostUsd);
  const coinsReceived =
    selectedCoin.priceUsd > 0 ? netDeployedUsd / selectedCoin.priceUsd : 0;

  // Exact Coin Price Needed Just to Break Even:
  // coinsReceived * breakEvenPriceUsd === investUsd => breakEvenPriceUsd = priceUsd / (1 - spreadPct / 100)
  const spreadFactor = Math.max(0.01, 1 - spreadPct / 100);
  const breakEvenPriceUsd = selectedCoin.priceUsd / spreadFactor;
  const pumpNeededPct = (1 / spreadFactor - 1) * 100;
  const target10PctProfitPriceUsd = (selectedCoin.priceUsd * 1.1) / spreadFactor;

  // If user buys at midpoint of Smart Dip-Buy Target Zone instead of current market price
  const dipMidUsd = (analysis.dipLowUsd + analysis.dipHighUsd) / 2;
  const dipBreakEvenUsd = dipMidUsd / spreadFactor;
  const dipBonusCoins = dipMidUsd > 0 ? netDeployedUsd / dipMidUsd - coinsReceived : 0;

  const formatInvest = (amt: number, cur: InvestCurrency) => {
    if (cur === 'PKR') {
      return `₨${amt.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    return `$${amt.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const verdictStyles =
    analysis.tone === 'rose'
      ? {
          box: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
          bar: 'bg-rose-500',
          scoreText: 'text-rose-600 dark:text-rose-400',
          icon: <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />,
        }
      : analysis.tone === 'amber'
      ? {
          box: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
          bar: 'bg-amber-500',
          scoreText: 'text-amber-600 dark:text-amber-400',
          icon: <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />,
        }
      : {
          box: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          bar: 'bg-emerald-500',
          scoreText: 'text-emerald-600 dark:text-emerald-400',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
        };

  const handleSwitchCurrency = (next: InvestCurrency) => {
    if (next === investCurrency) return;
    if (next === 'PKR') {
      setInvestAmountStr(String(Math.round(investUsd * pkrRate)));
    } else {
      setInvestAmountStr(String(Math.max(10, Math.round(investUsd))));
    }
    setInvestCurrency(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                Pulser Anti-FOMO &amp; Break-Even Guard™
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Real-time pump trap detector &amp; hidden P2P spread break-even shield
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Anti-FOMO Guard"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Coin Selector & Investment Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Coin Picker */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#121A2C] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CoinLogo coin={selectedCoin} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                        {selectedCoin.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {selectedCoin.symbol}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      Spot {formatPrice(selectedCoin.priceUsd, investCurrency, fxRates)} ·{' '}
                      <span
                        className={
                          selectedCoin.change24h >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {formatPercent(selectedCoin.change24h)} (24h)
                      </span>
                    </div>
                  </div>
                </div>

                {onOpenCoinDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCoinDetail(selectedCoin);
                    }}
                    className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Open Chart →
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={coinSearch}
                    onChange={(e) => setCoinSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && matchingCoins.length > 0) {
                        e.preventDefault();
                        setSelectedCoinId(matchingCoins[0].id);
                        setCoinSearch('');
                      }
                    }}
                    placeholder="Filter 1,000 coins..."
                    className="w-full pl-8 pr-7 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  {coinSearch.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCoinSearch('')}
                      aria-label="Clear coin search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <select
                  value={selectedCoin.id}
                  onChange={(e) => {
                    setSelectedCoinId(e.target.value);
                    setCoinSearch('');
                  }}
                  aria-label="Select cryptocurrency"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {selectOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.rank} {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {coinSearch.trim().length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {matchingCoins.length > 0 ? (
                    matchingCoins.map((c) => {
                      const active = c.id === selectedCoin.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCoinId(c.id);
                            setCoinSearch('');
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-slate-400 w-7 shrink-0">
                              #{c.rank}
                            </span>
                            <CoinLogo coin={c} size="xs" />
                            <span className="font-semibold truncate">{c.name}</span>
                            <span className="font-mono text-[11px] text-slate-400 shrink-0">
                              {c.symbol}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] shrink-0">
                            <span className="text-slate-700 dark:text-slate-200">
                              {formatPrice(c.priceUsd, investCurrency, fxRates)}
                            </span>
                            <span
                              className={
                                c.change24h >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {formatPercent(c.change24h)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      No coins matching &ldquo;{coinSearch.trim()}&rdquo;
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {quickCoins.map((qc) => {
                  const active = qc.id === selectedCoin.id;
                  return (
                    <button
                      key={qc.id}
                      type="button"
                      onClick={() => {
                        setSelectedCoinId(qc.id);
                        setCoinSearch('');
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50'
                      }`}
                    >
                      <CoinLogo coin={qc} size="xs" />
                      <span>{qc.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Planned Investment Input */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#121A2C] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Planned Investment
                </span>
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-900">
                  {(['USD', 'PKR'] as InvestCurrency[]).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => handleSwitchCurrency(cur)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        investCurrency === cur
                          ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-slate-500">
                  {investCurrency === 'PKR' ? '₨' : '$'}
                </span>
                <input
                  type="number"
                  min="1"
                  step={investCurrency === 'PKR' ? '1000' : '50'}
                  value={investAmountStr}
                  onChange={(e) => setInvestAmountStr(e.target.value)}
                  className="w-full pl-8 pr-16 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-400">
                  {investCurrency}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>
                  {investCurrency === 'PKR'
                    ? `≈ ${formatInvest(investUsd, 'USD')}`
                    : `≈ ${formatInvest(investUsd * pkrRate, 'PKR')}`}
                </span>
                <div className="flex items-center gap-1">
                  {(investCurrency === 'PKR'
                    ? [25000, 100000, 500000]
                    : [250, 1000, 5000]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInvestAmountStr(String(preset))}
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500 text-[10px] font-mono text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {investCurrency === 'PKR'
                        ? `₨${(preset / 1000).toFixed(0)}k`
                        : `$${preset.toLocaleString('en-US')}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Split: 1. FOMO & Dump Risk Score + 2. Break-Even & P2P Spread Shield */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Panel 1: Live FOMO & Dump Risk Score */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    1. Live FOMO &amp; Dump Risk Score
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    24h pump velocity, 7d stretch, turnover &amp; whale exchange inflows
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-mono tabular-nums text-2xl font-bold ${verdictStyles.scoreText}`}>
                    {analysis.score}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              {/* Risk Meter Bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${verdictStyles.bar} transition-all`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0 Safe Zone</span>
                  <span>50 Elevated</span>
                  <span>100 Pump Trap</span>
                </div>
              </div>

              {/* Verdict Banner */}
              <div className={`rounded-lg border px-3.5 py-2.5 flex items-start gap-2.5 ${verdictStyles.box}`}>
                {verdictStyles.icon}
                <div>
                  <div className="text-xs font-bold tracking-tight">{analysis.verdict}</div>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                    {analysis.explanation}
                  </p>
                </div>
              </div>

              {/* 4-Factor Telemetry Breakdown */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">24h Price Move</div>
                  <div className="mt-0.5 flex items-center justify-between font-mono tabular-nums">
                    <span
                      className={`font-bold ${
                        selectedCoin.change24h >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(selectedCoin.change24h)}
                    </span>
                    <span className="text-[10px] text-slate-400">{analysis.pump24hRisk}/34 pts</span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">7d Momentum</div>
                  <div className="mt-0.5 flex items-center justify-between font-mono tabular-nums">
                    <span
                      className={`font-bold ${
                        selectedCoin.change7d >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(selectedCoin.change7d)}
                    </span>
                    <span className="text-[10px] text-slate-400">{analysis.momentum7dRisk}/28 pts</span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Vol / MCap Ratio</div>
                  <div className="mt-0.5 flex items-center justify-between font-mono tabular-nums">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {analysis.volToMcapPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400">{analysis.volFrenzyRisk}/20 pts</span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Whale Inflow Bias</div>
                  <div className="mt-0.5 flex items-center justify-between font-mono tabular-nums">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {analysis.whaleInflowSharePct.toFixed(0)}% Inflow
                    </span>
                    <span className="text-[10px] text-slate-400">{analysis.whaleInflowRisk}/18 pts</span>
                  </div>
                </div>
              </div>

              {/* Calculated Smart Dip-Buy Target Zone */}
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/8 px-3.5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <TrendingDown className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                      Smart Dip-Buy Target Zone (-{analysis.dipDiscountPct.toFixed(1)}%)
                    </div>
                    <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatPrice(analysis.dipLowUsd, investCurrency, fxRates)} –{' '}
                      {formatPrice(analysis.dipHighUsd, investCurrency, fxRates)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Waiting for this pullback adds ≈{' '}
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                        +{dipBonusCoins.toLocaleString('en-US', { maximumFractionDigits: 5 })}{' '}
                        {selectedCoin.symbol}
                      </strong>{' '}
                      for the same {formatInvest(rawInvest, investCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: True Break-Even & Local P2P Spread Shield */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    2. True Break-Even &amp; Local P2P Spread Shield
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Exposes hidden entry spread &amp; exact pump required just to hit 0% loss
                  </p>
                </div>
                <Scale className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              </div>

              {/* Slider for Exchange + Local P2P Spread Fee (0.1% to 6%) */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Exchange + Local P2P Spread Fee
                  </span>
                  <span className="font-mono tabular-nums font-bold text-cyan-600 dark:text-cyan-400">
                    {spreadPct.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={6.0}
                  step={0.1}
                  value={spreadPct}
                  onChange={(e) => setSpreadPct(Number(e.target.value))}
                  aria-label="Exchange and local P2P spread fee percentage"
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <button
                    type="button"
                    onClick={() => setSpreadPct(0.1)}
                    className="hover:text-cyan-500 cursor-pointer"
                  >
                    0.1% Direct Spot
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpreadPct(1.5)}
                    className="hover:text-cyan-500 cursor-pointer"
                  >
                    1.5% Card / Ramp
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpreadPct(3.5)}
                    className="hover:text-cyan-500 cursor-pointer font-semibold text-cyan-600 dark:text-cyan-400"
                  >
                    3.5% PKR P2P Default
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpreadPct(6.0)}
                    className="hover:text-cyan-500 cursor-pointer"
                  >
                    6.0% High Spread
                  </button>
                </div>
              </div>

              {/* Upfront Hidden Cost & Net Value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/8 p-3">
                  <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                    Hidden Upfront Cost
                  </div>
                  <div className="mt-1 font-mono tabular-nums text-lg font-bold text-rose-600 dark:text-rose-400">
                    -{formatInvest(hiddenCostLocal, investCurrency)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Lost immediately at {spreadPct.toFixed(1)}% spread
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Net Value Bought ({selectedCoin.symbol})
                  </div>
                  <div className="mt-1 font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white">
                    {coinsReceived.toLocaleString('en-US', {
                      maximumFractionDigits: selectedCoin.priceUsd < 1 ? 2 : 5,
                    })}{' '}
                    {selectedCoin.symbol}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Worth {formatInvest(rawInvest - hiddenCostLocal, investCurrency)} at spot
                  </div>
                </div>
              </div>

              {/* Exact Coin Price & % Pump Needed Just to Break Even */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Exact Break-Even Price ({selectedCoin.symbol})</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-xs font-bold text-amber-600 dark:text-amber-400">
                    <ArrowDownRight className="w-3.5 h-3.5 rotate-[-90deg]" />
                    +{pumpNeededPct.toFixed(2)}% Pump Needed
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                    {formatPrice(breakEvenPriceUsd, investCurrency, fxRates)}
                  </div>
                  <div className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                    {investCurrency === 'PKR' ? 'USD' : 'PKR'}:{' '}
                    {formatPrice(
                      breakEvenPriceUsd,
                      investCurrency === 'PKR' ? 'USD' : 'PKR',
                      fxRates
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                  <div>
                    <span className="font-sans text-slate-500 dark:text-slate-400">
                      For +10% Real Profit:{' '}
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {formatPrice(target10PctProfitPriceUsd, investCurrency, fxRates)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="font-sans text-slate-500 dark:text-slate-400">
                      If Bought at Dip:{' '}
                    </span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatPrice(dipBreakEvenUsd, investCurrency, fxRates)}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Buying {selectedCoin.symbol} at{' '}
                <strong className="font-mono text-slate-700 dark:text-slate-200">
                  {formatPrice(selectedCoin.priceUsd, investCurrency, fxRates)}
                </strong>{' '}
                with a {spreadPct.toFixed(1)}% P2P/exchange spread requires{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  +{pumpNeededPct.toFixed(2)}%
                </strong>{' '}
                price appreciation just to recover your starting {investCurrency}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
