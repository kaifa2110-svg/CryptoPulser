import React from 'react';
import { Bell, Clock, Crown, LogIn, ShieldAlert, Sparkles, Wallet } from 'lucide-react';
import { useUserAccount } from '../context/UserAccountContext';
import { CurrencyCode, FxRates, NavTab, PlanTier } from '../types/crypto';
import { formatProMonthlyPrice } from '../utils/formatters';
import { PrivacyShieldControl } from './PrivacyShieldControl';
import { PulsarLogo } from './PulsarLogo';
import { UserAvatar } from './UserAvatar';

interface TopBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onJumpToSimulator: () => void;
  currency: CurrencyCode;
  fxRates: FxRates;
  activePlan: PlanTier;
  isTrialActive: boolean;
  trialDaysLeft: number;
  onOpenProModal: () => void;
  activeAlertCount: number;
  onOpenAlertCenter: () => void;
  onOpenAntiFomoGuard: () => void;
  onOpenMyWallet: () => void;
  savedWalletCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onJumpToSimulator,
  currency,
  fxRates,
  activePlan,
  isTrialActive,
  trialDaysLeft,
  onOpenProModal,
  activeAlertCount,
  onOpenAlertCenter,
  onOpenAntiFomoGuard,
  onOpenMyWallet,
  savedWalletCount,
}) => {
  const { currentUser, setAuthModalOpen, setProfileDrawerOpen } = useUserAccount();
  const proPriceLabel = formatProMonthlyPrice(currency, fxRates);
  const isProMax = activePlan === 'pro_max';
  const isPro = activePlan === 'pro' || isProMax;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-md">
      <div className="w-full max-w-[1440px] mx-auto px-4 h-14 flex items-center justify-between gap-3 flex-nowrap">
        {/* Zone 1: Pulsar Star Logo + CryptoPulser.com wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('top1000')}
          className="inline-flex items-center gap-2 font-display text-sm sm:text-base xl:text-[17px] font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
        >
          <PulsarLogo size={28} />
          <span>CryptoPulser.com</span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden xl:flex items-center gap-3.5 2xl:gap-5 text-[13px] font-medium text-slate-600 dark:text-slate-400 flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('top1000')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'top1000'
                ? 'border-emerald-500 text-slate-900 dark:text-slate-100'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Markets
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('pulser-square')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pulser-square'
                ? 'border-emerald-500 text-slate-900 dark:text-slate-100'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Pulser Square
          </button>
          <button
            type="button"
            onClick={onJumpToSimulator}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Simulator
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('bubble-radar')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'bubble-radar'
                ? 'border-emerald-500 text-slate-900 dark:text-slate-100'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Bubble Radar
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('whale-sonar')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'whale-sonar'
                ? 'border-emerald-500 text-slate-900 dark:text-slate-100'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Whale Sonar
          </button>
        </nav>

        {/* Zone 3: Anti-FOMO Guard + Local & Private Suite + My Wallet + Alert Bell + Primary CTA */}
        <div className="flex items-center gap-2 2xl:gap-2.5 flex-nowrap shrink-0">
          <button
            type="button"
            onClick={onOpenAntiFomoGuard}
            title="Pulser Anti-FOMO & Break-Even Guard™"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden 2xl:inline">Anti-FOMO Guard</span>
            <span className="hidden md:inline 2xl:hidden">Anti-FOMO</span>
          </button>

          <PrivacyShieldControl isPro={isPro} onOpenProModal={onOpenProModal} />

          <button
            type="button"
            onClick={onOpenMyWallet}
            title="My Verified Wallets & Receive QR"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span className="hidden sm:inline">My Wallet</span>
            {savedWalletCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-mono text-[10px] font-bold tabular-nums">
                {savedWalletCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenAlertCenter}
            aria-label="Open Price & Whale Alerts"
            title="Price & Whale Alert Bell"
            className="relative p-2 rounded-lg border border-cyan-500/30 bg-slate-100 dark:bg-[#11182A] text-cyan-600 dark:text-cyan-300 hover:border-cyan-400/60 transition-colors cursor-pointer shrink-0"
            style={{
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.22)',
            }}
          >
            <Bell className="w-4 h-4" />
            {activeAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-slate-950 font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                {activeAlertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenProModal}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isProMax
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : isTrialActive
                ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                : isPro
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400'
            }`}
          >
            {isProMax ? (
              <>
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Pulser Pro Max Active</span>
                <span className="2xl:hidden">Pro Max</span>
              </>
            ) : isTrialActive ? (
              <>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="tabular-nums">
                  <span className="hidden 2xl:inline">Pro Trial · </span>
                  {trialDaysLeft}d Left
                </span>
              </>
            ) : isPro ? (
              <>
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Pulser Pro Active</span>
                <span className="2xl:hidden">Pro</span>
              </>
            ) : (
              <>
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">7-Day Free Trial · {proPriceLabel}</span>
                <span className="hidden md:inline 2xl:hidden">Pro Trial</span>
                <span className="md:hidden">Pro</span>
              </>
            )}
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              aria-label="Open User Profile"
              title={`${currentUser.displayName} (${currentUser.username})`}
              className="inline-flex items-center gap-2 pl-1.5 pr-1.5 2xl:pr-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/90 bg-slate-100/80 dark:bg-[#11182A] hover:border-cyan-400/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <UserAvatar
                displayName={currentUser.displayName}
                avatarUrl={currentUser.avatarUrl}
                avatarPresetId={currentUser.avatarPresetId}
                size="sm"
              />
              <span className="hidden 2xl:inline text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[100px] truncate">
                {currentUser.displayName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">Log In / Sign Up</span>
              <span className="hidden sm:inline 2xl:hidden">Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
