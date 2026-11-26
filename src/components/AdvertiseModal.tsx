import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Megaphone,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import {
  CurrencyCode,
  CustomSponsoredAd,
  FxRates,
  SponsoredAdSlot,
} from '../types/crypto';
import { formatCompactCurrency } from '../utils/formatters';
import {
  SAFE_IMAGE_ACCEPT_ATTR,
  sanitizeHttpUrl,
  sanitizeSafeImageUrl,
  validateSafeImageFile,
} from '../utils/sanitize';

interface AdvertiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  fxRates: FxRates;
  initialSlot?: SponsoredAdSlot;
  initialMode?: 'customize' | 'inquiry';
  customAds?: Partial<Record<SponsoredAdSlot, CustomSponsoredAd>>;
  onSaveCustomAd?: (ad: CustomSponsoredAd) => void;
  onResetCustomAd?: (slot: SponsoredAdSlot) => void;
}

const SLOT_LABELS: Array<{ id: SponsoredAdSlot; title: string; subtitle: string }> = [
  { id: 'vault', title: 'Top Markets Banner', subtitle: 'Above Top 1000 table' },
  { id: 'pulser-square', title: 'Pulser Square Feed', subtitle: 'Inside community feed' },
  { id: 'liquidity', title: 'Simulator Feature Slot', subtitle: 'Above What-If Simulator' },
];

