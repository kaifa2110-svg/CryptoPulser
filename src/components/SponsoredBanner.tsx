import React from 'react';
import { ArrowUpRight, Megaphone, ShieldCheck, Layers } from 'lucide-react';

interface SponsoredBannerProps {
  variant: 'vault' | 'liquidity';
  isPro: boolean;
  onOpenAdvertise: () => void;
  onOpenProModal: () => void;
}

export const SponsoredBanner: React.FC<SponsoredBannerProps> = ({
  variant,
  isPro,
  onOpenAdvertise,
  onOpenProModal,
}) => {
  // Hidden automatically on Pulser Pro Ad-Free Mode
  if (isPro) return null;

  const isVault = variant === 'vault';

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624]">
      <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-4 relative min-h-[120px] bg-slate-900 overflow-hidden">
          <img
            src={
              isVault
                ? '/src/assets/images/sponsor_vault_banner_1795501196764.jpg'
                : '/src/assets/images/sponsor_liquidity_banner_1795501197781.jpg'
            }
            alt={isVault ? 'Aegis Cold Storage Hardware Vault' : 'Meridian Institutional Liquidity Router'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/40" />
        </div>

        <div className="md:col-span-8 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Sponsored Placement</span>
              <span aria-hidden="true">·</span>
              <span>{isVault ? 'Hardware Security' : 'Institutional Execution'}</span>
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {isVault ? (
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span>
                {isVault
                  ? 'Aegis Titanium Vault — Air-Gapped Multi-Sig Custody for Serious Portfolios'
                  : 'Meridian Zero-Slippage Router — Deep On-Chain Liquidity Across 14 Chains'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              {isVault
                ? 'Secure BTC, ETH, and SPL assets offline with EAL6+ hardware verification and instant PSBT signing.'
                : 'Institutional MEV-protected order routing for swaps over $50k with real-time execution proofs.'}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAdvertise}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Advertise Here</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenProModal}
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Remove ads with Pulser Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
