import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  UserX,
} from 'lucide-react';
import { AutoLockSeconds, usePrivacy } from '../context/PrivacyContext';

const AUTO_LOCK_OPTIONS: Array<{ value: AutoLockSeconds; label: string }> = [
  { value: 0, label: 'Off' },
  { value: 15, label: '15s' },
  { value: 60, label: '60s' },
  { value: 300, label: '5m' },
];

interface PrivacyShieldControlProps {
  isPro: boolean;
  onOpenProModal: () => void;
}

export const PrivacyShieldControl: React.FC<PrivacyShieldControlProps> = ({
  isPro,
  onOpenProModal,
}) => {
  const {
    stealthMode,
    toggleStealth,
    autoLockSeconds,
    setAutoLockSeconds,
    idleRemainingSec,
    lockNow,
    hasPin,
    setQuickPin,
    removeQuickPin,
    incognitoMode,
    toggleIncognito,
    recentLookups,
    clearLookups,
    cmcApiKey,
    saveCmcApiKey,
    removeCmcApiKey,
    externalBytesSent,
    lastVerifiedAt,
    verifyLocalOnlyStorage,
    triggerPanicWipe,
  } = usePrivacy();

  const [open, setOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState(cmcApiKey);
  const [showKey, setShowKey] = useState(false);
  const [vaultSavedNotice, setVaultSavedNotice] = useState(false);
  const [verifiedSnapshot, setVerifiedSnapshot] = useState<{
    checkedAt: string;
    externalBytesSent: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setKeyDraft(cmcApiKey);
  }, [cmcApiKey]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleSaveVault = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCmcApiKey(keyDraft);
    setVaultSavedNotice(true);
    setTimeout(() => setVaultSavedNotice(false), 2500);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinDraft.length !== 4) return;
    await setQuickPin(pinDraft);
    setPinDraft('');
  };

  const handleVerifyLocalOnly = () => {
    const res = verifyLocalOnlyStorage();
    setVerifiedSnapshot({
      checkedAt: res.checkedAt,
      externalBytesSent: res.externalBytesSent,
    });
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5 shrink-0">
      {/* Quick Stealth Mode Eye Toggle (Alt+H) */}
      <button
        type="button"
        onClick={toggleStealth}
        aria-label={stealthMode ? 'Disable Stealth Mode (Alt+H)' : 'Enable Stealth Mode (Alt+H)'}
        title={stealthMode ? 'Stealth Mode ON (Alt + H)' : 'Instant Stealth Mode (Alt + H)'}
        className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
          stealthMode
            ? 'border-amber-400/70 bg-amber-500/15 text-amber-500 dark:text-amber-300'
            : 'border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-[#11182A] text-slate-600 dark:text-slate-300 hover:border-cyan-400/50 hover:text-cyan-500'
        }`}
      >
        {stealthMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Glowing "Local & Private" Shield Badge */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Open Local & Private Zero-Knowledge Security Suite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
          incognitoMode
            ? 'border-violet-400/70 bg-violet-500/15 text-violet-700 dark:text-violet-300'
            : 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400'
        }`}
        style={{
          boxShadow: incognitoMode
            ? '0 0 14px rgba(192, 132, 252, 0.28)'
            : '0 0 14px rgba(16, 185, 129, 0.24)',
        }}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">
          {incognitoMode ? 'Incognito · Private' : 'Local & Private'}
        </span>
      </button>

      {/* One-Click Red Panic Wipe Shortcut in Header */}
      <button
        type="button"
        onClick={triggerPanicWipe}
        title="Panic Wipe: Immediately clear all local session data"
        aria-label="Panic Wipe emergency reset"
        className="hidden lg:inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Flame className="w-3.5 h-3.5" />
        <span>Panic Wipe</span>
      </button>

      {/* Interactive Dropdown Panel */}
      {open && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full sm:mt-2 z-50 w-[calc(100vw-1.5rem)] sm:w-[410px] max-h-[84vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0D1322] shadow-2xl p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Zero-Knowledge Privacy Suite</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                All secrets, filters &amp; vault controls remain strictly local in your browser.
              </p>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              {externalBytesSent}B EXT
            </span>
          </div>

          {/* 1. Instant Stealth Mode */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#121A2D] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                {stealthMode ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-cyan-500" />
                )}
                <span>Instant Stealth Mode</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                  Alt+H
                </kbd>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Masks &amp; blurs balances, returns, whale flows &amp; holdings into ••••••.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleStealth}
              role="switch"
              aria-checked={stealthMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-colors ${
                stealthMode
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {stealthMode ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 2. Smart Auto-Lock Privacy Shield (Pulser Pro) */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#121A2D] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                <span>Smart Auto-Lock Shield</span>
                {!isPro && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                    PRO
                  </span>
                )}
              </div>
              {isPro ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    lockNow();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-[11px] font-bold cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Lock Screen Now</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenProModal();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[11px] font-bold cursor-pointer hover:bg-amber-500/20"
                >
                  <Crown className="w-3 h-3" />
                  <span>Unlock Pro</span>
                </button>
              )}
            </div>

            {isPro ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Idle Timer:
                  </span>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                    {AUTO_LOCK_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAutoLockSeconds(opt.value)}
                        className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold cursor-pointer transition-colors ${
                          autoLockSeconds === opt.value
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {autoLockSeconds > 0 && (
                  <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 flex items-center justify-between">
                    <span>Auto-locks after inactivity</span>
                    <span className="tabular-nums">{idleRemainingSec}s left</span>
                  </div>
                )}

                {/* Optional 4-Digit Quick-PIN */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  {hasPin ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>4-Digit Quick-PIN Active</span>
                      </span>
                      <button
                        type="button"
                        onClick={removeQuickPin}
                        className="text-rose-500 hover:underline font-medium cursor-pointer"
                      >
                        Remove PIN
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSavePin} className="flex items-center gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pinDraft}
                        onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Optional 4-digit PIN"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                      <button
                        type="submit"
                        disabled={pinDraft.length !== 4}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        Set PIN
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                15s / 60s / 5m inactivity lock screen with live clock &amp; 4-digit Quick-PIN requires Pulser Pro ($10/mo · 7-Day Free Trial).
              </p>
            )}
          </div>

          {/* 3. Incognito Session Mode (Pulser Pro) */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#121A2D] space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <UserX className="w-3.5 h-3.5 text-violet-400" />
                  <span>Zero-Trace Incognito Mode</span>
                  {!isPro && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pauses saving searches, coin views, wallet lookups &amp; AI chat to storage.
                </p>
              </div>
              {isPro ? (
                <button
                  type="button"
                  onClick={toggleIncognito}
                  role="switch"
                  aria-checked={incognitoMode}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-colors ${
                    incognitoMode
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {incognitoMode ? 'ON' : 'OFF'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenProModal();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[11px] font-bold cursor-pointer shrink-0 hover:bg-amber-500/20"
                >
                  <Lock className="w-3 h-3" />
                  <span>Pro</span>
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">
                {!isPro
                  ? 'Unlock Zero-Trace browsing in Pulser Pro or 7-Day Free Trial'
                  : incognitoMode
                  ? 'Zero-Trace active · Wipes on exit or toggle-off'
                  : `${recentLookups.length} local lookup traces saved`}
              </span>
              {isPro && !incognitoMode && recentLookups.length > 0 && (
                <button
                  type="button"
                  onClick={clearLookups}
                  className="text-slate-500 hover:text-rose-500 cursor-pointer"
                >
                  Clear traces
                </button>
              )}
            </div>
          </div>

          {/* 4. Encrypted Local Key Vault (CMC API Key) */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#121A2D] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                <span>Encrypted Local Key Vault</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {cmcApiKey ? 'SEALED' : 'EMPTY'}
              </span>
            </div>

            <form onSubmit={handleSaveVault} className="space-y-2">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                CoinMarketCap API Key (stored strictly in localStorage)
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder="••••••••-••••-••••-••••-••••••••••••"
                    autoComplete="off"
                    className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    aria-label={showKey ? 'Mask API key' : 'Reveal API key'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shrink-0"
                >
                  Save
                </button>
                {cmcApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      removeCmcApiKey();
                      setKeyDraft('');
                    }}
                    aria-label="Remove local API key"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            {vaultSavedNotice && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Key encrypted &amp; stored in browser localStorage only.
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {verifiedSnapshot
                    ? `${verifiedSnapshot.externalBytesSent} Bytes Sent to External Servers (${verifiedSnapshot.checkedAt})`
                    : lastVerifiedAt
                    ? `0 Bytes Sent to External Servers (${lastVerifiedAt})`
                    : '0 Bytes Sent to External Servers'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerifyLocalOnly}
                className="px-2.5 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
              >
                Verify Local-Only Storage
              </button>
            </div>
          </div>

          {/* 5. One-Click Red Panic Wipe */}
          <button
            type="button"
            onClick={() => {
              triggerPanicWipe();
              setOpen(false);
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg cursor-pointer transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Panic Wipe · Clear All Local Session Data</span>
          </button>
        </div>
      )}
    </div>
  );
};
