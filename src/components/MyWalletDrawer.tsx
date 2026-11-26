import React from 'react';
import { ShieldCheck, Wallet, X } from 'lucide-react';
import { useUserAccount } from '../context/UserAccountContext';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { VerifiedWalletManager } from './VerifiedWalletManager';

interface MyWalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coins: Coin[];
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  fxRates: FxRates;
  onDeepXrayInWhaleSonar: (address: string) => void;
}

export const MyWalletDrawer: React.FC<MyWalletDrawerProps> = ({
  isOpen,
  onClose,
  coins,
  currency,
  onChangeCurrency,
  fxRates,
  onDeepXrayInWhaleSonar,
}) => {
  const { verifiedWallets } = useUserAccount();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="My Verified Wallet"
        className="w-full max-w-lg h-full bg-white dark:bg-[#0E1422] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  My Verified Wallets
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  1-Click Web3 Connect, Live RPC Balances &amp; Receive QR ({verifiedWallets.length} Linked)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close My Wallet"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Non-Custodial Signature Verification • Zero Private Keys Stored</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <VerifiedWalletManager
            coins={coins}
            currency={currency}
            onChangeCurrency={onChangeCurrency}
            fxRates={fxRates}
            onDeepXrayInWhaleSonar={onDeepXrayInWhaleSonar}
          />
        </div>
      </aside>
    </div>
  );
};
