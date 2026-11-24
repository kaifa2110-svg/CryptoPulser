import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Coins,
  Cookie,
  Copy,
  Fingerprint,
  Globe,
  KeyRound,
  Laptop,
  Lock,
  Monitor,
  Moon,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import {
  COSMIC_AVATAR_PRESETS,
  SettingsSectionTab,
  useUserAccount,
} from '../context/UserAccountContext';
import {
  AppLanguage,
  CurrencyCode,
  FxRates,
  LaunchScreenOption,
  SecurityActivityType,
  ThemePreference,
} from '../types/crypto';
import {
  buildTotpQrMatrix,
  computeTotpCode,
  generateBase32Secret,
  getTotpSecondsRemaining,
  validateCryptoWalletAddress,
} from '../utils/totp';
import { UserAvatar } from './UserAvatar';

interface SettingsModalProps {
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  fxRates: FxRates;
  onNavigateLaunchScreen?: (screen: LaunchScreenOption) => void;
  onNotify?: (title: string, message: string, kind?: 'price_above' | 'price_below') => void;
}

const LAUNCH_SCREENS: Array<{ id: LaunchScreenOption; desc: string }> = [
  { id: 'Markets', desc: 'Top 1000 Live Markets & Derivatives' },
  { id: 'Pulser Square', desc: 'Community Alpha & Social Feed' },
  { id: 'Simulator', desc: 'Historical ROI & Time-Travel Calculator' },
  { id: 'Whale Sonar', desc: 'Real-Time Smart Money Flow Tracker' },
];

