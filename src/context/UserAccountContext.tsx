import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppLanguage,
  ConsentPreferences,
  DeviceSession,
  LaunchScreenOption,
  SecurityActivityEntry,
  SecurityActivityType,
  ThemePreference,
  UserAccountProfile,
} from '../types/crypto';
import { generateBase32Secret } from '../utils/totp';

export interface CosmicAvatarPreset {
  id: string;
  label: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
}

export const COSMIC_AVATAR_PRESETS: CosmicAvatarPreset[] = [
  { id: 'pulsar-cyan', label: 'Pulsar Cyan', bgFrom: '#0891B2', bgTo: '#1E1B4B', accent: '#22D3EE' },
  { id: 'nebula-violet', label: 'Nebula Violet', bgFrom: '#7C3AED', bgTo: '#311042', accent: '#C084FC' },
  { id: 'emerald-quant', label: 'Emerald Quant', bgFrom: '#059669', bgTo: '#064E3B', accent: '#34D399' },
  { id: 'solar-amber', label: 'Solar Amber', bgFrom: '#D97706', bgTo: '#451A03', accent: '#FBBF24' },
  { id: 'crimson-alpha', label: 'Crimson Alpha', bgFrom: '#E11D48', bgTo: '#4C0519', accent: '#FB7185' },
  { id: 'obsidian-whale', label: 'Obsidian Whale', bgFrom: '#334155', bgTo: '#090D16', accent: '#38BDF8' },
];

export type SettingsSectionTab = 'preferences' | 'security' | 'devices';

interface StoredAccountRecord {
  profile: UserAccountProfile;
  passwordHash: string;
}

interface SignUpInput {
  displayName: string;
  username: string;
  email: string;
  password: string;
  websiteUrl?: string;
}

interface UserAccountContextValue {
  currentUser: UserAccountProfile | null;
  currentAccountIsDemoDefaultPassword: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  profileDrawerOpen: boolean;
  setProfileDrawerOpen: (open: boolean) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  settingsSection: SettingsSectionTab;
  setSettingsSection: (sec: SettingsSectionTab) => void;
  openSettingsModal: (sec?: SettingsSectionTab) => void;
  themePref: ThemePreference;
  setThemePref: (pref: ThemePreference) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  btcDisplayMode: boolean;
  setBtcDisplayMode: (val: boolean) => void;
  launchScreen: LaunchScreenOption;
  setLaunchScreen: (screen: LaunchScreenOption) => void;
  pushNotificationsEnabled: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  showAiFloatie: boolean;
  setShowAiFloatie: (show: boolean) => void;
  signUp: (input: SignUpInput) => Promise<{ ok: boolean; error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginDemoAccount: () => void;
  logout: () => void;
  updateProfile: (
    patch: Partial<
      Pick<
        UserAccountProfile,
        'displayName' | 'username' | 'bio' | 'websiteUrl' | 'avatarUrl' | 'avatarPresetId'
      >
    >
  ) => void;
  updateConsent: (patch: Partial<Omit<ConsentPreferences, 'essentialCookies'>>) => void;
  saveWalletAddress: (
    address: string,
    network: 'EVM (0x)' | 'Solana' | 'Bitcoin' | null,
    verified: boolean
  ) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  enableTwoFactor: (secret: string) => void;
  disableTwoFactor: () => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: () => void;
  revokeDeviceSession: (sessionId: string) => void;
  revokeAllOtherDevices: () => void;
  logSecurityActivity: (type: SecurityActivityType, detail: string) => void;
  claimDailyDiamonds: () => { claimed: boolean; reward: number };
  toggleTrackAirdrop: (airdropId: string) => void;
}

const ACCOUNTS_KEY = 'cp_accounts_v1';
const ACTIVE_USER_KEY = 'cp_active_user_id_v1';
const THEME_PREF_KEY = 'cp_theme_pref_v1';
const LANGUAGE_KEY = 'cp_language_v1';
const BTC_UNIT_KEY = 'cp_btc_display_mode_v1';
const LAUNCH_SCREEN_KEY = 'cp_launch_screen_v1';
const PUSH_NOTIF_KEY = 'cp_push_notif_v1';
const SHOW_AI_FLOATIE_KEY = 'cp_show_ai_floatie_v1';

const UserAccountContext = createContext<UserAccountContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function sanitizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

function normalizeHandle(raw: string, fallbackName: string): string {
  const base = (raw.trim() || fallbackName.trim() || 'pulser_trader')
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 22);
  return `@${base || 'pulser_trader'}`;
}

