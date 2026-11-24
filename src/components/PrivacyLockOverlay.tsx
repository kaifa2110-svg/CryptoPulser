import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, ShieldCheck, Unlock } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { PulsarLogo } from './PulsarLogo';

export const PrivacyLockOverlay: React.FC = () => {
  const { isLocked, hasPin, unlockTerminal } = usePrivacy();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isLocked) return;
    setPinInput('');
    setErrorMsg(null);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [isLocked]);

  if (!isLocked) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = unlockTerminal(pinInput);
    if (!ok) {
      setErrorMsg('Incorrect 4-digit Quick-PIN. Please try again.');
      setPinInput('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#070B13]/88 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Pulser Privacy Lock Overlay"
    >
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0E1525]/95 p-7 shadow-2xl text-center space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <PulsarLogo size={52} />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg">
              <Lock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Local &amp; Private · Zero-Knowledge Shield</span>
            </div>
            <h2 className="font-display text-xl font-bold text-white mt-1">
              CryptoPulser Terminal Locked
            </h2>
          </div>
        </div>

        {/* Live Clock */}
        <div className="py-4 px-5 rounded-xl border border-slate-800 bg-[#090E1A]">
          <div className="font-mono tabular-nums text-4xl font-bold tracking-tight text-white">
            {now.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {now.toLocaleDateString([], {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {hasPin && (
            <div className="space-y-2 text-left">
              <label className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Enter 4-Digit Quick-PIN</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">Local SHA-Verified</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setErrorMsg(null);
                }}
                placeholder="••••"
                className="w-full py-3 px-4 rounded-xl border border-slate-700 bg-[#090E1A] text-center font-mono text-xl tracking-[0.75em] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg py-2 px-3">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={hasPin && pinInput.length < 4}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-45"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock Terminal</span>
          </button>
        </form>

        <p className="text-[11px] text-slate-500">
          All market streams remain paused visually while locked. Your local vault and session keys stay encrypted inside browser storage.
        </p>
      </div>
    </div>
  );
};