export const AdvertiseModal: React.FC<AdvertiseModalProps> = ({
  isOpen,
  onClose,
  currency,
  fxRates,
  initialSlot = 'vault',
  initialMode = 'customize',
  customAds = {},
  onSaveCustomAd,
  onResetCustomAd,
}) => {
  const [mode, setMode] = useState<'customize' | 'inquiry'>(initialMode);

  // Customize / Upload Ad Banner state
  const [selectedSlot, setSelectedSlot] = useState<SponsoredAdSlot>(initialSlot);
  const [sponsorLabel, setSponsorLabel] = useState('Featured Partner · CryptoPulser Sponsor');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Visit Sponsor');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [adFormError, setAdFormError] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  // Inquiry state
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [inquirySlot, setInquirySlot] = useState<'header' | 'workspace'>('header');
  const [submitted, setSubmitted] = useState(false);

  const hydrateFromSlot = (slot: SponsoredAdSlot) => {
    const existing = customAds[slot];
    if (existing) {
      setSponsorLabel(existing.sponsorLabel);
      setHeadline(existing.headline);
      setDescription(existing.description);
      setTargetUrl(existing.targetUrl);
      setCtaLabel(existing.ctaLabel || 'Visit Sponsor');
      setBannerImageUrl(existing.imageUrl);
      setImageUrlInput(existing.imageUrl.startsWith('data:') ? '' : existing.imageUrl);
    } else {
      setSponsorLabel(
        slot === 'pulser-square'
          ? 'Sponsored Placement · Pulser Square Partner'
          : slot === 'liquidity'
          ? 'Sponsored Placement · Execution Partner'
          : 'Sponsored Placement · Featured Partner'
      );
      setHeadline('');
      setDescription('');
      setTargetUrl('');
      setCtaLabel('Explore Now');
      setBannerImageUrl('');
      setImageUrlInput('');
    }
    setAdFormError(null);
    setPreviewBroken(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setSelectedSlot(initialSlot);
    hydrateFromSlot(initialSlot);
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSlot, initialMode]);

  if (!isOpen) return null;

  const handleBannerFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = validateSafeImageFile(file);
    if (!check.valid) {
      setAdFormError(check.error);
      return;
    }
    setAdFormError(null);
    setPreviewBroken(false);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerImageUrl(reader.result);
        setImageUrlInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyBannerImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) {
      setBannerImageUrl('');
      setAdFormError(null);
      return;
    }
    const safeUrl = sanitizeSafeImageUrl(trimmed, true);
    if (!safeUrl) {
      setAdFormError('Enter a valid https:// or http:// raster image URL (PNG, JPEG, WebP, GIF).');
      return;
    }
    setAdFormError(null);
    setPreviewBroken(false);
    setBannerImageUrl(safeUrl);
  };

  const handleSaveCustomBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHeadline = headline.trim();
    if (!cleanHeadline) {
      setAdFormError('Please enter a banner headline.');
      return;
    }

    const cleanTarget = targetUrl.trim();
    let verifiedTargetUrl = '';
    if (cleanTarget) {
      const safeTarget = sanitizeHttpUrl(cleanTarget);
      if (!safeTarget) {
        setAdFormError('Please enter a valid target URL (e.g. https://yourprotocol.com).');
        return;
      }
      verifiedTargetUrl = safeTarget;
    }

    let finalImageUrl = bannerImageUrl;
    if (!finalImageUrl && imageUrlInput.trim()) {
      const safeUrl = sanitizeSafeImageUrl(imageUrlInput.trim(), true);
      if (!safeUrl) {
        setAdFormError('Please enter a valid https:// image URL or upload an image file.');
        return;
      }
      finalImageUrl = safeUrl;
    }

    const newAd: CustomSponsoredAd = {
      id: `ad-${selectedSlot}-${Date.now()}`,
      slot: selectedSlot,
      sponsorLabel: sponsorLabel.trim() || 'Sponsored Placement · Featured Partner',
      headline: cleanHeadline,
      description:
        description.trim() ||
        'Featured ecosystem partner on CryptoPulser.com real-time crypto analytics.',
      imageUrl: finalImageUrl || '/src/assets/images/sponsor_vault_banner_1795501196764.jpg',
      targetUrl: verifiedTargetUrl,
      ctaLabel: ctaLabel.trim() || 'Visit Sponsor',
      updatedAt: new Date().toISOString(),
    };

    onSaveCustomAd?.(newAd);
    onClose();
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !email.trim()) return;
    setSubmitted(true);
  };

  const safePreviewImage = sanitizeSafeImageUrl(
    bannerImageUrl || (imageUrlInput.trim() ? sanitizeSafeImageUrl(imageUrlInput.trim(), true) : ''),
    true
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-emerald-500" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Sponsored Banner &amp; Ad Slot Manager
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

        {/* Mode Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-xs">
            <button
              type="button"
              onClick={() => setMode('customize')}
              className={`py-2 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                mode === 'customize'
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Upload Ad Banner / Customize Ad
            </button>
            <button
              type="button"
              onClick={() => setMode('inquiry')}
              className={`py-2 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                mode === 'inquiry'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Book Sponsored Slot
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {mode === 'customize' ? (
            <form onSubmit={handleSaveCustomBanner} className="space-y-4">
              {/* Target Slot Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Banner Placement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SLOT_LABELS.map((slotItem) => {
                    const active = selectedSlot === slotItem.id;
                    const hasCustom = Boolean(customAds[slotItem.id]);
                    return (
                      <button
                        key={slotItem.id}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slotItem.id);
                          hydrateFromSlot(slotItem.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {slotItem.title}
                          </span>
                          {hasCustom && (
                            <span className="text-[10px] font-mono text-emerald-500 font-bold">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {slotItem.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Banner Image Upload + URL */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B101C] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Ad Banner Image (File Upload or URL)</span>
                  </span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-xs font-semibold cursor-pointer hover:opacity-90">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Banner Image</span>
                    <input
                      type="file"
                      accept={SAFE_IMAGE_ACCEPT_ATTR}
                      onChange={handleBannerFilePick}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Or paste image URL (https://example.com/banner.png)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBannerImageUrl}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500 cursor-pointer shrink-0"
                  >
                    Preview URL
                  </button>
                </div>

                {/* Live Banner Preview */}
                {safePreviewImage && !previewBroken && (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 h-28 bg-slate-900">
                    <img
                      src={safePreviewImage}
                      alt="Uploaded ad banner preview"
                      referrerPolicy="no-referrer"
                      onError={() => setPreviewBroken(true)}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBannerImageUrl('');
                        setImageUrlInput('');
                        setPreviewBroken(false);
                      }}
                      aria-label="Clear banner image"
                      className="absolute top-2 right-2 p-1 rounded-md bg-slate-950/80 text-white hover:bg-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Banner Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Zero-Fee Perpetuals on Arbitrum"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sponsor Label
                  </label>
                  <input
                    type="text"
                    value={sponsorLabel}
                    onChange={(e) => setSponsorLabel(e.target.value)}
                    placeholder="Sponsored Placement · Featured Partner"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Supporting Tagline
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description shown below the banner headline..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target URL
                  </label>
                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://yourprotocol.com"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Visit Sponsor"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {adFormError && (
                <p className="text-xs text-rose-500 font-medium">{adFormError}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {customAds[selectedSlot] && onResetCustomAd ? (
                  <button
                    type="button"
                    onClick={() => {
                      onResetCustomAd(selectedSlot);
                      hydrateFromSlot(selectedSlot);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-500 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Slot to Default</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Saved locally &amp; applied immediately to CryptoPulser.com
                  </span>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-bold cursor-pointer hover:opacity-90"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Publish Live Ad Banner</span>
                </button>
              </div>
            </form>
          ) : submitted ? (
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
            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Reach active crypto traders, DeFi researchers, and institutional analysts across CryptoPulser.com placements.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setInquirySlot('header')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    inquirySlot === 'header'
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
                  onClick={() => setInquirySlot('workspace')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    inquirySlot === 'workspace'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Pulser Square &amp; Feature Slot
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
