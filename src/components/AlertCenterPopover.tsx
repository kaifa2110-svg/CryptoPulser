import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Plus, Trash2, X, Zap } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import {
  AlertKind,
  AlertToast,
  Coin,
  CurrencyCode,
  FxRates,
  PriceWhaleAlert,
} from '../types/crypto';
import { CURRENCY_META, convertUsd, formatPrice } from '../utils/formatters';
import { StealthValue } from './StealthText';

interface AlertCenterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  coins: Coin[];
  initialCoin: Coin | null;
  initialKind?: AlertKind;
  currency: CurrencyCode;
  fxRates: FxRates;
  alerts: PriceWhaleAlert[];
  onAddAlert: (alert: PriceWhaleAlert) => void;
  onRemoveAlert: (id: string) => void;
  onTestTrigger: (alert: PriceWhaleAlert) => void;
}

export const AlertCenterPopover: React.FC<AlertCenterPopoverProps> = ({
  isOpen,
  onClose,
  coins,
  initialCoin,
  initialKind = 'price_above',
  currency,
  fxRates,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onTestTrigger,
}) => {
  const { stealthMode } = usePrivacy();
  const [selectedCoinId, setSelectedCoinId] = useState<string>(
    initialCoin?.id || coins[0]?.id || 'bitcoin'
  );
  const [kind, setKind] = useState<AlertKind>(initialKind);
  const [thresholdInput, setThresholdInput] = useState<string>('');

  const targetCoin =
    coins.find((c) => c.id === selectedCoinId) || initialCoin || coins[0];

  useEffect(() => {
    if (initialCoin) {
      setSelectedCoinId(initialCoin.id);
    }
    setKind(initialKind);
  }, [initialCoin, initialKind, isOpen]);

  useEffect(() => {
    if (!targetCoin) return;
    if (kind === 'whale_transfer') {
      const defLocal = Math.round(convertUsd(5_000_000, currency, fxRates));
      setThresholdInput(String(defLocal));
    } else {
      const mult = kind === 'price_above' ? 1.03 : 0.97;
      const val = convertUsd(targetCoin.priceUsd * mult, currency, fxRates);
      setThresholdInput(val >= 10 ? val.toFixed(2) : val.toFixed(4));
    }
  }, [targetCoin?.id, kind, currency]);

  if (!isOpen || !targetCoin) return null;

  const rate = fxRates[currency] || 1;
  const meta = CURRENCY_META[currency];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const numericLocal = Number(thresholdInput);
    if (!Number.isFinite(numericLocal) || numericLocal <= 0) return;

    const newAlert: PriceWhaleAlert = {
      id: `alert-${Date.now()}`,
      kind,
      coinId: targetCoin.id,
      symbol: targetCoin.symbol,
      coinName: targetCoin.name,
      thresholdUsd: numericLocal / rate,
      createdInCurrency: currency,
      displayThreshold: numericLocal,
      active: true,
      createdAt: new Date().toISOString(),
    };
    onAddAlert(newAlert);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mt-12 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1422] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#121A2B]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Price &amp; Whale Alert Bell
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Real-time alerts in {currency} ({meta.symbol.trim()})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert center"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create New Alert Form */}
        <form onSubmit={handleCreate} className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Asset
              </label>
              <select
                value={targetCoin.id}
                onChange={(e) => setSelectedCoinId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
              >
                {coins.slice(0, 100).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.symbol} · {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Trigger Condition
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AlertKind)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="price_above">Price Above</option>
                <option value="price_below">Price Below</option>
                <option value="whale_transfer">Whale Transfer ≥</option>
              </select>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>
                  {kind === 'whale_transfer'
                    ? `Min Transfer (${currency})`
                    : `Target Price (${currency})`}
                </span>
                <span className="font-mono">
                  Live: {formatPrice(targetCoin.priceUsd, currency, fxRates)}
                </span>
              </div>
              <input
                type={stealthMode ? 'password' : 'number'}
                step="any"
                required
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  stealthMode ? 'blur-[2px]' : ''
                }`}
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Alert</span>
            </button>
          </div>
        </form>

        {/* Active Alerts List */}
        <div className="p-4 max-h-72 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Active &amp; Triggered Alerts ({alerts.length})</span>
          </div>

          {alerts.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No active alerts yet. Set a target price or whale transfer threshold above.
            </div>
          ) : (
            alerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131B2E] flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <span>{al.symbol}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-cyan-600 dark:text-cyan-400">
                      {al.kind === 'price_above'
                        ? 'Above'
                        : al.kind === 'price_below'
                        ? 'Below'
                        : 'Whale ≥'}
                    </span>
                    <span className="font-mono tabular-nums">
                      <StealthValue>
                        {CURRENCY_META[al.createdInCurrency].symbol}
                        {al.displayThreshold.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}
                      </StealthValue>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    {al.triggeredAt ? (
                      <span className="text-emerald-500 inline-flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Triggered
                      </span>
                    ) : (
                      <span>Monitoring live feed</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTestTrigger(al)}
                    title="Trigger instant toast notification"
                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveAlert(al.id)}
                    aria-label="Delete alert"
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface AlertToastStackProps {
  toasts: AlertToast[];
  onDismiss: (id: string) => void;
}

export const AlertToastStack: React.FC<AlertToastStackProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl border border-cyan-500/40 bg-white dark:bg-[#101829] p-3.5 shadow-2xl flex items-start justify-between gap-3"
          style={{ boxShadow: '0 0 18px rgba(34, 211, 238, 0.18)' }}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <Bell className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {t.title}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                {t.message}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
