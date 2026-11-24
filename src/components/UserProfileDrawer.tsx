import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Coins,
  ExternalLink,
  Gem,
  Gift,
  Globe,
  HelpCircle,
  Link2,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  COSMIC_AVATAR_PRESETS,
  useUserAccount,
} from '../context/UserAccountContext';
import {
  AppLanguage,
  Coin,
  CurrencyCode,
  FxRates,
  PriceWhaleAlert,
  ThemePreference,
} from '../types/crypto';
import { CURRENCY_META, formatPrice } from '../utils/formatters';
import { UserAvatar } from './UserAvatar';

interface UserProfileDrawerProps {
  coins: Coin[];
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  fxRates: FxRates;
  alerts: PriceWhaleAlert[];
  onOpenAlertCenter: () => void;
}

type DrawerSection =
  | 'overview'
  | 'edit'
  | 'converter'
  | 'diamonds'
  | 'airdrops'
  | 'settings'
  | 'help';

interface AirdropCampaign {
  id: string;
  project: string;
  network: string;
  status: 'Live Claim' | 'Season 2 Active' | 'Snapshot Soon';
  estReward: string;
  requirement: string;
}

const AIRDROPS: AirdropCampaign[] = [
  {
    id: 'monad-testnet',
    project: 'Monad Mainnet Genesis',
    network: 'Monad / EVM',
    status: 'Snapshot Soon',
    estReward: '$1,200 – $4,500 est.',
    requirement: 'Testnet swaps + ecosystem staking activity',
  },
  {
    id: 'hyperliquid-s2',
    project: 'Hyperliquid Season 2',
    network: 'Arbitrum / HL L1',
    status: 'Season 2 Active',
    estReward: 'Points Multiplier 2.4x',
    requirement: 'Perpetual OI volume & HLP vault liquidity',
  },
  {
    id: 'base-onchain',
    project: 'Base Builder Rewards',
    network: 'Base L2',
    status: 'Live Claim',
    estReward: '$350 – $1,800 est.',
    requirement: 'Active Base bridge + Aerodrome LP positions',
  },
  {
    id: 'berachain-bgt',
    project: 'Berachain Boyco Vaults',
    network: 'Berachain',
    status: 'Snapshot Soon',
    estReward: 'BGT Emissions Boost',
    requirement: 'Proof-of-Liquidity pre-deposit participation',
  },
];

const LANGUAGES: AppLanguage[] = ['English', 'Urdu', 'Arabic', 'Spanish', 'Chinese'];

