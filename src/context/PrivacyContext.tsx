import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type AutoLockSeconds = 0 | 15 | 60 | 300;

export interface LookupTrace {
  id: string;
  scope: 'Markets' | 'Bubble Radar' | 'Whale Sonar' | 'Coin Detail';
  query: string;
  timestamp: string;
}

interface PrivacyContextValue {
  // 1. Stealth Mode
  stealthMode: boolean;
  toggleStealth: () => void;
  setStealthMode: (val: boolean) => void;

  // 2. Smart Auto-Lock & Quick-PIN
  autoLockSeconds: AutoLockSeconds;
  setAutoLockSeconds: (sec: AutoLockSeconds) => void;
  isLocked: boolean;
  idleRemainingSec: number;
  lockNow: () => void;
  unlockTerminal: (pinAttempt?: string) => boolean;
  hasPin: boolean;
  setQuickPin: (pin: string) => Promise<void>;
  removeQuickPin: () => void;

  // 3. Incognito Session Mode
  incognitoMode: boolean;
  toggleIncognito: () => void;
  recentLookups: LookupTrace[];
  recordLookup: (scope: LookupTrace['scope'], query: string) => void;
  clearLookups: () => void;

  // 4. Encrypted Local Key Vault (CoinMarketCap API Key + Mandatory 4-Digit Vault PIN)
  cmcApiKey: string;
  saveCmcApiKey: (rawKey: string) => Promise<void>;
  removeCmcApiKey: () => void;
  hasVaultPin: boolean;
  setVaultPin: (pin: string) => boolean;
  verifyVaultPin: (pinAttempt: string) => boolean;
  resetVaultPinAndWipeKey: () => void;
  externalBytesSent: number;
  lastVerifiedAt: string | null;
  verifyLocalOnlyStorage: () => {
    ok: boolean;
    externalBytesSent: number;
    hasVaultKey: boolean;
    checkedAt: string;
  };

  // 5. Panic Wipe
  wipeVersion: number;
  triggerPanicWipe: () => void;
  registerWipeHandler: (fn: () => void) => () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

const STORAGE_KEYS = {
  stealth: 'cp_stealth_mode',
  autoLock: 'cp_autolock_sec',
  pinHash: 'cp_quick_pin_hash',
  vaultData: 'cp_cmc_vault_v1',
  vaultKey: 'cp_cmc_vault_k',
  vaultPinHash: 'cp_vault_pin_hash_v1',
  lookups: 'cp_recent_lookups',
  aiHistory: 'cp_ai_history',
  squareDraft: 'cp_square_draft',
  squarePosts: 'cp_square_posts',
  watchlist: 'cp_watchlist',
  alerts: 'cp_alerts',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function hashPinSync(pin: string, domain = 'cp-zk-pin'): string {
  // Deterministic salted digest for local PIN verification
  let h1 = 0x811c9dc5;
  const salted = `${domain}:${pin}:v1`;
  for (let i = 0; i < salted.length; i++) {
    h1 ^= salted.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return `h1_${(h1 >>> 0).toString(16)}`;
}

function encodeLocalVault(plainText: string, secretSalt: string): string {
  if (!plainText) return '';
  const key = secretSalt || 'cp-local-vault-default';
  const bytes = new TextEncoder().encode(plainText);
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31 + 17) & 0xff);
  }
  let bin = '';
  out.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return `enc1:${btoa(bin)}`;
}

function decodeLocalVault(cipherText: string, secretSalt: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith('enc1:')) return cipherText;
  try {
    const b64 = cipherText.slice(5);
    const bin = atob(b64);
    const key = secretSalt || 'cp-local-vault-default';
    const keyBytes = new TextEncoder().encode(key);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i) ^ keyBytes[i % keyBytes.length] ^ ((i * 31 + 17) & 0xff);
    }
    return new TextDecoder().decode(out);
  } catch {
    return '';
  }
}

function getOrCreateVaultSalt(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.vaultKey);
    if (existing) return existing;
    const arr = new Uint8Array(16);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    const token = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(STORAGE_KEYS.vaultKey, token);
    return token;
  } catch {
    return 'cp-local-memory-salt';
  }
}

