import React, { useState } from 'react';
import { CheckCircle2, Megaphone, X } from 'lucide-react';
import { CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency } from '../utils/formatters';

interface AdvertiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  fxRates: FxRates;
}

export const AdvertiseModal: React.FC<AdvertiseModalProps> = ({
  isOpen,
  onClose,
  currency,
  fxRates,
}) => {
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [slot, setSlot] = useState<'header' | 'workspace'>('header');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-emerald-500" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Advertise on Crypto Pulser
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advertise modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Campaign Inquiry Received
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Our sponsorships desk will reach out to <span className="font-mono">{email}</span> with media kit availability for {brandName}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setBrandName('');
                  setEmail('');
                  onClose();
                }}
                className="mt-2 px-5 py-2 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Reach active crypto traders, DeFi researchers, and institutional analysts on our Free Tier placements.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSlot('header')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    slot === 'header'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Top Hero Banner
                  </div>
                  <div className="font-mono tabular-nums text-emerald-500 font-bold mt-1">
                    {formatCompactCurrency(450, currency, fxRates)} / week
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ~120K weekly views
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSlot('workspace')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    slot === 'workspace'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Workspace Feature Slot
                  </div>
                  <div className="font-mono tabular-nums text-emerald-500 font-bold mt-1">
                    {formatCompactCurrency(280, currency, fxRates)} / week
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ~75K weekly views
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Protocol / Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Aegis Custody"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partnerships@protocol.io"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-semibold cursor-pointer hover:opacity-90"
              >
                Request Placement Slot
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
