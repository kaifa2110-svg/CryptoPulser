import React, { useEffect } from 'react';
import { Check, Clock, CreditCard, Crown, Sparkles, X } from 'lucide-react';
import { CurrencyCode, FxRates, PlanTier } from '../types/crypto';
import { CURRENCY_META, formatPlanCurrencyAmount } from '../utils/formatters';

interface ProPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  fxRates: FxRates;
  activePlan: PlanTier;
  onQuickUnlockPlan: (plan: PlanTier) => void;
  trialEndsAt: number | null;
  nowMs: number;
  onStartCheckout: (plan: 'pro' | 'pro_max', useTrial: boolean) => void;
  onCancelTrial: () => void;
}

const PLAN_MATRIX = [
  {
    feature: 'Top 1000 Live Markets & TradingView Charts',
    free: 'Full Access',
    pro: 'Full Access',
    proMax: 'Full Access',
  },
  {
    feature: 'Pulser Square Community Feed',
    free: 'Full Access',
    pro: 'Full Access',
    proMax: 'Full Access',
  },
  {
    feature: 'Investment Simulator & CSV Export',
    free: '7D & 30D Only',
    pro: '90D, 1Y, 3Y, 5Y + CSV',
    proMax: '90D, 1Y, 3Y, 5Y + CSV',
  },
  {
    feature: 'Pulser Bubble Radar™ & Whale Sonar™',
    free: 'Locked / Preview',
    pro: 'Full Access + Trails',
    proMax: 'Full Access + Trails',
  },
  {
    feature: 'Ad-Free Terminal Experience',
    free: 'Sponsored Ads Shown',
    pro: '100% Ad-Free',
    proMax: '100% Ad-Free',
  },
  {
    feature: 'Ask Crypto Pulser AI',
    free: '5 Basic Queries / Day',
    pro: '5 Basic Queries / Day',
    proMax: 'Unlimited + 4 AI Copilots',
  },
  {
    feature: 'Stealth Mode (Alt+H), Local Key Vault & Panic Wipe',
    free: 'Full Access',
    pro: 'Full Access',
    proMax: 'Full Access',
  },
  {
    feature: 'Smart Auto-Lock Shield (15s/60s/5m + 4-Digit PIN)',
    free: 'Locked (Pro Tier)',
    pro: 'Unlocked',
    proMax: 'Unlocked',
  },
  {
    feature: 'Zero-Trace Incognito Mode',
    free: 'Locked (Pro Tier)',
    pro: 'Unlocked',
    proMax: 'Unlocked',
  },
];

