import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FlaskConical,
  Loader2,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { usePrivacy } from '../context/PrivacyContext';
import { useUserAccount } from '../context/UserAccountContext';
import { Coin, CurrencyCode, FxRates, VerifiedWallet, WalletProviderId } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import {
  connectAndVerifyWallet,
  connectDemoJudgeWallet,
  OWNERSHIP_STATEMENT,
  WALLET_PROVIDERS,
} from '../utils/walletConnector';
import {
  buildWalletXrayProfile,
  fetchLiveWalletRpc,
  hydrateLiveWalletProfile,
  LiveRpcWalletPayload,
  shortenWalletAddress,
} from '../utils/walletProfiler';
import { CoinLogo } from './CoinLogo';
import { StealthValue } from './StealthText';
import { WalletProviderIcon } from './WalletProviderIcon';

interface VerifiedWalletManagerProps {
  coins: Coin[];
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  fxRates: FxRates;
  onDeepXrayInWhaleSonar?: (address: string) => void;
  initialSubTab?: 'portfolio' | 'receive';
  compactHeader?: boolean;
}

export const VerifiedWalletManager: React.FC<VerifiedWalletManagerProps> = ({
  coins,
  currency,
  onChangeCurrency,
  fxRates,
  onDeepXrayInWhaleSonar,
  initialSubTab = 'portfolio',
  compactHeader = false,
}) => {
  const { recordLookup } = usePrivacy();
  const { verifiedWallets, connectVerifiedWallet, disconnectVerifiedWallet } = useUserAccount();

  const [activeSubTab, setActiveSubTab] = useState<'portfolio' | 'receive'>(initialSubTab);
  const [selectedReceiveId, setSelectedReceiveId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [connectingProvider, setConnectingProvider] = useState<WalletProviderId | null>(null);
  const [connectStageMsg, setConnectStageMsg] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Live RPC payloads keyed by wallet id
  const [rpcPayloads, setRpcPayloads] = useState<Record<string, LiveRpcWalletPayload | null>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const fetchBalancesForWallets = useCallback(async (wallets: VerifiedWallet[]) => {
    if (wallets.length === 0) return;
    setIsRefreshingAll(true);
    const nextLoading: Record<string, boolean> = {};
    for (const w of wallets) nextLoading[w.id] = true;
    setLoadingMap((prev) => ({ ...prev, ...nextLoading }));

    await Promise.allSettled(
      wallets.map(async (w) => {
        const payload = await fetchLiveWalletRpc(w.address);
        setRpcPayloads((prev) => ({ ...prev, [w.id]: payload }));
        setLoadingMap((prev) => ({ ...prev, [w.id]: false }));
      })
    );
    setIsRefreshingAll(false);
  }, []);

  useEffect(() => {
    if (verifiedWallets.length === 0) return;
    fetchBalancesForWallets(verifiedWallets);
  }, [verifiedWallets.length, fetchBalancesForWallets]);

  useEffect(() => {
    if (verifiedWallets.length === 0) {
      setSelectedReceiveId('');
    } else if (!verifiedWallets.some((w) => w.id === selectedReceiveId)) {
      setSelectedReceiveId(verifiedWallets[0].id);
    }
  }, [verifiedWallets, selectedReceiveId]);

  const walletProfiles = useMemo(() => {
    return verifiedWallets.map((w) => {
      const livePayload = rpcPayloads[w.id];
      const profile = livePayload
        ? hydrateLiveWalletProfile(coins, w.address, livePayload)
        : buildWalletXrayProfile(coins, w.address);

      return {
        wallet: w,
        isLoading: Boolean(loadingMap[w.id]),
        isLiveRpc: Boolean(profile?.isLiveOnChain),
        netWorthUsd: profile?.netWorthUsd ?? 0,
        pnl24hPct: profile?.pnl24hPct ?? 0,
        holdings: profile?.holdings ?? [],
      };
    });
  }, [verifiedWallets, rpcPayloads, loadingMap, coins]);

  const combinedNetWorthUsd = useMemo(
    () =>
      walletProfiles.reduce(
        (acc, item) => acc + (Number.isFinite(item.netWorthUsd) ? item.netWorthUsd : 0),
        0
      ),
    [walletProfiles]
  );

  const combinedHoldings = useMemo(() => {
    const map = new Map<string, { coin: Coin; quantity: number; valueUsd: number }>();
    for (const wp of walletProfiles) {
      for (const h of wp.holdings) {
        const key = h.coin.symbol.toUpperCase();
        const existing = map.get(key);
        if (existing) {
          existing.quantity += h.quantity;
          existing.valueUsd += h.valueUsd;
        } else {
          map.set(key, {
            coin: h.coin,
            quantity: h.quantity,
            valueUsd: h.valueUsd,
          });
        }
      }
    }
    return Array.from(map.values())
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.valueUsd - a.valueUsd)
      .slice(0, 12);
  }, [walletProfiles]);

  const finishWalletVerification = async (wallet: VerifiedWallet) => {
    connectVerifiedWallet(wallet);
    setSelectedReceiveId(wallet.id);
    recordLookup('Whale Sonar', wallet.address);

    setLoadingMap((prev) => ({ ...prev, [wallet.id]: true }));
    const payload = await fetchLiveWalletRpc(wallet.address);
    setRpcPayloads((prev) => ({ ...prev, [wallet.id]: payload }));
    setLoadingMap((prev) => ({ ...prev, [wallet.id]: false }));
  };

  const handleConnectProvider = async (providerId: WalletProviderId) => {
    setConnectError(null);
    setConnectingProvider(providerId);
    setConnectStageMsg('Initializing secure non-custodial connection...');

    try {
      const result = await connectAndVerifyWallet(providerId, (_stage, detail) => {
        setConnectStageMsg(detail);
      });
      if (!result.ok || !result.wallet) {
        setConnectError(result.error || 'Wallet connection could not be completed.');
        return;
      }
      await finishWalletVerification(result.wallet);
    } finally {
      setConnectingProvider(null);
      setConnectStageMsg(null);
    }
  };

  const handleDemoJudgeConnect = async () => {
    setConnectError(null);
    setConnectingProvider('demo_judge');
    setConnectStageMsg('Starting 1-Click Judge Ownership Verification...');

    try {
      const result = await connectDemoJudgeWallet(verifiedWallets, (_stage, detail) => {
        setConnectStageMsg(detail);
      });
      if (!result.ok || !result.wallet) {
        setConnectError(result.error || 'Demo Judge wallet already linked.');
        return;
      }
      await finishWalletVerification(result.wallet);
    } finally {
      setConnectingProvider(null);
      setConnectStageMsg(null);
    }
  };

  const handleDisconnect = (walletId: string) => {
    disconnectVerifiedWallet(walletId);
    setRpcPayloads((prev) => {
      const next = { ...prev };
      delete next[walletId];
      return next;
    });
  };

  const handleCopyAddress = async (id: string, addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const formatTokenAmount = (qty: number) => {
    if (!Number.isFinite(qty)) return '0';
    if (qty >= 1000) return qty.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (qty >= 1) return qty.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return qty.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  const selectedReceiveWallet =
    verifiedWallets.find((w) => w.id === selectedReceiveId) ?? verifiedWallets[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Sub-Tabs: Portfolio & Wallets | Receive Crypto */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#090D16]">
        <button
          type="button"
          onClick={() => setActiveSubTab('portfolio')}
          className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
            activeSubTab === 'portfolio'
              ? 'bg-white dark:bg-[#131B2E] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>Verified Wallets ({verifiedWallets.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('receive')}
          className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
            activeSubTab === 'receive'
              ? 'bg-white dark:bg-[#131B2E] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Receive QR Code</span>
        </button>
      </div>

      {/* Combined Portfolio Balance Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131B2E] p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Verified Portfolio Balance ({currency})
          </span>

          <div className="flex items-center gap-1.5">
            {(['USD', 'PKR'] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onChangeCurrency(curr)}
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  currency === curr
                    ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {curr}
              </button>
            ))}
            {verifiedWallets.length > 0 && (
              <button
                type="button"
                onClick={() => fetchBalancesForWallets(verifiedWallets)}
                disabled={isRefreshingAll}
                title="Refresh live RPC balances"
                className="p-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-cyan-500 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
          {formatCompactCurrency(combinedNetWorthUsd, currency, fxRates)}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          {verifiedWallets.length === 0
            ? 'Connect a wallet below and sign a free zero-gas message to verify ownership and stream live balances.'
            : `Aggregated live across ${verifiedWallets.length} verified wallet${
                verifiedWallets.length > 1 ? 's' : ''
              } via Ethereum & Solana public RPCs`}
        </div>
      </div>

      {activeSubTab === 'portfolio' ? (
        <>
          {/* 1-Click Verified Wallet Connect Grid */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  1-Click Connect &amp; Verify Ownership
                </h3>
                {!compactHeader && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Zero-gas signature proof: &ldquo;{OWNERSHIP_STATEMENT}&rdquo;
                  </p>
                )}
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-semibold whitespace-nowrap shrink-0">
                No Gas · Read-Only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WALLET_PROVIDERS.map((provider) => {
                const isBusy = connectingProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={connectingProvider !== null}
                    onClick={() => handleConnectProvider(provider.id)}
                    className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D1321] hover:border-cyan-500/60 hover:bg-cyan-500/5 text-left transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <WalletProviderIcon providerId={provider.id} size={24} className="shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {provider.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {provider.subtitle}
                        </div>
                      </div>
                    </div>
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap shrink-0">
                        Connect
                      </span>
                    )}
                  </button>
                );
              })}

              {/* 1-Click Judge Test Button in 6th Grid Slot or full-width below */}
              <button
                type="button"
                disabled={connectingProvider !== null}
                onClick={handleDemoJudgeConnect}
                className="sm:col-span-2 flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-cyan-500/45 bg-cyan-500/10 hover:bg-cyan-500/20 text-left transition-colors cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-cyan-800 dark:text-cyan-200 truncate">
                      Demo Judge Wallet Connect (1-Click Test)
                    </div>
                    <div className="text-[10px] text-cyan-700/80 dark:text-cyan-300/80 truncate">
                      Simulates wallet connect + ownership signature &amp; fetches live ETH/SOL RPC balances
                    </div>
                  </div>
                </div>
                {connectingProvider === 'demo_judge' ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
                )}
              </button>
            </div>

            {connectStageMsg && (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 flex items-center gap-2 text-[11px] text-cyan-700 dark:text-cyan-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>{connectStageMsg}</span>
              </div>
            )}

            {connectError && (
              <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                {connectError}
              </div>
            )}
          </div>

          {/* Connected & Verified Wallets List */}
          {walletProfiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Verified Personal Wallets ({walletProfiles.length})
                </h3>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Cryptographically Signed
                </span>
              </div>

              {walletProfiles.map((item) => (
                <div
                  key={item.wallet.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <WalletProviderIcon
                        providerId={item.wallet.providerId}
                        size={26}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.wallet.providerName}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold whitespace-nowrap shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified Owner</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{item.wallet.network}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            <StealthValue>{shortenWalletAddress(item.wallet.address)}</StealthValue>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyAddress(item.wallet.id, item.wallet.address)}
                            className="text-slate-400 hover:text-cyan-500 cursor-pointer"
                            title="Copy public address"
                          >
                            {copiedId === item.wallet.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {item.isLoading ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-500">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              RPC...
                            </span>
                          ) : item.isLiveRpc ? (
                            <span className="font-mono text-[10px] font-bold text-emerald-500">
                              · LIVE RPC
                            </span>
                          ) : null}
                        </div>

                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          Sig Proof: {item.wallet.signature.slice(0, 14)}...{item.wallet.signature.slice(-8)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white">
                        {formatCompactCurrency(item.netWorthUsd, currency, fxRates)}
                      </div>
                      <div
                        className={`font-mono tabular-nums text-[11px] ${
                          item.pnl24hPct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {formatPercent(item.pnl24hPct)}
                      </div>
                    </div>
                  </div>

                  {item.holdings.length > 0 && (
                    <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      {item.holdings.slice(0, 3).map((h) => (
                        <div
                          key={`${item.wallet.id}-${h.coin.symbol}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CoinLogo coin={h.coin} size="sm" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {h.coin.symbol}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {formatTokenAmount(h.quantity)}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                            {formatCompactCurrency(h.valueUsd, currency, fxRates)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceiveId(item.wallet.id);
                          setActiveSubTab('receive');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                      >
                        <QrCode className="w-3 h-3 text-emerald-500" />
                        <span>Receive QR</span>
                      </button>

                      {onDeepXrayInWhaleSonar && (
                        <button
                          type="button"
                          onClick={() => onDeepXrayInWhaleSonar(item.wallet.address)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-cyan-500/35 bg-cyan-500/10 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 cursor-pointer whitespace-nowrap"
                        >
                          <span>Whale Sonar X-Ray</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(item.wallet.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-semibold text-rose-600 dark:text-rose-400 cursor-pointer whitespace-nowrap"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Combined Asset Holdings Across Verified Wallets */}
          {combinedHoldings.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  Combined Verified Asset Holdings
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Live CMC Prices ({currency})
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {combinedHoldings.map((item) => (
                  <div
                    key={item.coin.symbol}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CoinLogo coin={item.coin} size="sm" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.coin.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatTokenAmount(item.quantity)} {item.coin.symbol} ·{' '}
                          {formatPrice(item.coin.priceUsd, currency, fxRates)}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white shrink-0">
                      {formatCompactCurrency(item.valueUsd, currency, fxRates)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Receive Crypto QR Tab */
        <div className="space-y-4">
          {verifiedWallets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-3">
              <QrCode className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Verified Wallet Connected
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connect MetaMask, Trust Wallet, Phantom, Coinbase, Ledger, or Demo Judge Wallet to generate your verified Receive QR code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('portfolio')}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Connect Verified Wallet
              </button>
            </div>
          ) : (
            selectedReceiveWallet && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select Verified Receiving Wallet
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {verifiedWallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedReceiveId(w.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                          selectedReceiveWallet.id === w.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <WalletProviderIcon providerId={w.providerId} size={16} />
                        <span>{w.providerName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <QRCodeSVG
                      value={selectedReceiveWallet.address}
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#090D16"
                    />
                  </div>

                  <div className="space-y-1.5 w-full">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <WalletProviderIcon providerId={selectedReceiveWallet.providerId} size={18} />
                      <span>
                        {selectedReceiveWallet.providerName} · {selectedReceiveWallet.network}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Owner</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-[11px] text-slate-700 dark:text-slate-200 break-all">
                      <StealthValue>{selectedReceiveWallet.address}</StealthValue>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyAddress('receive-qr', selectedReceiveWallet.address)
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-bold cursor-pointer transition-colors"
                    >
                      {copiedId === 'receive-qr' ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Address Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>

                    {onDeepXrayInWhaleSonar && (
                      <button
                        type="button"
                        onClick={() =>
                          onDeepXrayInWhaleSonar(selectedReceiveWallet.address)
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-bold cursor-pointer transition-colors"
                      >
                        <span>Deep X-Ray in Whale Sonar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