const LANGUAGES: AppLanguage[] = ['English', 'Urdu', 'Arabic', 'Spanish', 'Chinese'];
const CURRENCIES: Array<{ id: CurrencyCode | 'BTC'; label: string; sub: string }> = [
  { id: 'USD', label: 'USD ($)', sub: 'US Dollar' },
  { id: 'BTC', label: 'BTC (₿)', sub: 'Bitcoin Unit' },
  { id: 'PKR', label: 'PKR (₨)', sub: 'Pakistani Rupee' },
  { id: 'EUR', label: 'EUR (€)', sub: 'Euro' },
  { id: 'AED', label: 'AED (د.إ)', sub: 'UAE Dirham' },
  { id: 'INR', label: 'INR (₹)', sub: 'Indian Rupee' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currency,
  onChangeCurrency,
  fxRates,
  onNavigateLaunchScreen,
  onNotify,
}) => {
  const {
    currentUser,
    currentAccountIsDemoDefaultPassword,
    settingsModalOpen,
    setSettingsModalOpen,
    settingsSection,
    setSettingsSection,
    setProfileDrawerOpen,
    themePref,
    setThemePref,
    language,
    setLanguage,
    btcDisplayMode,
    setBtcDisplayMode,
    launchScreen,
    setLaunchScreen,
    pushNotificationsEnabled,
    setPushNotificationsEnabled,
    showAiFloatie,
    setShowAiFloatie,
    updateProfile,
    updateConsent,
    saveWalletAddress,
    setBiometricEnabled,
    enableTwoFactor,
    disableTwoFactor,
    changePassword,
    deleteAccount,
    revokeDeviceSession,
    revokeAllOtherDevices,
  } = useUserAccount();

  const { cmcApiKey, saveCmcApiKey } = usePrivacy();

  // Profile Editor State
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editPresetId, setEditPresetId] = useState('pulsar-cyan');

  // Wallet Address State
  const [walletInput, setWalletInput] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletSuccess, setWalletSuccess] = useState<string | null>(null);

  // 2FA State
  const [pendingSecret, setPendingSecret] = useState(() => generateBase32Secret(16));
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [totpExpected, setTotpExpected] = useState('');
  const [totpSecLeft, setTotpSecLeft] = useState(getTotpSecondsRemaining());
  const [totpError, setTotpError] = useState<string | null>(null);
  const [showTotpHelper, setShowTotpHelper] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Password Change State
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passSaving, setPassSaving] = useState(false);

  // Vault quick-seal state inside Devices & Activities / Security
  const [vaultQuickInput, setVaultQuickInput] = useState('');

  // Activity Filter
  const [activityFilter, setActivityFilter] = useState<'all' | 'auth' | 'security'>('all');

  // Biometric Challenge Modal State
  const [bioChallenge, setBioChallenge] = useState<{
    title: string;
    detail: string;
    onVerified: () => void;
  } | null>(null);
  const [bioScanning, setBioScanning] = useState(false);

  // Delete Account Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (settingsModalOpen && currentUser) {
      setEditName(currentUser.displayName);
      setEditHandle(currentUser.username);
      setEditBio(currentUser.bio);
      setEditWebsite(currentUser.websiteUrl);
      setEditAvatarUrl(currentUser.avatarUrl);
      setEditPresetId(currentUser.avatarPresetId);
      setWalletInput(currentUser.walletAddress || '');
      setWalletError(null);
      setWalletSuccess(null);
      setPendingSecret(currentUser.twoFactorSecret || generateBase32Secret(16));
      setTotpCodeInput('');
      setTotpError(null);
      setPassMsg(null);
      setCurrPass('');
      setNewPass('');
      setConfirmPass('');
    }
  }, [settingsModalOpen, currentUser]);

  // Live 30s TOTP ticker while Settings modal is open
  useEffect(() => {
    if (!settingsModalOpen) return;
    let active = true;
    const refresh = async () => {
      const code = await computeTotpCode(pendingSecret, 0);
      if (active) {
        setTotpExpected(code);
        setTotpSecLeft(getTotpSecondsRemaining());
      }
    };
    refresh();
    const id = window.setInterval(refresh, 1000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [settingsModalOpen, pendingSecret]);

  const otpauthUri = useMemo(() => {
    const label = encodeURIComponent(currentUser?.email || 'trader@cryptopulser.com');
    return `otpauth://totp/CryptoPulser:${label}?secret=${pendingSecret}&issuer=CryptoPulser`;
  }, [currentUser?.email, pendingSecret]);

  const qrMatrix = useMemo(() => buildTotpQrMatrix(otpauthUri), [otpauthUri]);

  if (!settingsModalOpen || !currentUser) return null;

  const activeCurrencyUnit: CurrencyCode | 'BTC' = btcDisplayMode ? 'BTC' : currency;
  const webAuthnSupported =
    typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';

  const requireBiometricIfEnabled = (
    title: string,
    detail: string,
    action: () => void
  ) => {
    if (!currentUser.biometricEnabled) {
      action();
      return;
    }
    setBioScanning(false);
    setBioChallenge({
      title,
      detail,
      onVerified: action,
    });
  };

  const handleSimulateBiometricVerify = () => {
    if (!bioChallenge) return;
    setBioScanning(true);
    window.setTimeout(() => {
      const cb = bioChallenge.onVerified;
      setBioScanning(false);
      setBioChallenge(null);
      cb();
    }, 650);
  };

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
  };

  const handleTogglePushNotifications = async () => {
    const next = !pushNotificationsEnabled;
    if (next && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch {
        // Ignore iframe permission restrictions
      }
    }
    setPushNotificationsEnabled(next);
    onNotify?.(
      next ? 'Push Notifications Enabled' : 'Push Notifications Muted',
      next
        ? 'Real-time price targets and whale alerts will trigger terminal notifications.'
        : 'Alert push notifications paused.',
      next ? 'price_above' : 'price_below'
    );
  };

  const handleVerifyAndSaveWallet = (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError(null);
    setWalletSuccess(null);

    const trimmed = walletInput.trim();
    if (!trimmed) {
      requireBiometricIfEnabled(
        'Clear Wallet Address',
        'Verify with Passkey / Biometrics to remove your linked wallet address.',
        () => {
          saveWalletAddress('', null, false);
          setWalletSuccess('Saved wallet address cleared.');
        }
      );
      return;
    }

    const res = validateCryptoWalletAddress(trimmed);
    if (!res.valid || !res.network) {
      setWalletError(res.error || 'Invalid wallet address.');
      return;
    }

    requireBiometricIfEnabled(
      'Verify & Bind Wallet Address',
      `Confirm ${res.network} address ${res.normalized.slice(0, 8)}...${res.normalized.slice(-6)}`,
      () => {
        saveWalletAddress(res.normalized, res.network, true);
        setWalletSuccess(`Verified ${res.network} wallet and saved to your security profile.`);
      }
    );
  };

  const handleVerifyEnableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    const cleaned = totpCodeInput.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setTotpError('Enter the 6-digit code from Google Authenticator.');
      return;
    }
    const [prevCode, currCode, nextCode] = await Promise.all([
      computeTotpCode(pendingSecret, -1),
      computeTotpCode(pendingSecret, 0),
      computeTotpCode(pendingSecret, 1),
    ]);
    if (cleaned !== currCode && cleaned !== prevCode && cleaned !== nextCode) {
      setTotpError('Code does not match current TOTP window. Check secret or preview current code.');
      return;
    }
    requireBiometricIfEnabled(
      'Activate Google Authenticator 2FA',
      'Confirm Passkey to lock 2FA onto your account.',
      () => {
        enableTwoFactor(pendingSecret);
        setTotpCodeInput('');
      }
    );
  };

  const handleDisableTotp = () => {
    requireBiometricIfEnabled(
      'Disable Google Authenticator 2FA',
      'Confirm Passkey to turn off 2FA protection.',
      () => {
        disableTwoFactor();
      }
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass.length < 6) {
      setPassMsg({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ ok: false, text: 'New password and confirmation do not match.' });
      return;
    }

    const executeChange = async () => {
      setPassSaving(true);
      try {
        const res = await changePassword(currPass, newPass);
        if (!res.ok) {
          setPassMsg({ ok: false, text: res.error || 'Could not update password.' });
        } else {
          setPassMsg({ ok: true, text: 'Password changed and salted SHA-256 hash updated.' });
          setCurrPass('');
          setNewPass('');
          setConfirmPass('');
        }
      } finally {
        setPassSaving(false);
      }
    };

    requireBiometricIfEnabled(
      'Confirm Password Update',
      'Authenticate with your Passkey before updating your password.',
      () => {
        void executeChange();
      }
    );
  };

  const handleSealQuickApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = vaultQuickInput.trim();
    if (!cleaned) return;
    await saveCmcApiKey(cleaned);
    setVaultQuickInput('');
    onNotify?.('API Key Sealed', 'CoinMarketCap API key encrypted in Local Vault.', 'price_above');
  };

  const handleConfirmDeleteAccount = () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    requireBiometricIfEnabled(
      'Permanently Delete Local Account',
      'Final Passkey check before wiping your local account and resetting session.',
      () => {
        setDeleteModalOpen(false);
        setDeleteConfirmText('');
        deleteAccount();
      }
    );
  };

  const consent = currentUser.consent ?? {
    essentialCookies: true as const,
    analyticsTelemetry: true,
    marketPersonalization: true,
    crashDiagnostics: false,
  };

  const devices = currentUser.devices ?? [];
  const activities = currentUser.activities ?? [];
  const filteredActivities = activities.filter((act) => {
    if (activityFilter === 'all') return true;
    const authTypes: SecurityActivityType[] = [
      'Login',
      'Sign Up',
      'Password Change',
      '2FA Enabled',
      '2FA Disabled',
      'Biometric Enabled',
      'Biometric Disabled',
    ];
    if (activityFilter === 'auth') return authTypes.includes(act.type);
    return !authTypes.includes(act.type);
  });

  const navItems: Array<{
    id: SettingsSectionTab;
    label: string;
    sub: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'preferences',
      label: 'App Preferences',
      sub: 'Launch screen, theme, FX & AI',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'security',
      label: 'Account & Security',
      sub: 'Profile, wallet, Passkey, 2FA',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'devices',
      label: 'Devices & Activities',
      sub: `${devices.length} sessions · ${activities.length} logs`,
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs"
      onClick={() => setSettingsModalOpen(false)}
    >
      <div
        className="w-full max-w-5xl h-[90vh] max-h-[820px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B101B] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="CryptoPulser Settings Management"
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0F1625] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setSettingsModalOpen(false);
                setProfileDrawerOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500 cursor-pointer shrink-0"
            >
              ← Profile
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                Settings Management
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Signed in as <span className="font-mono text-cyan-500">{currentUser.username}</span> ·{' '}
                {currentUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border ${
                currentUser.twoFactorEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-500'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>{currentUser.twoFactorEnabled ? '2FA Protected' : '2FA Off'}</span>
            </span>
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              aria-label="Close Settings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Sidebar Navigation */}
          <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0D1321] p-3 flex md:flex-col gap-1.5 overflow-x-auto">
            {navItems.map((item) => {
              const active = settingsSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSettingsSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer shrink-0 md:w-full ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-cyan-500/15 dark:text-cyan-300 border border-slate-900 dark:border-cyan-500/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div
                    className={`shrink-0 ${
                      active ? 'text-cyan-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{item.label}</div>
                    <div
                      className={`text-[10px] truncate hidden md:block ${
                        active ? 'text-slate-300 dark:text-cyan-400/80' : 'text-slate-400'
                      }`}
                    >
                      {item.sub}
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="hidden md:mt-auto md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11182A] p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 dark:text-slate-100">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Security Score</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    currentUser.twoFactorEnabled
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  2FA {currentUser.twoFactorEnabled ? 'ON' : 'OFF'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    currentUser.biometricEnabled
                      ? 'bg-cyan-500/15 text-cyan-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Passkey {currentUser.biometricEnabled ? 'ON' : 'OFF'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    currentUser.walletVerified
                      ? 'bg-violet-500/15 text-violet-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Wallet {currentUser.walletVerified ? '✓' : '—'}
                </span>
              </div>
            </div>
          </aside>

          {/* Main Content Panel */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ======================= TAB 1: APP PREFERENCES ======================= */}
            {settingsSection === 'preferences' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    App Preferences
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Customize your default CryptoPulser launch workspace, display theme, language,
                    currencies, and assistant controls.
                  </p>
                </div>

                {/* Launch Screen Selector */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Launch Screen
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Default tab loaded when opening CryptoPulser.com
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-cyan-500">
                      {launchScreen}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LAUNCH_SCREENS.map((item) => {
                      const active = launchScreen === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setLaunchScreen(item.id);
                            onNavigateLaunchScreen?.(item.id);
                            onNotify?.(
                              'Launch Screen Saved',
                              `Startup view set to ${item.id}.`,
                              'price_above'
                            );
                          }}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                            active
                              ? 'border-cyan-500 bg-cyan-500/10'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.id}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                          {active && <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme & Language */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Theme Switcher
                      </span>
                      <span className="font-mono text-[10px] uppercase text-slate-400">
                        {themePref}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-900 p-1">
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
                          className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            themePref === opt.id
                              ? 'bg-white dark:bg-cyan-500 text-slate-950 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Globe className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Interface Language</span>
                      </span>
                      <span className="font-mono text-[10px] text-cyan-500">{language}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setLanguage(lang);
                            onNotify?.('Language Updated', `Display language set to ${lang}.`, 'price_above');
                          }}
                          className={`py-2 px-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                            language === lang
                              ? 'border-cyan-500 bg-cyan-500/15 text-cyan-500'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Default Currencies Manager */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Coins className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Default Currencies Manager</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Switch base display currency across Markets, Simulator, Whale Sonar & Converter
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-500">
                      {activeCurrencyUnit} Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {CURRENCIES.map((item) => {
                      const active = activeCurrencyUnit === item.id;
                      const rateText =
                        item.id === 'BTC'
                          ? 'Sats / BTC'
                          : `1 USD = ${fxRates[item.id].toFixed(item.id === 'USD' ? 0 : 2)}`;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (item.id === 'BTC') {
                              setBtcDisplayMode(true);
                            } else {
                              setBtcDisplayMode(false);
                              onChangeCurrency(item.id);
                            }
                            onNotify?.(
                              'Default Currency Changed',
                              `Terminal pricing updated to ${item.label}.`,
                              'price_above'
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-emerald-500 bg-emerald-500/15'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'
                          }`}
                        >
                          <div
                            className={`font-mono text-xs font-bold ${
                              active ? 'text-emerald-500' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.sub}
                          </div>
                          <div className="font-mono text-[9px] text-slate-400 mt-1">{rateText}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Push Notifications & AI Floatie Button Toggles */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Push Notifications
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Receive live price threshold alerts, whale movement triggers, and security pings
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pushNotificationsEnabled}
                      onClick={handleTogglePushNotifications}
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative shrink-0 ${
                        pushNotificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          pushNotificationsEnabled ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          AI Floatie Button (Ask Crypto Pulser AI)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Show or hide the floating bottom-right Ask Crypto Pulser AI launcher button
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showAiFloatie}
                      onClick={() => {
                        const next = !showAiFloatie;
                        setShowAiFloatie(next);
                        onNotify?.(
                          next ? 'AI Floatie Visible' : 'AI Floatie Hidden',
                          next
                            ? 'Ask Crypto Pulser AI launcher restored in bottom-right corner.'
                            : 'Floating AI button hidden for distraction-free charting.',
                          'price_above'
                        );
                      }}
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative shrink-0 ${
                        showAiFloatie ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          showAiFloatie ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================= TAB 2: ACCOUNT & SECURITY ======================= */}
            {settingsSection === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Account & Security Controls
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage your public identity, privacy consent, verified wallet address, Passkey
                    biometric lock, 2FA, and credentials.
                  </p>
                </div>

                {/* 1. Profile Settings */}
                <form
                  onSubmit={handleSaveProfile}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Profile Settings
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Synced with Pulser Square
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <UserAvatar
                      displayName={editName || currentUser.displayName}
                      avatarUrl={editAvatarUrl}
                      avatarPresetId={editPresetId}
                      size="lg"
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-xs font-semibold cursor-pointer">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
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
                            className="px-2.5 py-1.5 rounded-lg border border-rose-500/35 text-rose-500 text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
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
                              className={`p-0.5 rounded-full border-2 cursor-pointer transition-transform ${
                                selected ? 'border-cyan-400 scale-110' : 'border-transparent'
                              }`}
                            >
                              <UserAvatar
                                displayName={editName || currentUser.displayName}
                                avatarPresetId={preset.id}
                                size="sm"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Username (@handle)
                      </label>
                      <input
                        type="text"
                        value={editHandle}
                        onChange={(e) => setEditHandle(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Website / Social URL
                    </label>
                    <input
                      type="text"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      placeholder="https://x.com/yourhandle"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Bio
                    </label>
                    <textarea
                      rows={2}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Save Profile Changes
                    </button>
                  </div>
                </form>

                {/* 2. Set Wallet Address */}
                <form
                  onSubmit={handleVerifyAndSaveWallet}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-violet-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Set Wallet Address (EVM / Solana / BTC)
                      </h4>
                    </div>
                    {currentUser.walletVerified && currentUser.walletAddress ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-mono text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{currentUser.walletNetwork} Verified</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-mono text-[10px]">
                        Not Linked
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      placeholder="0x742d...f44e, Solana Base58, or bc1q... address"
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      Verify & Save Wallet
                    </button>
                  </div>

                  {walletError && (
                    <div className="text-[11px] text-rose-500 font-medium">{walletError}</div>
                  )}
                  {walletSuccess && (
                    <div className="text-[11px] text-emerald-500 font-medium">{walletSuccess}</div>
                  )}
                </form>

                {/* 3. Biometric Authentication (WebAuthn / Passkey) */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                        <Fingerprint className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Biometric Authentication (WebAuthn / Passkey)
                          </h4>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                              currentUser.biometricEnabled
                                ? 'bg-cyan-500/15 text-cyan-400'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {currentUser.biometricEnabled ? 'PASSKEY ACTIVE' : 'OFF'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Requires Fingerprint / Face ID / Passkey confirmation before modifying wallet
                          addresses, 2FA, passwords, revoking sessions, or deleting your account.
                        </p>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          Browser WebAuthn API:{' '}
                          {webAuthnSupported ? 'Available (Hardware/Platform Ready)' : 'Passkey Simulation Ready'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(currentUser.biometricEnabled)}
                      onClick={() => {
                        if (currentUser.biometricEnabled) {
                          requireBiometricIfEnabled(
                            'Disable Biometric Authentication',
                            'Verify Passkey one last time to turn off biometric protection.',
                            () => setBiometricEnabled(false)
                          );
                        } else {
                          setBioScanning(false);
                          setBioChallenge({
                            title: 'Enroll Biometric Passkey',
                            detail:
                              'Scan Fingerprint or Face ID to enable WebAuthn Passkey protection.',
                            onVerified: () => setBiometricEnabled(true),
                          });
                        }
                      }}
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative shrink-0 ${
                        currentUser.biometricEnabled
                          ? 'bg-cyan-500'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          currentUser.biometricEnabled ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 4. Google Authenticator (2FA) */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Google Authenticator (2FA)
                      </h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        currentUser.twoFactorEnabled
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {currentUser.twoFactorEnabled ? 'STATUS: ON (PROTECTED)' : 'STATUS: OFF'}
                    </span>
                  </div>

                  {currentUser.twoFactorEnabled ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                          TOTP Two-Factor Authentication is Active
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          Secret Key:{' '}
                          <span className="font-mono font-semibold">
                            {currentUser.twoFactorSecret}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisableTotp}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold cursor-pointer shrink-0"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-[164px_1fr] gap-4 items-start">
                      {/* Crisp SVG QR Code */}
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 inline-flex flex-col items-center justify-center mx-auto md:mx-0">
                        <svg
                          viewBox="0 0 25 25"
                          className="w-32 h-32 text-slate-950"
                          shapeRendering="crispEdges"
                          aria-label="Google Authenticator Setup QR Code"
                        >
                          <rect width="25" height="25" fill="#ffffff" />
                          {qrMatrix.map((row, r) =>
                            row.map((cell, c) =>
                              cell ? (
                                <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#090D16" />
                              ) : null
                            )
                          )}
                        </svg>
                        <span className="mt-1.5 font-mono text-[9px] text-slate-500">
                          Scan in Authenticator App
                        </span>
                      </div>

                      <form onSubmit={handleVerifyEnableTotp} className="space-y-3">
                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          Scan the QR code with Google Authenticator or enter this Base32 setup key
                          manually, then enter the 6-digit verification code below.
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <code className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">
                            {pendingSecret}
                          </code>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(pendingSecret);
                                setCopiedSecret(true);
                                window.setTimeout(() => setCopiedSecret(false), 1800);
                              } catch {
                                // Ignore
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            {copiedSecret ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedSecret ? 'Copied' : 'Copy Key'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingSecret(generateBase32Secret(16))}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Rotate</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpCodeInput}
                            onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit code"
                            className="w-36 px-3 py-2 text-sm font-mono font-bold tracking-widest rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                          >
                            Verify & Enable 2FA
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowTotpHelper((s) => !s)}
                            className="text-[11px] font-mono text-cyan-500 hover:underline cursor-pointer"
                          >
                            {showTotpHelper ? 'Hide Code' : 'Preview Live TOTP'}
                          </button>
                        </div>

                        {showTotpHelper && (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-500">
                            <span>Current Code: <strong>{totpExpected}</strong></span>
                            <span className="opacity-75">({totpSecLeft}s)</span>
                            <button
                              type="button"
                              onClick={() => setTotpCodeInput(totpExpected)}
                              className="underline font-bold cursor-pointer"
                            >
                              Fill
                            </button>
                          </div>
                        )}

                        {totpError && <div className="text-[11px] text-rose-500">{totpError}</div>}
                      </form>
                    </div>
                  )}
                </div>

                {/* 5. Consent Settings */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Cookie className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Consent Settings (Privacy & Cookies)
                    </h4>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Essential Local Session Storage
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Required for authentication, watchlist, alerts, and encrypted local key vault
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-mono text-[10px] font-bold">
                        ALWAYS ON
                      </span>
                    </div>

                    {(
                      [
                        {
                          key: 'analyticsTelemetry' as const,
                          title: 'Privacy-Preserving Analytics Telemetry',
                          sub: 'Anonymous aggregate feature performance metrics (zero PII)',
                        },
                        {
                          key: 'marketPersonalization' as const,
                          title: 'Market Screener Personalization',
                          sub: 'Remember preferred networks, table sort & simulator presets',
                        },
                        {
                          key: 'crashDiagnostics' as const,
                          title: 'Automated Error & Crash Diagnostics',
                          sub: 'Local diagnostic trace collection to improve feed stability',
                        },
                      ] as const
                    ).map((item) => {
                      const enabled = consent[item.key];
                      return (
                        <div key={item.key} className="py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.sub}
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => updateConsent({ [item.key]: !enabled })}
                            className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative shrink-0 ${
                              enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                enabled ? 'left-5' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Change Password */}
                <form
                  onSubmit={handleChangePassword}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Change Password
                      </h4>
                    </div>
                    {currentAccountIsDemoDefaultPassword && (
                      <span className="text-[10px] font-mono text-cyan-500">
                        Demo account: set your initial password directly
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {!currentAccountIsDemoDefaultPassword && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          required
                          value={currPass}
                          onChange={(e) => setCurrPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px]">
                      {passMsg && (
                        <span className={passMsg.ok ? 'text-emerald-500' : 'text-rose-500'}>
                          {passMsg.text}
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={passSaving}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {passSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                {/* 7. Danger Zone: Delete Account */}
                <div className="rounded-2xl border border-rose-500/35 bg-rose-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Delete Account</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Permanently deletes your local CryptoPulser account, Pulser Diamonds, saved
                      wallet, 2FA config, and resets your session cleanly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText('');
                      setDeleteModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* ======================= TAB 3: DEVICES & ACTIVITIES ======================= */}
            {settingsSection === 'devices' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Devices & Security Activities
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inspect active browser sessions, revoke unauthorized devices, and audit your
                    timestamped security activity trail.
                  </p>
                </div>

                {/* Device Management */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-cyan-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Device Management ({devices.length} Active)
                      </h4>
                    </div>
                    {devices.some((d) => !d.isCurrent) && (
                      <button
                        type="button"
                        onClick={() =>
                          requireBiometricIfEnabled(
                            'Revoke All Remote Devices',
                            'Verify Passkey to terminate all other browser and mobile sessions.',
                            revokeAllOtherDevices
                          )
                        }
                        className="px-2.5 py-1 rounded-lg border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold cursor-pointer"
                      >
                        Revoke All Other Sessions
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {devices.map((dev) => {
                      const isMobile = /ios|iphone|android|mobile/i.test(dev.osBrowser + dev.deviceName);
                      return (
                        <div
                          key={dev.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/75 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                dev.isCurrent
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isMobile ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Laptop className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {dev.deviceName}
                                </span>
                                {dev.isCurrent && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-mono text-[10px] font-bold">
                                    CURRENT SESSION
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {dev.osBrowser} · IP <span className="font-mono">{dev.ipAddress}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {dev.location} · Last active{' '}
                                {new Date(dev.lastActive).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              requireBiometricIfEnabled(
                                dev.isCurrent ? 'End Current Session' : 'Revoke Device Session',
                                `Confirm terminating ${dev.deviceName} (${dev.ipAddress}).`,
                                () => revokeDeviceSession(dev.id)
                              )
                            }
                            className="px-3 py-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold cursor-pointer shrink-0"
                          >
                            {dev.isCurrent ? 'Sign Out' : 'Revoke'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Local Vault Status (API Key Sealed Link) */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Local API Key Vault Status:</span>
                      <span
                        className={`font-mono text-[11px] ${
                          cmcApiKey ? 'text-emerald-500' : 'text-slate-400'
                        }`}
                      >
                        {cmcApiKey ? 'Sealed (Encrypted Local Only)' : 'No Key Sealed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Sealing a CoinMarketCap API key in your local vault automatically records an
                      &ldquo;API Key Sealed&rdquo; audit entry below.
                    </p>
                  </div>

                  {!cmcApiKey && (
                    <form onSubmit={handleSealQuickApiKey} className="flex items-center gap-2 shrink-0">
                      <input
                        type="password"
                        value={vaultQuickInput}
                        onChange={(e) => setVaultQuickInput(e.target.value)}
                        placeholder="Paste CMC API key to seal..."
                        className="w-44 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        Seal Key
                      </button>
                    </form>
                  )}
                </div>

                {/* Account Activities Log */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726] p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Account Activities
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-900 p-0.5 text-[11px]">
                      {(
                        [
                          { id: 'all', label: 'All' },
                          { id: 'auth', label: 'Auth & 2FA' },
                          { id: 'security', label: 'Keys & Wallets' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActivityFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                            activityFilter === tab.id
                              ? 'bg-white dark:bg-cyan-500 text-slate-950'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredActivities.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No matching security events recorded yet.
                      </div>
                    ) : (
                      filteredActivities.map((entry) => (
                        <div
                          key={entry.id}
                          className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                  entry.type === '2FA Enabled' ||
                                  entry.type === 'API Key Sealed' ||
                                  entry.type === 'Wallet Verified' ||
                                  entry.type === 'Biometric Enabled'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : entry.type === 'Device Revoked' || entry.type === '2FA Disabled'
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-cyan-500/15 text-cyan-500'
                                }`}
                              >
                                {entry.type}
                              </span>
                              <span className="text-xs text-slate-800 dark:text-slate-200 truncate">
                                {entry.detail}
                              </span>
                            </div>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 shrink-0">
                            {entry.ipAddress} · {new Date(entry.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Persistent Modal Footer with Version Badge */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0D1321] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-mono font-semibold text-slate-500 dark:text-slate-400">
            CryptoPulser Web &amp; PWA v5.25.0
          </span>
          <span className="font-mono text-slate-400">
            Zero-Knowledge Local Storage · End-to-End Browser Encrypted
          </span>
        </div>
      </div>

      {/* Biometric Passkey Verification Overlay */}
      {bioChallenge && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => !bioScanning && setBioChallenge(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-white dark:bg-[#0F1625] p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border transition-all ${
                bioScanning
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400 scale-105'
                  : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-400'
              }`}
            >
              <Fingerprint className={`w-9 h-9 ${bioScanning ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {bioChallenge.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {bioChallenge.detail}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={bioScanning}
                onClick={() => setBioChallenge(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bioScanning}
                onClick={handleSimulateBiometricVerify}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-70"
              >
                {bioScanning ? 'Verifying Passkey...' : 'Verify Fingerprint / Face ID'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-500/45 bg-white dark:bg-[#0F1625] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete Account?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This permanently erases <strong>{currentUser.email}</strong> from local browser
                  storage, removes all saved security credentials, and logs you out immediately.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Type <span className="font-mono text-rose-500 font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-rose-500/40 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Keep Account
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleConfirmDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
