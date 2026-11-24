import React from 'react';
import { Bell, Clock, Crown, LogIn, Sparkles } from 'lucide-react';
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
}) => {
  const { currentUser, setAuthModalOpen, setProfileDrawerOpen } = useUserAccount();
  const proPriceLabel = formatProMonthlyPrice(currency, fxRates);
  const isProMax = activePlan === 'pro_max';
  const isPro = activePlan === 'pro' || isProMax;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 xl:gap-6">
        {/* Zone 1: Pulsar Star Logo + CryptoPulser.com wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('top1000')}
          className="inline-flex items-center gap-2.5 font-display text-base xl:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
        >
          <PulsarLogo size={30} />
          <span>CryptoPulser.com</span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400">
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

        {/* Zone 3: Local & Private Suite + Alert Bell + Primary Pro / Pro Max / Trial CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <PrivacyShieldControl isPro={isPro} onOpenProModal={onOpenProModal} />

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
            className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
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
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pulser Pro Max Active</span>
              </>
            ) : isTrialActive ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  Pro Trial · {trialDaysLeft}d Left
                </span>
              </>
            ) : isPro ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pulser Pro Active</span>
              </>
            ) : (
              <>
                <Crown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">7-Day Free Trial · {proPriceLabel}</span>
                <span className="sm:hidden">Pro {proPriceLabel}</span>
              </>
            )}
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              aria-label="Open User Profile"
              title={`${currentUser.displayName} (${currentUser.username})`}
              className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/90 bg-slate-100/80 dark:bg-[#11182A] hover:border-cyan-400/60 transition-colors cursor-pointer shrink-0"
            >
              <UserAvatar
                displayName={currentUser.displayName}
                avatarUrl={currentUser.avatarUrl}
                avatarPresetId={currentUser.avatarPresetId}
                size="sm"
              />
              <span className="hidden lg:inline text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[100px] truncate">
                {currentUser.displayName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log In / Sign Up</span>
              <span className="sm:hidden">Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