function detectCurrentBrowserSummary(): { deviceName: string; osBrowser: string } {
  if (typeof navigator === 'undefined') {
    return { deviceName: 'CryptoPulser Web Terminal', osBrowser: 'Chrome · Desktop OS' };
  }
  const ua = navigator.userAgent || '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
    ? 'Chrome'
    : /Firefox\//.test(ua)
    ? 'Firefox'
    : /Safari\//.test(ua)
    ? 'Safari'
    : 'Browser';
  const os = /Mac OS X|Macintosh/.test(ua)
    ? 'macOS'
    : /Windows/.test(ua)
    ? 'Windows 11'
    : /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
    ? 'Android'
    : /Linux/.test(ua)
    ? 'Linux'
    : 'Desktop OS';
  return {
    deviceName: `${os} Web Session`,
    osBrowser: `${browser} · ${os}`,
  };
}

function buildDefaultDevices(): DeviceSession[] {
  const current = detectCurrentBrowserSummary();
  const now = new Date();
  return [
    {
      id: 'dev-current-web',
      deviceName: current.deviceName,
      osBrowser: current.osBrowser,
      ipAddress: '103.255.4.18',
      location: 'Primary Terminal · Active Now',
      lastActive: now.toISOString(),
      isCurrent: true,
    },
    {
      id: 'dev-ios-companion',
      deviceName: 'CryptoPulser iOS App',
      osBrowser: 'iOS 18.4 · iPhone 16 Pro',
      ipAddress: '172.58.112.94',
      location: 'Mobile Passkey Companion',
      lastActive: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      isCurrent: false,
    },
    {
      id: 'dev-brave-desk',
      deviceName: 'Quant Workstation',
      osBrowser: 'Brave 1.74 · macOS Sonoma',
      ipAddress: '198.51.100.42',
      location: 'Hardware Security Key',
      lastActive: new Date(now.getTime() - 26 * 3600 * 1000).toISOString(),
      isCurrent: false,
    },
  ];
}

function buildDefaultConsent(): ConsentPreferences {
  return {
    essentialCookies: true,
    analyticsTelemetry: true,
    marketPersonalization: true,
    crashDiagnostics: false,
  };
}

function buildDefaultActivities(): SecurityActivityEntry[] {
  const now = Date.now();
  return [
    {
      id: `act-${now - 1000}`,
      type: 'Login',
      detail: 'Authenticated to CryptoPulser Web Terminal',
      ipAddress: '103.255.4.18',
      timestamp: new Date(now - 60000).toISOString(),
    },
    {
      id: `act-${now - 2000}`,
      type: 'Consent Updated',
      detail: 'Zero-Knowledge local storage preferences initialized',
      ipAddress: '103.255.4.18',
      timestamp: new Date(now - 3600 * 1000).toISOString(),
    },
  ];
}