export const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({
  coins,
  currency,
  onChangeCurrency,
  fxRates,
  alerts,
  onOpenAlertCenter,
}) => {
  const {
    currentUser,
    profileDrawerOpen,
    setProfileDrawerOpen,
    themePref,
    setThemePref,
    language,
    setLanguage,
    btcDisplayMode,
    setBtcDisplayMode,
    updateProfile,
    claimDailyDiamonds,
    toggleTrackAirdrop,
    openSettingsModal,
    logout,
  } = useUserAccount();

  const [section, setSection] = useState<DrawerSection>('overview');

  // Edit profile form state
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editPresetId, setEditPresetId] = useState('pulsar-cyan');

  // Converter state
  const [convCoinId, setConvCoinId] = useState('bitcoin');
  const [convAmount, setConvAmount] = useState('1');
  const [convTarget, setConvTarget] = useState<CurrencyCode | 'BTC'>('USD');

  // Local UI settings toggles
  const [compactTable, setCompactTable] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);

  useEffect(() => {
    if (profileDrawerOpen && currentUser) {
      setSection('overview');
      setEditName(currentUser.displayName);
      setEditHandle(currentUser.username);
      setEditBio(currentUser.bio);
      setEditWebsite(currentUser.websiteUrl);
      setEditAvatarUrl(currentUser.avatarUrl);
      setEditPresetId(currentUser.avatarPresetId);
    }
  }, [profileDrawerOpen, currentUser]);

  const btcCoin = useMemo(
    () => coins.find((c) => c.symbol === 'BTC') ?? coins[0],
    [coins]
  );

  const convCoin = useMemo(
    () => coins.find((c) => c.id === convCoinId) ?? coins[0],
    [coins, convCoinId]
  );

  if (!profileDrawerOpen || !currentUser) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const alreadyCheckedInToday = currentUser.lastCheckInDate === todayStr;
  const nextReward = Math.min(50, 10 + (currentUser.streakDays % 7) * 5);

  const triggeredAlert = alerts.find((a) => Boolean(a.triggeredAt));
  const latestAlert = triggeredAlert ?? alerts[0];

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName: editName,
      username: editHandle,
      bio: editBio,
      websiteUrl: editWebsite,
      avatarUrl: editAvatarUrl,
      avatarPresetId: editPresetId,
    });
    setSection('overview');
  };

  const convNum = Math.max(0, Number(convAmount) || 0);
  const convUsdVal = convNum * (convCoin?.priceUsd ?? 0);
  const convConvertedDisplay =
    convTarget === 'BTC'
      ? `${(convUsdVal / Math.max(1, btcCoin?.priceUsd ?? 94280)).toFixed(6)} BTC`
      : formatPrice(convUsdVal, convTarget, fxRates);

  const activeCurrencyUnit: 'USD' | 'BTC' | 'PKR' = btcDisplayMode
    ? 'BTC'
    : currency === 'PKR'
    ? 'PKR'
    : 'USD';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-xs"
      onClick={() => setProfileDrawerOpen(false)}
    >
      <aside
        className="w-full max-w-md h-full bg-white dark:bg-[#0D1321] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-label="User Profile Sidebar"
      >
        {/* Top Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {section !== 'overview' && (
              <button
                type="button"
                onClick={() => setSection('overview')}
                className="px-2 py-1 rounded-md text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ← Back
              </button>
            )}
            <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              {section === 'overview'
                ? 'My CryptoPulser Profile'
                : section === 'edit'
                ? 'Edit Profile & Social Link'
                : section === 'converter'
                ? 'Instant Asset Converter'
                : section === 'diamonds'
                ? 'Pulser Diamonds Rewards'
                : section === 'airdrops'
                ? 'Airdrop Tracker'
                : section === 'settings'
                ? 'Terminal Settings'
                : 'Help Center & Shortcuts'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setProfileDrawerOpen(false)}
            aria-label="Close profile drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {section === 'overview' && (
            <>
              {/* Profile Identity Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#11182A]/90 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      displayName={currentUser.displayName}
                      avatarUrl={currentUser.avatarUrl}
                      avatarPresetId={currentUser.avatarPresetId}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.displayName}
                      </h3>
                      <div className="font-mono text-xs text-cyan-600 dark:text-cyan-400 truncate">
                        {currentUser.username}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('edit')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500 cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                {currentUser.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {currentUser.bio}
                  </p>
                )}

                {currentUser.websiteUrl ? (
                  <a
                    href={currentUser.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline break-all"
                  >
                    <Link2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{currentUser.websiteUrl.replace(/^https?:\/\//i, '')}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSection('edit')}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-400 cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>+ Attach website or X/social link (syncs to Pulser Square)</span>
                  </button>
                )}
              </div>

              {/* Live Price Alert Notification Banner */}
              <button
                type="button"
                onClick={() => {
                  setProfileDrawerOpen(false);
                  onOpenAlertCenter();
                }}
                className="w-full text-left rounded-xl border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/15 p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
                      {latestAlert?.triggeredAt ? 'Alert Triggered' : 'Live Price Alert Pulse'}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate mt-0.5">
                      {latestAlert
                        ? `${latestAlert.coinName} (${latestAlert.symbol}) ${
                            latestAlert.triggeredAt ? 'reached target' : 'monitoring'
                          } ${CURRENCY_META[latestAlert.createdInCurrency].symbol}${latestAlert.displayThreshold.toLocaleString('en-US')}`
                        : `Bitcoin (BTC) reached ${
                            btcCoin
                              ? formatPrice(btcCoin.priceUsd, currency, fxRates)
                              : '$94,280.00'
                          } · Tap to configure custom targets`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-500 shrink-0" />
              </button>

              {/* 4 Quick-Action Tiles (CMC Mobile Profile Style) */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileDrawerOpen(false);
                    onOpenAlertCenter();
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] hover:border-cyan-500/50 p-3.5 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Bell className="w-4 h-4 text-cyan-500" />
                    <span className="font-mono text-[11px] font-bold text-cyan-500">
                      {alerts.length} active
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    Price Alerts
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Targets & Whale pings
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('converter')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] hover:border-emerald-500/50 p-3.5 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
                    <span className="font-mono text-[10px] text-slate-400">Live FX</span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    Converter
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Crypto ↔ {currency} / BTC
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('diamonds')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] hover:border-sky-500/50 p-3.5 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Gem className="w-4 h-4 text-sky-400" />
                    <span className="font-mono text-[11px] font-bold text-sky-400">
                      {currentUser.diamonds} 💎
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    Pulser Diamonds
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {alreadyCheckedInToday ? 'Checked in today' : `Claim +${nextReward} today`}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('airdrops')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] hover:border-violet-500/50 p-3.5 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Gift className="w-4 h-4 text-violet-400" />
                    <span className="font-mono text-[11px] font-bold text-violet-400">
                      {currentUser.claimedAirdropIds.length} tracked
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    Airdrop Tracker
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {AIRDROPS.length} active ecosystems
                  </div>
                </button>
              </div>

              {/* Quick Preferences: Theme, Language, Default Currencies */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#11182A]/70 divide-y divide-slate-200/80 dark:divide-slate-800">
                {/* Theme Selector */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span>Theme Mode</span>
                    <span className="font-mono text-[10px] uppercase text-slate-400">{themePref}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-900 p-1">
                    {(
                      [
                        { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
                        { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
                        { id: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
                      ] as Array<{ id: ThemePreference; label: string; icon: React.ReactNode }>
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setThemePref(opt.id)}
                        className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          themePref === opt.id
                            ? 'bg-white dark:bg-cyan-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Currencies (USD / BTC / PKR) */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Default Currencies</span>
                    </span>
                    <span className="font-mono text-[10px] text-emerald-500">
                      {activeCurrencyUnit} Active
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['USD', 'BTC', 'PKR'] as const).map((unit) => {
                      const active = activeCurrencyUnit === unit;
                      return (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => {
                            if (unit === 'BTC') {
                              setBtcDisplayMode(true);
                              setConvTarget('BTC');
                            } else {
                              setBtcDisplayMode(false);
                              onChangeCurrency(unit);
                              setConvTarget(unit);
                            }
                          }}
                          className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                            active
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {unit}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selector */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Globe className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Language</span>
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                    aria-label="Select application language"
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Settings & Help Center Rows */}
                <button
                  type="button"
                  onClick={() => openSettingsModal('preferences')}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Settings Management</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <span>{currentUser.twoFactorEnabled ? '2FA On' : 'Prefs & Security'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('help')}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Help Center</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </>
          )}

          {/* EDIT PROFILE SECTION */}
          {section === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Upload & Cosmic Presets */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    displayName={editName || currentUser.displayName}
                    avatarUrl={editAvatarUrl}
                    avatarPresetId={editPresetId}
                    size="lg"
                  />
                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-xs font-semibold cursor-pointer">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Custom Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                    {editAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl('')}
                        className="block text-[11px] text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove uploaded photo
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Or pick a Cosmic Avatar Preset
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {COSMIC_AVATAR_PRESETS.map((preset) => {
                      const selected = !editAvatarUrl && editPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.label}
                          onClick={() => {
                            setEditAvatarUrl('');
                            setEditPresetId(preset.id);
                          }}
                          className={`p-0.5 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                            selected ? 'border-cyan-400 scale-110' : 'border-transparent'
                          }`}
                        >
                          <UserAvatar
                            displayName={editName || currentUser.displayName}
                            avatarPresetId={preset.id}
                            size="md"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username (@handle)
                </label>
                <input
                  type="text"
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attached Website / Social Link (Synced to Pulser Square)
                </label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://x.com/yourhandle"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Save & Sync Profile
              </button>
            </form>
          )}

          {/* CONVERTER SECTION */}
          {section === 'converter' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] p-4 space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Asset Amount
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={convAmount}
                      onChange={(e) => setConvAmount(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <select
                      value={convCoinId}
                      onChange={(e) => setConvCoinId(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {coins.slice(0, 50).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Convert To
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['USD', 'PKR', 'BTC', 'EUR', 'AED', 'INR'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setConvTarget(t)}
                        className={`py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                          convTarget === t
                            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Converted Value</div>
                  <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-emerald-500">
                    {convConvertedDisplay}
                  </div>
                  {convCoin && (
                    <div className="mt-1 text-[11px] font-mono text-slate-400">
                      1 {convCoin.symbol} = {formatPrice(convCoin.priceUsd, currency, fxRates)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PULSER DIAMONDS SECTION */}
          {section === 'diamonds' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-500/35 bg-gradient-to-br from-sky-500/15 to-cyan-500/5 p-5 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto">
                  <Gem className="w-6 h-6" />
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900 dark:text-white">
                  {currentUser.diamonds} 💎
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Current Check-In Streak: <strong>{currentUser.streakDays} Day(s)</strong>
                </p>

                <button
                  type="button"
                  disabled={alreadyCheckedInToday}
                  onClick={claimDailyDiamonds}
                  className={`mt-2 w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    alreadyCheckedInToday
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                  }`}
                >
                  {alreadyCheckedInToday
                    ? '✓ Today’s Diamonds Collected'
                    : `Collect Today's +${nextReward} Diamonds`}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const collected = dayNum <= currentUser.streakDays;
                  const amt = Math.min(50, 10 + idx * 5);
                  return (
                    <div
                      key={dayNum}
                      className={`rounded-xl p-2 text-center border ${
                        collected
                          ? 'border-sky-500 bg-sky-500/15 text-sky-400'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400'
                      }`}
                    >
                      <div className="text-[9px] font-mono">D{dayNum}</div>
                      <div className="text-[11px] font-mono font-bold mt-1">+{amt}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AIRDROP TRACKER SECTION */}
          {section === 'airdrops' && (
            <div className="space-y-3">
              {AIRDROPS.map((drop) => {
                const tracked = currentUser.claimedAirdropIds.includes(drop.id);
                return (
                  <div
                    key={drop.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {drop.project}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {drop.network} · {drop.estReward}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-500 font-mono text-[10px] font-semibold">
                        {drop.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {drop.requirement}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleTrackAirdrop(drop.id)}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        tracked
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tracked ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                      <span>{tracked ? 'Tracking Snapshot' : 'Track Airdrop'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* SETTINGS SECTION */}
          {section === 'settings' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Compact Market Rows
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Higher density screener layout
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompactTable((v) => !v)}
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${
                      compactTable ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        compactTable ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Price & Whale Alert Chimes
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Trigger desktop toast badges on threshold cross
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundAlerts((v) => !v)}
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${
                      soundAlerts ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        soundAlerts ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HELP CENTER SECTION */}
          {section === 'help' && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] p-4 space-y-2">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Keyboard Shortcuts
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Global Coin / Contract Search</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">/</kbd>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Instant Stealth Mode</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">Alt + H</kbd>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A] p-4 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Local-First Account Storage
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your CryptoPulser profile, uploaded avatar, website link, Pulser Diamonds, and tracked airdrops are saved locally in browser storage and sync live with your Pulser Square posts.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer: Log Out */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0B101B]">
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 rounded-xl border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
