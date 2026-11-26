import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ImagePlus,
  Layers,
  Megaphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CustomSponsoredAd, SponsoredAdSlot } from '../types/crypto';
import { sanitizeHttpUrl, sanitizeSafeImageUrl } from '../utils/sanitize';

interface SponsoredBannerProps {
  variant: SponsoredAdSlot;
  isPro: boolean;
  customAd?: CustomSponsoredAd | null;
  onOpenAdvertise: () => void;
  onCustomizeAd?: (slot: SponsoredAdSlot) => void;
  onOpenProModal: () => void;
}

const DEFAULT_AD_META: Record<
  SponsoredAdSlot,
  {
    sponsorLabel: string;
    headline: string;
    description: string;
    imageUrl: string;
    alt: string;
  }
> = {
  vault: {
    sponsorLabel: 'Sponsored Placement · Hardware Security',
    headline: 'Aegis Titanium Vault — Air-Gapped Multi-Sig Custody for Serious Portfolios',
    description:
      'Secure BTC, ETH, and SPL assets offline with EAL6+ hardware verification and instant PSBT signing.',
    imageUrl: '/src/assets/images/sponsor_vault_banner_1795501196764.jpg',
    alt: 'Aegis Cold Storage Hardware Vault',
  },
  'pulser-square': {
    sponsorLabel: 'Sponsored Placement · Pulser Square Partner',
    headline: 'Advertise / Sponsor Banner — Feature Your Protocol Across Pulser Square',
    description:
      'Upload a custom banner image, set your campaign headline, and route active crypto traders straight to your protocol.',
    imageUrl: '/src/assets/images/sponsor_liquidity_banner_1795501197781.jpg',
    alt: 'CryptoPulser Sponsored Placement Banner',
  },
  liquidity: {
    sponsorLabel: 'Sponsored Placement · Institutional Execution',
    headline: 'Meridian Zero-Slippage Router — Deep On-Chain Liquidity Across 14 Chains',
    description:
      'Institutional MEV-protected order routing for swaps over $50k with real-time execution proofs.',
    imageUrl: '/src/assets/images/sponsor_liquidity_banner_1795501197781.jpg',
    alt: 'Meridian Institutional Liquidity Router',
  },
};

export const SponsoredBanner: React.FC<SponsoredBannerProps> = ({
  variant,
  isPro,
  customAd,
  onOpenAdvertise,
  onCustomizeAd,
  onOpenProModal,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const defaults = DEFAULT_AD_META[variant];
  const rawImg = customAd?.imageUrl || defaults.imageUrl;
  const safeImgUrl = sanitizeSafeImageUrl(rawImg, true);
  const safeTargetUrl = customAd ? sanitizeHttpUrl(customAd.targetUrl) : null;

  useEffect(() => {
    setImgFailed(false);
  }, [rawImg, variant]);

  // Hide default built-in ads in Ad-Free Pro Mode, while allowing custom sponsor previews
  if (isPro && !customAd) return null;

  const sponsorLabel = customAd?.sponsorLabel?.trim() || defaults.sponsorLabel;
  const headline = customAd?.headline?.trim() || defaults.headline;
  const description = customAd?.description?.trim() || defaults.description;
  const ctaLabel = customAd?.ctaLabel?.trim() || 'Visit Sponsor';

  const renderSlotIcon = () => {
    if (customAd) return <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />;
    if (variant === 'vault') return <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />;
    if (variant === 'pulser-square') return <Megaphone className="w-4 h-4 text-cyan-500 shrink-0" />;
    return <Layers className="w-4 h-4 text-emerald-500 shrink-0" />;
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624]">
      <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-4 relative min-h-[124px] max-h-[190px] bg-slate-900 overflow-hidden">
          {safeImgUrl && !imgFailed ? (
            <img
              src={safeImgUrl}
              alt={customAd ? headline : defaults.alt}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[124px] flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-900 via-[#0E182B] to-cyan-950/60 text-cyan-300 px-4 text-center">
              <Megaphone className="w-6 h-6 text-cyan-400" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                Sponsor Banner Slot
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/40 pointer-events-none" />
        </div>

        <div className="md:col-span-8 min-w-0 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{sponsorLabel}</span>
              {customAd && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                    Custom Banner Active
                  </span>
                </>
              )}
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {renderSlotIcon()}
              <span className="truncate sm:whitespace-normal">{headline}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              {description}
            </p>
            {safeTargetUrl && (
              <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 truncate">
                {safeTargetUrl.replace(/^https?:\/\//i, '')}
              </div>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {safeTargetUrl && (
                <a
                  href={safeTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{ctaLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}

              {onCustomizeAd && (
                <button
                  type="button"
                  onClick={() => onCustomizeAd(variant)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-cyan-500/45 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{customAd ? 'Customize Ad' : 'Upload Ad Banner'}</span>
                </button>
              )}

              {!safeTargetUrl && (
                <button
                  type="button"
                  onClick={onOpenAdvertise}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Advertise Here</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {safeTargetUrl && (
                <button
                  type="button"
                  onClick={onOpenAdvertise}
                  className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Book Slot
                </button>
              )}
              {!isPro && (
                <button
                  type="button"
                  onClick={onOpenProModal}
                  className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Remove ads with Pulser Pro
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