function normalizeUserProfile(profile: UserAccountProfile): UserAccountProfile {
  return {
    ...profile,
    walletAddress: profile.walletAddress ?? '',
    walletNetwork: profile.walletNetwork ?? null,
    walletVerified: Boolean(profile.walletVerified),
    biometricEnabled: Boolean(profile.biometricEnabled),
    twoFactorEnabled: Boolean(profile.twoFactorEnabled),
    twoFactorSecret: profile.twoFactorSecret || generateBase32Secret(16),
    consent: profile.consent ?? buildDefaultConsent(),
    devices:
      profile.devices && profile.devices.length > 0
        ? profile.devices
        : buildDefaultDevices(),
    activities:
      profile.activities && profile.activities.length > 0
        ? profile.activities
        : buildDefaultActivities(),
  };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `cp-auth:${salt}:${password}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback digest below
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
}

function createDemoAccount(): UserAccountProfile {
  return normalizeUserProfile({
    id: 'demo-alex-pulser',
    displayName: 'Alex Mercer',
    username: '@alex_pulser',
    email: 'alex@cryptopulser.com',
    bio: 'On-chain liquidity researcher & macro derivatives trader tracking whale custody shifts and ETF flows.',
    websiteUrl: 'https://x.com/cryptopulser',
    avatarUrl: '',
    avatarPresetId: 'pulsar-cyan',
    diamonds: 240,
    streakDays: 3,
    lastCheckInDate: null,
    claimedAirdropIds: ['monad-testnet', 'hyperliquid-s2'],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    walletNetwork: 'EVM (0x)',
    walletVerified: true,
    biometricEnabled: false,
    twoFactorEnabled: false,
  });
}

function makeActivity(type: SecurityActivityType, detail: string): SecurityActivityEntry {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    detail,
    ipAddress: '103.255.4.18',
    timestamp: new Date().toISOString(),
  };
}

export const UserAccountProvider: React.FC<{
  children: React.ReactNode;
  onNotify?: (title: string, message: string) => void;
}> = ({ children, onNotify }) => {
  const [accounts, setAccounts] = useState<StoredAccountRecord[]>(() =>
    readJson<StoredAccountRecord[]>(ACCOUNTS_KEY, []).map((rec) => ({
      ...rec,
      profile: normalizeUserProfile(rec.profile),
    }))
  );
  const [activeUserId, setActiveUserId] = useState<string | null>(() =>
    readJson<string | null>(ACTIVE_USER_KEY, null)
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionTab>('preferences');

  const [themePref, setThemePref] = useState<ThemePreference>(() =>
    readJson<ThemePreference>(THEME_PREF_KEY, 'dark')
  );
  const [language, setLanguage] = useState<AppLanguage>(() =>
    readJson<AppLanguage>(LANGUAGE_KEY, 'English')
  );
  const [btcDisplayMode, setBtcDisplayMode] = useState<boolean>(() =>
    readJson<boolean>(BTC_UNIT_KEY, false)
  );
  const [launchScreen, setLaunchScreen] = useState<LaunchScreenOption>(() =>
    readJson<LaunchScreenOption>(LAUNCH_SCREEN_KEY, 'Markets')
  );
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() =>
    readJson<boolean>(PUSH_NOTIF_KEY, true)
  );
  const [showAiFloatie, setShowAiFloatie] = useState<boolean>(() =>
    readJson<boolean>(SHOW_AI_FLOATIE_KEY, true)
  );

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      // Ignore quota errors
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(activeUserId));
    } catch {
      // Ignore
    }
  }, [activeUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_PREF_KEY, JSON.stringify(themePref));
    } catch {
      // Ignore
    }
  }, [themePref]);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_KEY, JSON.stringify(language));
    } catch {
      // Ignore
    }
    const langCodeMap: Record<AppLanguage, string> = {
      English: 'en',
      Urdu: 'ur',
      Arabic: 'ar',
      Spanish: 'es',
      Chinese: 'zh',
    };
    document.documentElement.lang = langCodeMap[language] || 'en';
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(BTC_UNIT_KEY, JSON.stringify(btcDisplayMode));
    } catch {
      // Ignore
    }
  }, [btcDisplayMode]);

  useEffect(() => {
    try {
      localStorage.setItem(LAUNCH_SCREEN_KEY, JSON.stringify(launchScreen));
    } catch {
      // Ignore
    }
  }, [launchScreen]);

  useEffect(() => {
    try {
      localStorage.setItem(PUSH_NOTIF_KEY, JSON.stringify(pushNotificationsEnabled));
    } catch {
      // Ignore
    }
  }, [pushNotificationsEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_AI_FLOATIE_KEY, JSON.stringify(showAiFloatie));
    } catch {
      // Ignore
    }
  }, [showAiFloatie]);

  const activeRecord = useMemo(() => {
    if (!activeUserId) return null;
    return accounts.find((a) => a.profile.id === activeUserId) ?? null;
  }, [accounts, activeUserId]);

  const currentUser = activeRecord?.profile ?? null;
  const currentAccountIsDemoDefaultPassword = activeRecord?.passwordHash === 'demo_local';

  const openSettingsModal = useCallback((sec: SettingsSectionTab = 'preferences') => {
    setSettingsSection(sec);
    setProfileDrawerOpen(false);
    setSettingsModalOpen(true);
  }, []);

  const appendActivityForUser = useCallback(
    (userId: string, type: SecurityActivityType, detail: string) => {
      const entry = makeActivity(type, detail);
      setAccounts((prev) =>
        prev.map((rec) =>
          rec.profile.id === userId
            ? {
                ...rec,
                profile: {
                  ...rec.profile,
                  activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
                },
              }
            : rec
        )
      );
    },
    []
  );

  const logSecurityActivity = useCallback(
    (type: SecurityActivityType, detail: string) => {
      if (!activeUserId) return;
      appendActivityForUser(activeUserId, type, detail);
    },
    [activeUserId, appendActivityForUser]
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<{ ok: boolean; error?: string }> => {
      const email = input.email.trim().toLowerCase();
      const displayName = input.displayName.trim();
      if (!displayName) return { ok: false, error: 'Please enter your display name.' };
      if (!email || !email.includes('@')) return { ok: false, error: 'Please enter a valid email address.' };
      if (input.password.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
      }

      const exists = accounts.some((a) => a.profile.email.toLowerCase() === email);
      if (exists) {
        return { ok: false, error: 'An account with this email already exists. Please log in.' };
      }

      const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const passwordHash = await hashPassword(input.password, email);
      const newProfile = normalizeUserProfile({
        id,
        displayName,
        username: normalizeHandle(input.username, displayName),
        email,
        bio: 'CryptoPulser terminal member tracking markets, liquidity & on-chain flow.',
        websiteUrl: sanitizeWebsiteUrl(input.websiteUrl || ''),
        avatarUrl: '',
        avatarPresetId: COSMIC_AVATAR_PRESETS[accounts.length % COSMIC_AVATAR_PRESETS.length].id,
        diamonds: 50,
        streakDays: 0,
        lastCheckInDate: null,
        claimedAirdropIds: [],
        createdAt: new Date().toISOString(),
        activities: [
          makeActivity('Sign Up', `Account registered with ${email}`),
          makeActivity('Login', 'Initial terminal session started'),
        ],
      });

      setAccounts((prev) => [...prev, { profile: newProfile, passwordHash }]);
      setActiveUserId(id);
      setAuthModalOpen(false);
      onNotify?.('Welcome to CryptoPulser', `Signed in as ${newProfile.displayName} (${newProfile.username}).`);
      return { ok: true };
    },
    [accounts, onNotify]
  );

  const loginWithEmail = useCallback(
    async (emailRaw: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const email = emailRaw.trim().toLowerCase();
      const match = accounts.find((a) => a.profile.email.toLowerCase() === email);
      if (!match) {
        return { ok: false, error: 'No account found for that email. Try Sign Up or One-Click Demo Login.' };
      }
      const attemptHash = await hashPassword(password, email);
      if (attemptHash !== match.passwordHash) {
        return { ok: false, error: 'Incorrect password. Please try again.' };
      }
      setActiveUserId(match.profile.id);
      appendActivityForUser(match.profile.id, 'Login', `Signed in via email (${email})`);
      setAuthModalOpen(false);
      onNotify?.('Signed In', `Welcome back, ${match.profile.displayName}!`);
      return { ok: true };
    },
    [accounts, appendActivityForUser, onNotify]
  );

  const loginDemoAccount = useCallback(() => {
    const demoId = 'demo-alex-pulser';
    const existing = accounts.find((a) => a.profile.id === demoId);
    if (!existing) {
      const demoProfile = createDemoAccount();
      setAccounts((prev) => [...prev, { profile: demoProfile, passwordHash: 'demo_local' }]);
    } else {
      appendActivityForUser(demoId, 'Login', 'One-click demo session authenticated');
    }
    setActiveUserId(demoId);
    setAuthModalOpen(false);
    onNotify?.('Demo Account Active', 'Logged in as Alex Mercer (@alex_pulser).');
  }, [accounts, appendActivityForUser, onNotify]);

  const logout = useCallback(() => {
    setActiveUserId(null);
    setProfileDrawerOpen(false);
    setSettingsModalOpen(false);
    onNotify?.('Logged Out', 'You have signed out of your CryptoPulser profile.');
  }, [onNotify]);

  const updateProfile = useCallback(
    (
      patch: Partial<
        Pick<
          UserAccountProfile,
          'displayName' | 'username' | 'bio' | 'websiteUrl' | 'avatarUrl' | 'avatarPresetId'
        >
      >
    ) => {
      if (!activeUserId) return;
      setAccounts((prev) =>
        prev.map((rec) => {
          if (rec.profile.id !== activeUserId) return rec;
          const nextName =
            patch.displayName !== undefined
              ? patch.displayName.trim() || rec.profile.displayName
              : rec.profile.displayName;
          const nextUsername =
            patch.username !== undefined
              ? normalizeHandle(patch.username, nextName)
              : rec.profile.username;
          const nextWebsite =
            patch.websiteUrl !== undefined
              ? sanitizeWebsiteUrl(patch.websiteUrl)
              : rec.profile.websiteUrl;

          const entry = makeActivity('Profile Updated', `Updated profile details (${nextUsername})`);
          return {
            ...rec,
            profile: {
              ...rec.profile,
              ...patch,
              displayName: nextName,
              username: nextUsername,
              websiteUrl: nextWebsite,
              activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
            },
          };
        })
      );
      onNotify?.('Profile Updated', 'Your profile and Pulser Square author card have been synced.');
    },
    [activeUserId, onNotify]
  );

  const updateConsent = useCallback(
    (patch: Partial<Omit<ConsentPreferences, 'essentialCookies'>>) => {
      if (!activeUserId) return;
      setAccounts((prev) =>
        prev.map((rec) => {
          if (rec.profile.id !== activeUserId) return rec;
          const current = rec.profile.consent ?? buildDefaultConsent();
          const nextConsent: ConsentPreferences = {
            ...current,
            ...patch,
            essentialCookies: true,
          };
          const entry = makeActivity('Consent Updated', 'Privacy & analytics consent settings saved');
          return {
            ...rec,
            profile: {
              ...rec.profile,
              consent: nextConsent,
              activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
            },
          };
        })
      );
    },
    [activeUserId]
  );

  const saveWalletAddress = useCallback(
    (
      address: string,
      network: 'EVM (0x)' | 'Solana' | 'Bitcoin' | null,
      verified: boolean
    ) => {
      if (!activeUserId) return;
      setAccounts((prev) =>
        prev.map((rec) => {
          if (rec.profile.id !== activeUserId) return rec;
          const shortAddr = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Cleared';
          const entry = makeActivity(
            'Wallet Verified',
            address
              ? `${network || 'Crypto'} wallet ${shortAddr} ${verified ? 'verified' : 'saved'}`
              : 'Cleared saved wallet address'
          );
          return {
            ...rec,
            profile: {
              ...rec.profile,
              walletAddress: address,
              walletNetwork: network,
              walletVerified: verified,
              activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
            },
          };
        })
      );
      onNotify?.(
        verified ? 'Wallet Verified' : 'Wallet Updated',
        address ? `${network} address saved to your security profile.` : 'Wallet address removed.'
      );
    },
    [activeUserId, onNotify]
  );

  const setBiometricEnabled = useCallback(
    (enabled: boolean) => {
      if (!activeUserId) return;
      setAccounts((prev) =>
        prev.map((rec) => {
          if (rec.profile.id !== activeUserId) return rec;
          const entry = makeActivity(
            enabled ? 'Biometric Enabled' : 'Biometric Disabled',
            enabled
              ? 'WebAuthn Passkey / Biometric lock activated for sensitive actions'
              : 'Biometric Passkey challenge disabled'
          );
          return {
            ...rec,
            profile: {
              ...rec.profile,
              biometricEnabled: enabled,
              activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
            },
          };
        })
      );
      onNotify?.(
        enabled ? 'Biometric Auth Enabled' : 'Biometric Auth Disabled',
        enabled
          ? 'Wallet, 2FA, password, and account deletion now require Passkey verification.'
          : 'Biometric Passkey lock turned off.'
      );
    },
    [activeUserId, onNotify]
  );

  const enableTwoFactor = useCallback(
    (secret: string) => {
      if (!activeUserId) return;
      setAccounts((prev) =>
        prev.map((rec) => {
          if (rec.profile.id !== activeUserId) return rec;
          const entry = makeActivity(
            '2FA Enabled',
            'Google Authenticator TOTP 2FA verified and activated'
          );
          return {
            ...rec,
            profile: {
              ...rec.profile,
              twoFactorEnabled: true,
              twoFactorSecret: secret,
              activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
            },
          };
        })
      );
      onNotify?.('2FA Activated', 'Google Authenticator 2FA is now protecting your account.');
    },
    [activeUserId, onNotify]
  );

  const disableTwoFactor = useCallback(() => {
    if (!activeUserId) return;
    setAccounts((prev) =>
      prev.map((rec) => {
        if (rec.profile.id !== activeUserId) return rec;
        const entry = makeActivity(
          '2FA Disabled',
          'Google Authenticator 2FA turned off by verified user'
        );
        return {
          ...rec,
          profile: {
            ...rec.profile,
            twoFactorEnabled: false,
            activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
          },
        };
      })
    );
    onNotify?.('2FA Disabled', 'Google Authenticator protection has been turned off.');
  }, [activeUserId, onNotify]);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!activeRecord) return { ok: false, error: 'No active account.' };
      if (newPassword.length < 6) {
        return { ok: false, error: 'New password must be at least 6 characters.' };
      }
      if (activeRecord.passwordHash !== 'demo_local') {
        const currentHash = await hashPassword(
          currentPassword,
          activeRecord.profile.email.toLowerCase()
        );
        if (currentHash !== activeRecord.passwordHash) {
          return { ok: false, error: 'Current password is incorrect.' };
        }
      }
      const nextHash = await hashPassword(
        newPassword,
        activeRecord.profile.email.toLowerCase()
      );
      const entry = makeActivity('Password Change', 'Account password updated and re-hashed');
      setAccounts((prev) =>
        prev.map((rec) =>
          rec.profile.id === activeRecord.profile.id
            ? {
                ...rec,
                passwordHash: nextHash,
                profile: {
                  ...rec.profile,
                  activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
                },
              }
            : rec
        )
      );
      onNotify?.('Password Updated', 'Your account password has been changed successfully.');
      return { ok: true };
    },
    [activeRecord, onNotify]
  );

  const deleteAccount = useCallback(() => {
    if (!activeUserId) return;
    const deletedEmail = currentUser?.email || 'account';
    setAccounts((prev) => prev.filter((rec) => rec.profile.id !== activeUserId));
    setActiveUserId(null);
    setSettingsModalOpen(false);
    setProfileDrawerOpen(false);
    onNotify?.('Account Deleted', `Local account (${deletedEmail}) was permanently deleted and session reset.`);
  }, [activeUserId, currentUser, onNotify]);

  const revokeDeviceSession = useCallback(
    (sessionId: string) => {
      if (!activeUserId || !activeRecord) return;
      const target = (activeRecord.profile.devices ?? []).find((d) => d.id === sessionId);
      if (!target) return;
      if (target.isCurrent) {
        logout();
        return;
      }
      const entry = makeActivity(
        'Device Revoked',
        `Revoked session: ${target.deviceName} (${target.ipAddress})`
      );
      setAccounts((prev) =>
        prev.map((rec) =>
          rec.profile.id === activeUserId
            ? {
                ...rec,
                profile: {
                  ...rec.profile,
                  devices: (rec.profile.devices ?? []).filter((d) => d.id !== sessionId),
                  activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
                },
              }
            : rec
        )
      );
      onNotify?.('Device Revoked', `${target.deviceName} session terminated.`);
    },
    [activeUserId, activeRecord, logout, onNotify]
  );

  const revokeAllOtherDevices = useCallback(() => {
    if (!activeUserId) return;
    const entry = makeActivity(
      'Device Revoked',
      'Revoked all remote browser & mobile sessions except current terminal'
    );
    setAccounts((prev) =>
      prev.map((rec) =>
        rec.profile.id === activeUserId
          ? {
              ...rec,
              profile: {
                ...rec.profile,
                devices: (rec.profile.devices ?? []).filter((d) => d.isCurrent),
                activities: [entry, ...(rec.profile.activities ?? [])].slice(0, 40),
              },
            }
          : rec
      )
    );
    onNotify?.('Sessions Cleared', 'All other active devices have been signed out.');
  }, [activeUserId, onNotify]);

  const claimDailyDiamonds = useCallback((): { claimed: boolean; reward: number } => {
    if (!activeUserId) return { claimed: false, reward: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const target = accounts.find((a) => a.profile.id === activeUserId);
    if (!target) return { claimed: false, reward: 0 };
    if (target.profile.lastCheckInDate === today) {
      return { claimed: false, reward: 0 };
    }

    const nextStreak = (target.profile.streakDays % 7) + 1;
    const reward = Math.min(50, 10 + (nextStreak - 1) * 5);
    setAccounts((prev) =>
      prev.map((rec) =>
        rec.profile.id === activeUserId
          ? {
              ...rec,
              profile: {
                ...rec.profile,
                diamonds: rec.profile.diamonds + reward,
                streakDays: nextStreak,
                lastCheckInDate: today,
              },
            }
          : rec
      )
    );
    onNotify?.('Pulser Diamonds Collected', `+${reward} Diamonds added (Day ${nextStreak} streak)!`);
    return { claimed: true, reward };
  }, [activeUserId, accounts, onNotify]);

  const toggleTrackAirdrop = useCallback(
    (airdropId: string) => {
      if (!activeUserId) return;
      setAccounts((prev) =>
        prev.map((rec) => {
          if (rec.profile.id !== activeUserId) return rec;
          const has = rec.profile.claimedAirdropIds.includes(airdropId);
          return {
            ...rec,
            profile: {
              ...rec.profile,
              claimedAirdropIds: has
                ? rec.profile.claimedAirdropIds.filter((id) => id !== airdropId)
                : [...rec.profile.claimedAirdropIds, airdropId],
            },
          };
        })
      );
    },
    [activeUserId]
  );

  const value: UserAccountContextValue = {
    currentUser,
    currentAccountIsDemoDefaultPassword,
    authModalOpen,
    setAuthModalOpen,
    profileDrawerOpen,
    setProfileDrawerOpen,
    settingsModalOpen,
    setSettingsModalOpen,
    settingsSection,
    setSettingsSection,
    openSettingsModal,
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
    signUp,
    loginWithEmail,
    loginDemoAccount,
    logout,
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
    logSecurityActivity,
    claimDailyDiamonds,
    toggleTrackAirdrop,
  };

  return <UserAccountContext.Provider value={value}>{children}</UserAccountContext.Provider>;
};

export function useUserAccount(): UserAccountContextValue {
  const ctx = useContext(UserAccountContext);
  if (!ctx) {
    throw new Error('useUserAccount must be used within UserAccountProvider');
  }
  return ctx;
}