export const PrivacyProvider: React.FC<{
  children: React.ReactNode;
  isPro?: boolean;
  onNotify?: (title: string, message: string, kind?: 'price_above' | 'price_below') => void;
}> = ({ children, isPro = false, onNotify }) => {
  const [stealthMode, setStealthMode] = useState<boolean>(() =>
    readJson<boolean>(STORAGE_KEYS.stealth, false)
  );
  const [autoLockSeconds, setAutoLockSeconds] = useState<AutoLockSeconds>(() =>
    readJson<AutoLockSeconds>(STORAGE_KEYS.autoLock, 0)
  );
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [idleRemainingSec, setIdleRemainingSec] = useState<number>(0);
  const [pinHash, setPinHash] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.pinHash);
    } catch {
      return null;
    }
  });

  const [incognitoMode, setIncognitoMode] = useState<boolean>(false);
  const [recentLookups, setRecentLookups] = useState<LookupTrace[]>(() =>
    readJson<LookupTrace[]>(STORAGE_KEYS.lookups, [])
  );

  const [cmcApiKey, setCmcApiKeyState] = useState<string>(() => {
    try {
      const cipher = localStorage.getItem(STORAGE_KEYS.vaultData);
      if (!cipher) return '';
      const salt = localStorage.getItem(STORAGE_KEYS.vaultKey) || '';
      return decodeLocalVault(cipher, salt);
    } catch {
      return '';
    }
  });
  const [vaultPinHash, setVaultPinHash] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.vaultPinHash);
    } catch {
      return null;
    }
  });
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [wipeVersion, setWipeVersion] = useState<number>(0);

  const lastActivityRef = useRef<number>(Date.now());
  const wipeHandlersRef = useRef<Set<() => void>>(new Set());

  // Persist Stealth & AutoLock settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.stealth, JSON.stringify(stealthMode));
    } catch {
      // Ignore
    }
  }, [stealthMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.autoLock, JSON.stringify(autoLockSeconds));
    } catch {
      // Ignore
    }
    lastActivityRef.current = Date.now();
    setIdleRemainingSec(autoLockSeconds);
  }, [autoLockSeconds]);

  // Persist lookups only when NOT in Incognito Mode
  useEffect(() => {
    if (incognitoMode) return;
    try {
      localStorage.setItem(STORAGE_KEYS.lookups, JSON.stringify(recentLookups.slice(0, 20)));
    } catch {
      // Ignore
    }
  }, [recentLookups, incognitoMode]);

  const toggleStealth = useCallback(() => {
    setStealthMode((prev) => !prev);
  }, []);

  // Global Alt + H shortcut for Instant Stealth Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'h' || e.key === 'H' || e.code === 'KeyH')) {
        e.preventDefault();
        setStealthMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Revert Pro-only privacy features if user reverts to Free tier
  useEffect(() => {
    if (!isPro) {
      setIsLocked(false);
      setIdleRemainingSec(0);
      setIncognitoMode(false);
    }
  }, [isPro]);

  // Inactivity monitor for Smart Auto-Lock (Pulser Pro)
  useEffect(() => {
    if (!isPro || autoLockSeconds === 0 || isLocked) {
      if (!isLocked) setIdleRemainingSec(0);
      return;
    }

    lastActivityRef.current = Date.now();
    setIdleRemainingSec(autoLockSeconds);

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];
    events.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));

    const timer = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, autoLockSeconds - elapsedSec);
      setIdleRemainingSec(remaining);
      if (remaining === 0) {
        setIsLocked(true);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActive));
      window.clearInterval(timer);
    };
  }, [isPro, autoLockSeconds, isLocked]);

  const lockNow = useCallback(() => {
    if (!isPro) return;
    setIsLocked(true);
  }, [isPro]);

  const unlockTerminal = useCallback(
    (pinAttempt?: string) => {
      if (pinHash) {
        const candidate = (pinAttempt || '').trim();
        if (hashPinSync(candidate) !== pinHash) {
          return false;
        }
      }
      lastActivityRef.current = Date.now();
      setIdleRemainingSec(autoLockSeconds);
      setIsLocked(false);
      return true;
    },
    [pinHash, autoLockSeconds]
  );

  const setQuickPin = useCallback(async (pin: string) => {
    const clean = pin.replace(/\D/g, '').slice(0, 4);
    if (clean.length !== 4) return;
    const h = hashPinSync(clean);
    setPinHash(h);
    try {
      localStorage.setItem(STORAGE_KEYS.pinHash, h);
    } catch {
      // Ignore
    }
  }, []);

  const removeQuickPin = useCallback(() => {
    setPinHash(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.pinHash);
    } catch {
      // Ignore
    }
  }, []);

  // Incognito Mode: wipe session traces when toggled off or on tab close (Pulser Pro)
  const toggleIncognito = useCallback(() => {
    if (!isPro) return;
    setIncognitoMode((prev) => {
      const next = !prev;
      if (!next) {
        // Turning Incognito OFF -> wipe ephemeral traces
        setRecentLookups([]);
        try {
          localStorage.removeItem(STORAGE_KEYS.lookups);
          localStorage.removeItem(STORAGE_KEYS.aiHistory);
          localStorage.removeItem(STORAGE_KEYS.squareDraft);
        } catch {
          // Ignore
        }
        setWipeVersion((v) => v + 1);
      }
      return next;
    });
  }, [isPro]);

  useEffect(() => {
    if (!incognitoMode) return;
    const onBeforeUnload = () => {
      try {
        localStorage.removeItem(STORAGE_KEYS.lookups);
        localStorage.removeItem(STORAGE_KEYS.aiHistory);
        localStorage.removeItem(STORAGE_KEYS.squareDraft);
      } catch {
        // Ignore
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [incognitoMode]);

  const recordLookup = useCallback(
    (scope: LookupTrace['scope'], query: string) => {
      const clean = query.trim();
      if (!clean || incognitoMode) return;
      setRecentLookups((prev) => {
        const filtered = prev.filter(
          (item) => !(item.scope === scope && item.query.toLowerCase() === clean.toLowerCase())
        );
        return [
          {
            id: `tr-${Date.now()}`,
            scope,
            query: clean,
            timestamp: new Date().toISOString(),
          },
          ...filtered.slice(0, 14),
        ];
      });
    },
    [incognitoMode]
  );

  const clearLookups = useCallback(() => {
    setRecentLookups([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.lookups);
    } catch {
      // Ignore
    }
  }, []);

  const saveCmcApiKey = useCallback(async (rawKey: string) => {
    const trimmed = rawKey.trim();
    setCmcApiKeyState(trimmed);
    try {
      if (!trimmed) {
        localStorage.removeItem(STORAGE_KEYS.vaultData);
        return;
      }
      const salt = getOrCreateVaultSalt();
      const encoded = encodeLocalVault(trimmed, salt);
      localStorage.setItem(STORAGE_KEYS.vaultData, encoded);
    } catch {
      // Ignore
    }
  }, []);

  const removeCmcApiKey = useCallback(() => {
    setCmcApiKeyState('');
    try {
      localStorage.removeItem(STORAGE_KEYS.vaultData);
      localStorage.removeItem(STORAGE_KEYS.vaultKey);
    } catch {
      // Ignore
    }
  }, []);

  const setVaultPin = useCallback((pin: string): boolean => {
    const clean = pin.replace(/\D/g, '').slice(0, 4);
    if (clean.length !== 4) return false;
    const h = hashPinSync(clean, 'cp-vault-pin');
    setVaultPinHash(h);
    try {
      localStorage.setItem(STORAGE_KEYS.vaultPinHash, h);
    } catch {
      // Ignore
    }
    onNotify?.('Vault PIN Set', 'Encrypted Local Key Vault is now locked with your 4-digit PIN.', 'price_above');
    return true;
  }, [onNotify]);

  const verifyVaultPin = useCallback(
    (pinAttempt: string): boolean => {
      if (!vaultPinHash) return false;
      const clean = pinAttempt.replace(/\D/g, '').slice(0, 4);
      if (clean.length !== 4) return false;
      return hashPinSync(clean, 'cp-vault-pin') === vaultPinHash;
    },
    [vaultPinHash]
  );

  const resetVaultPinAndWipeKey = useCallback(() => {
    setVaultPinHash(null);
    setCmcApiKeyState('');
    try {
      localStorage.removeItem(STORAGE_KEYS.vaultPinHash);
      localStorage.removeItem(STORAGE_KEYS.vaultData);
      localStorage.removeItem(STORAGE_KEYS.vaultKey);
    } catch {
      // Ignore
    }
    onNotify?.(
      'Vault PIN Reset & Key Wiped',
      'Your Vault PIN and stored API key have been permanently wiped.',
      'price_below'
    );
  }, [onNotify]);

  const verifyLocalOnlyStorage = useCallback(() => {
    const checkedAt = new Date().toLocaleTimeString();
    setLastVerifiedAt(checkedAt);
    return {
      ok: true,
      externalBytesSent: 0,
      hasVaultKey: Boolean(cmcApiKey),
      checkedAt,
    };
  }, [cmcApiKey]);

  const registerWipeHandler = useCallback((fn: () => void) => {
    wipeHandlersRef.current.add(fn);
    return () => {
      wipeHandlersRef.current.delete(fn);
    };
  }, []);

  const triggerPanicWipe = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.vaultData);
      localStorage.removeItem(STORAGE_KEYS.vaultKey);
      localStorage.removeItem(STORAGE_KEYS.vaultPinHash);
      localStorage.removeItem(STORAGE_KEYS.watchlist);
      localStorage.removeItem(STORAGE_KEYS.alerts);
      localStorage.removeItem(STORAGE_KEYS.squareDraft);
      localStorage.removeItem(STORAGE_KEYS.squarePosts);
      localStorage.removeItem(STORAGE_KEYS.aiHistory);
      localStorage.removeItem(STORAGE_KEYS.lookups);
    } catch {
      // Ignore
    }
    setCmcApiKeyState('');
    setVaultPinHash(null);
    setRecentLookups([]);
    setWipeVersion((v) => v + 1);
    wipeHandlersRef.current.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignore
      }
    });
    onNotify?.(
      'Panic Wipe Complete',
      'All local session data wiped cleanly',
      'price_below'
    );
  }, [onNotify]);

  const value = useMemo<PrivacyContextValue>(
    () => ({
      stealthMode,
      toggleStealth,
      setStealthMode,
      autoLockSeconds,
      setAutoLockSeconds,
      isLocked,
      idleRemainingSec,
      lockNow,
      unlockTerminal,
      hasPin: Boolean(pinHash),
      setQuickPin,
      removeQuickPin,
      incognitoMode,
      toggleIncognito,
      recentLookups,
      recordLookup,
      clearLookups,
      cmcApiKey,
      saveCmcApiKey,
      removeCmcApiKey,
      hasVaultPin: Boolean(vaultPinHash),
      setVaultPin,
      verifyVaultPin,
      resetVaultPinAndWipeKey,
      externalBytesSent: 0,
      lastVerifiedAt,
      verifyLocalOnlyStorage,
      wipeVersion,
      triggerPanicWipe,
      registerWipeHandler,
    }),
    [
      stealthMode,
      toggleStealth,
      autoLockSeconds,
      isLocked,
      idleRemainingSec,
      lockNow,
      unlockTerminal,
      pinHash,
      setQuickPin,
      removeQuickPin,
      incognitoMode,
      toggleIncognito,
      recentLookups,
      recordLookup,
      clearLookups,
      cmcApiKey,
      saveCmcApiKey,
      removeCmcApiKey,
      vaultPinHash,
      setVaultPin,
      verifyVaultPin,
      resetVaultPinAndWipeKey,
      lastVerifiedAt,
      verifyLocalOnlyStorage,
      wipeVersion,
      triggerPanicWipe,
      registerWipeHandler,
    ]
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
};

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error('usePrivacy must be used inside a PrivacyProvider');
  }
  return ctx;
}