function formatCountdown(remainingMs: number) {
  const clamped = Math.max(0, remainingMs);
  const totalSec = Math.floor(clamped / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return {
    daysLeft: Math.max(1, Math.ceil(clamped / 86400000)),
    clockText: `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(
      2,
      '0'
    )}m ${String(secs).padStart(2, '0')}s`,
  };
}

export const ProPricingModal: React.FC<ProPricingModalProps> = ({
  isOpen,
  onClose,
  currency,
  fxRates,
  activePlan,
  onQuickUnlockPlan,
  trialEndsAt,
  nowMs,
  onStartCheckout,
  onCancelTrial,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const proMonthly = `${formatPlanCurrencyAmount(10, currency, fxRates)}/mo`;
  const proMaxMonthly = `${formatPlanCurrencyAmount(25, currency, fxRates)}/mo`;
  const zeroDue = `${CURRENCY_META[currency].symbol}0.00`;
  const isTrialActive = Boolean(trialEndsAt && trialEndsAt > nowMs);
  const remainingMs = isTrialActive && trialEndsAt ? trialEndsAt - nowMs : 0;
  const { daysLeft, clockText } = formatCountdown(remainingMs);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[93vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
              <Crown className="w-4 h-4" />
              <span>CryptoPulser Membership Plans</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Free ({zeroDue}) · Pulser Pro ({proMonthly}) · Pulser Pro Max ({proMaxMonthly})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pay securely via Visa / Mastercard or Multi-Chain Crypto (USDT, USDC, BTC, ETH, SOL). Save 20% with annual billing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pricing modal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Trial Status Banner if Active */}
        {isTrialActive && trialEndsAt && (
          <div className="mx-6 mt-5 p-4 rounded-xl border border-cyan-500/35 bg-cyan-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Pro Trial Active • {daysLeft} {daysLeft === 1 ? 'Day' : 'Days'} Left
                </span>
              </div>
              <div className="font-mono tabular-nums text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                Countdown: {clockText} · Expires {new Date(trialEndsAt).toLocaleString()}
              </div>
            </div>

            <button
              type="button"
              onClick={onCancelTrial}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Cancel / Revert to Free
            </button>
          </div>
        )}

        {/* 3 Plan Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Tier */}
          <div
            className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 ${
              activePlan === 'free'
                ? 'border-slate-400 dark:border-slate-500 bg-slate-50/70 dark:bg-[#131B2E]'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Starter Plan
              </div>
              <div className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Free Tier
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                {zeroDue} <span className="text-xs font-normal text-slate-500">/mo</span>
              </div>
              <ul className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Top 1000 Live Markets &amp; TradingView Charts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>7D &amp; 30D Investment Simulator</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>5 daily basic queries in Ask Crypto Pulser AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Stealth Mode (Alt+H), Local API Key Vault &amp; Panic Wipe</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Pulser Square Feed &amp; Sponsored Ads</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onQuickUnlockPlan('free')}
              className="w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {activePlan === 'free' ? 'Current Plan (Free)' : 'Revert to Free'}
            </button>
          </div>

          {/* Pulser Pro ($10/mo + 7-Day Free Trial) */}
          <div
            className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 ${
              activePlan === 'pro'
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-cyan-500/40 bg-slate-50/40 dark:bg-[#10192B]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-cyan-500">
                7-Day Free Trial Included
              </div>
              <div className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Pulser Pro
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                {proMonthly}
              </div>
              <ul className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                  <span>Pulser Whale Sonar™ &amp; Multi-Hop Trails</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                  <span>Pulser Bubble Radar™ &amp; 0x Wallet Tracer</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                  <span>90D, 1Y, 3Y, 5Y Deep History + CSV Export</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                  <span>Smart Auto-Lock (15s–5m + PIN) &amp; Incognito Mode</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                  <span>100% Ad-Free Terminal (5 daily basic AI queries)</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onStartCheckout('pro', true)}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Start 7-Day Free Trial
              </button>
              <button
                type="button"
                onClick={() => onStartCheckout('pro', false)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-cyan-500/40 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 text-xs font-semibold cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Subscribe to Pro ($10/mo)</span>
              </button>
            </div>
          </div>

          {/* Pulser Pro Max ($25/mo - Full Advanced AI Suite) */}
          <div
            className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 ${
              activePlan === 'pro_max'
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-emerald-500/40 bg-slate-50/40 dark:bg-[#0F1B24]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-emerald-500">
                Full Advanced AI Suite
              </div>
              <div className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Pulser Pro Max
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                {proMaxMonthly}
              </div>
              <ul className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Everything in Pulser Pro ($10/mo)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>AI Trade Signal &amp; Entry/Exit Copilot</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>AI Whale &amp; Bubble Anomaly Detector</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>AI Portfolio Advisor &amp; Market News Digest (Unlimited)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onStartCheckout('pro_max', false)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Subscribe to Pro Max ($25/mo)</span>
            </button>
          </div>
        </div>

        {/* Judge / Demo Quick-Unlock Toggles */}
        <div className="mx-6 mb-5 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Judge / Demo Quick-Unlock Toggles
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                Instantly switch between Free ($0), Pulser Pro ($10), and Pulser Pro Max ($25) to test all features in one click.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onQuickUnlockPlan('pro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activePlan === 'pro'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-cyan-500/40 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              Unlock Pro ($10)
            </button>
            <button
              type="button"
              onClick={() => onQuickUnlockPlan('pro_max')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activePlan === 'pro_max'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              Unlock Pro Max ($25)
            </button>
            {activePlan !== 'free' && (
              <button
                type="button"
                onClick={() => onQuickUnlockPlan('free')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Reset Free
              </button>
            )}
          </div>
        </div>

        {/* Comparison Matrix */}
        <div className="px-6 pb-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <th className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                    Capability
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                    Free ({zeroDue})
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-cyan-600 dark:text-cyan-400">
                    Pulser Pro ({proMonthly})
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                    Pulser Pro Max ({proMaxMonthly})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {PLAN_MATRIX.map((row) => (
                  <tr key={row.feature}>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {row.feature}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{row.free}</td>
                    <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                      {row.pro}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {row.proMax}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
