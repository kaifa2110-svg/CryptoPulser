import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Coins as CoinsIcon,
  Flame,
  Gauge,
  Radar,
  Sprout,
  Waves,
} from 'lucide-react';
import { AdvertiseModal } from './components/AdvertiseModal';
import { AlertCenterPopover, AlertToastStack } from './components/AlertCenterPopover';
import { AltcoinsIndexView } from './components/AltcoinsIndexView';
import { AntiFomoGuardModal } from './components/AntiFomoGuardModal';
import { AskPulserAIDrawer } from './components/AskPulserAIDrawer';
import { AuthModal } from './components/AuthModal';
import { BubbleRadarView } from './components/BubbleRadarView';
import { CheckoutModal } from './components/CheckoutModal';
import { CoinDetailModal } from './components/CoinDetailModal';
import { CryptoBubblesView } from './components/CryptoBubblesView';
import { DerivativesView } from './components/DerivativesView';
import { DexScanView } from './components/DexScanView';
import { EtfTrackerView } from './components/EtfTrackerView';
import { GainersLosersView } from './components/GainersLosersView';
import { InvestmentSimulator } from './components/InvestmentSimulator';
import { IpoLaunchpadView } from './components/IpoLaunchpadView';
import { LiquidityMapView } from './components/LiquidityMapView';
import { MarketToolbar } from './components/MarketToolbar';
import { MyWalletDrawer } from './components/MyWalletDrawer';
import { NewsView } from './components/NewsView';
import { PrivacyLockOverlay } from './components/PrivacyLockOverlay';
import { ProFilterDrawer } from './components/ProFilterDrawer';
import { ProPricingModal } from './components/ProPricingModal';
import { PulserSquareView } from './components/PulserSquareView';
import { RwaHubView } from './components/RwaHubView';
import { SettingsModal } from './components/SettingsModal';
import { SharePageModal } from './components/SharePageModal';
import { SponsoredBanner } from './components/SponsoredBanner';
import { TechnicalIndicatorsView } from './components/TechnicalIndicatorsView';
import { Top1000Table } from './components/Top1000Table';
import { TopBar } from './components/TopBar';
import { TrendingView } from './components/TrendingView';
import { UserProfileDrawer } from './components/UserProfileDrawer';
import { WatchlistView } from './components/WatchlistView';
import { WhaleSonarView } from './components/WhaleSonarView';
import { YieldView } from './components/YieldView';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';
import { UserAccountProvider, useUserAccount } from './context/UserAccountContext';
import {
  applyProMarketFilters,
  buildTop1000Coins,
  countActiveProFilters,
  EMPTY_PRO_FILTERS,
  INITIAL_SQUARE_POSTS,
} from './data/cryptoEngine';
import {
  AlertKind,
  AlertToast,
  BlockchainNetwork,
  CheckoutReceipt,
  Coin,
  CurrencyCode,
  CustomSponsoredAd,
  FxRates,
  GlobalMarketStats,
  LaunchScreenOption,
  MarketSubTab,
  NavTab,
  NewsArticle,
  PlanTier,
  PriceWhaleAlert,
  ProMarketFilters,
  SponsoredAdSlot,
  SquarePost,
} from './types/crypto';
import { CURRENCY_META, formatPrice } from './utils/formatters';

const DEFAULT_FX: FxRates = {
  USD: 1,
  PKR: 278.5,
  EUR: 0.92,
  AED: 3.6725,
  INR: 84.4,
  GBP: 0.79,
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface InnerAppProps {
  toasts: AlertToast[];
  pushToast: (toast: Omit<AlertToast, 'id' | 'timestamp'>) => void;
  dismissToast: (id: string) => void;
  setDemoPlan: React.Dispatch<React.SetStateAction<PlanTier>>;
  trialEndsAt: number | null;
  setTrialEndsAt: React.Dispatch<React.SetStateAction<number | null>>;
  nowMs: number;
  setNowMs: React.Dispatch<React.SetStateAction<number>>;
  isTrialActive: boolean;
  trialDaysLeft: number;
  activePlan: PlanTier;
  isPro: boolean;
}

const CryptoPulserApp: React.FC<InnerAppProps> = ({
  toasts,
  pushToast,
  dismissToast,
  setDemoPlan,
  trialEndsAt,
  setTrialEndsAt,
  nowMs,
  setNowMs,
  isTrialActive,
  trialDaysLeft,
  activePlan,
  isPro,
}) => {
  const { registerWipeHandler, cmcApiKey } = usePrivacy();
  const {
    currentUser,
    themePref,
    setThemePref,
    launchScreen,
    pushNotificationsEnabled,
    logSecurityActivity,
    verifiedWallets,
  } = useUserAccount();
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (launchScreen === 'Pulser Square') return 'pulser-square';
    return 'top1000';
  });
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    readStorage<CurrencyCode>('cp_currency', 'USD')
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() =>
    readStorage<string[]>('cp_watchlist', ['bitcoin', 'ethereum', 'solana'])
  );
  const [alerts, setAlerts] = useState<PriceWhaleAlert[]>(() =>
    readStorage<PriceWhaleAlert[]>('cp_alerts', [])
  );
  const [squarePosts, setSquarePosts] = useState<SquarePost[]>(() =>
    readStorage<SquarePost[]>('cp_square_posts', INITIAL_SQUARE_POSTS)
  );

  const [liveCoinsRaw, setLiveCoinsRaw] = useState<Coin[]>([]);
  const [fxRates, setFxRates] = useState<FxRates>(DEFAULT_FX);
  const [serverGlobal, setServerGlobal] = useState<Partial<GlobalMarketStats>>({});
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [detailCoin, setDetailCoin] = useState<Coin | null>(null);
  const [simulatorCoinId, setSimulatorCoinId] = useState<string>('bitcoin');
  const [radarCoinId, setRadarCoinId] = useState<string>('ethereum');
  const [liquidityCoinId, setLiquidityCoinId] = useState<string>('bitcoin');
  const [marketSubTab, setMarketSubTab] = useState<MarketSubTab>(() =>
    launchScreen === 'Whale Sonar' ? 'whale-sonar' : 'coins'
  );
  const [selectedNetwork, setSelectedNetwork] = useState<BlockchainNetwork>('All Networks');
  const [proFilters, setProFilters] = useState<ProMarketFilters>(EMPTY_PRO_FILTERS);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [proModalOpen, setProModalOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'pro' | 'pro_max'>('pro');
  const [checkoutTrial, setCheckoutTrial] = useState(false);
  const [advertiseModalOpen, setAdvertiseModalOpen] = useState(false);
  const [advertiseSlot, setAdvertiseSlot] = useState<SponsoredAdSlot>('vault');
  const [advertiseMode, setAdvertiseMode] = useState<'customize' | 'inquiry'>('customize');
  const [customAds, setCustomAds] = useState<Partial<Record<SponsoredAdSlot, CustomSponsoredAd>>>(
    () => readStorage<Partial<Record<SponsoredAdSlot, CustomSponsoredAd>>>('cp_custom_ads', {})
  );

  const [alertCenterOpen, setAlertCenterOpen] = useState(false);
  const [alertTargetCoin, setAlertTargetCoin] = useState<Coin | null>(null);
  const [alertTargetKind, setAlertTargetKind] = useState<AlertKind>('price_above');
  const [antiFomoOpen, setAntiFomoOpen] = useState(false);
  const [antiFomoCoin, setAntiFomoCoin] = useState<Coin | null>(null);
  const [myWalletOpen, setMyWalletOpen] = useState(false);
  const [whaleSonarTargetAddress, setWhaleSonarTargetAddress] = useState<{
    address: string;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    setSystemPrefersDark(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = themePref === 'system' ? systemPrefersDark : themePref === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('cp_dark', JSON.stringify(isDark));
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('cp_currency', JSON.stringify(currency));
  }, [currency]);



  useEffect(() => {
    localStorage.setItem('cp_watchlist', JSON.stringify(watchlistIds));
  }, [watchlistIds]);

  useEffect(() => {
    localStorage.setItem('cp_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('cp_square_posts', JSON.stringify(squarePosts));
  }, [squarePosts]);

  useEffect(() => {
    localStorage.setItem('cp_custom_ads', JSON.stringify(customAds));
  }, [customAds]);

  // If user configured Launch Screen = Simulator, smoothly scroll to Simulator on initial mount
  useEffect(() => {
    if (launchScreen !== 'Simulator') return;
    const t = window.setTimeout(() => {
      const el = document.getElementById('investment-simulator');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log "API Key Sealed" into Account Activities whenever Local Vault key is newly sealed
  const prevApiKeyRef = React.useRef<string>(cmcApiKey);
  useEffect(() => {
    if (cmcApiKey && cmcApiKey !== prevApiKeyRef.current) {
      logSecurityActivity('API Key Sealed', 'CoinMarketCap API key encrypted & sealed in Local Vault');
    }
    prevApiKeyRef.current = cmcApiKey;
  }, [cmcApiKey, logSecurityActivity]);

  // Register Panic Wipe reset handler
  useEffect(() => {
    return registerWipeHandler(() => {
      setWatchlistIds([]);
      setAlerts([]);
      setSquarePosts(INITIAL_SQUARE_POSTS);
      setDetailCoin(null);
      setAlertCenterOpen(false);
      setSelectedNetwork('All Networks');
      setProFilters(EMPTY_PRO_FILTERS);
    });
  }, [registerWipeHandler]);

  const fetchMarkets = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      if (cmcApiKey && cmcApiKey.trim()) {
        headers['x-cmc-api-key'] = cmcApiKey.trim();
      }
      const res = await fetch('/api/markets', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.coins)) setLiveCoinsRaw(data.coins);
        if (data?.fxRates) setFxRates(data.fxRates);
        if (data?.global) {
          setServerGlobal({
            ...data.global,
            source: data.source,
            updatedAt: data.updatedAt,
          });
        }
      }
      if (manual) {
        pushToast({
          title: 'Markets Synced',
          message: 'Live prices, spot volumes, and derivatives telemetry refreshed.',
          kind: 'price_above',
        });
      }
    } catch {
      // Fallback dataset in buildTop1000Coins keeps dashboard functional
    } finally {
      setIsLoadingMarkets(false);
      setIsRefreshing(false);
    }
  }, [pushToast, cmcApiKey]);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.articles)) setNewsArticles(data.articles);
      }
    } catch {
      // Handled smoothly
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets(false);
    fetchNews();
    const timer = setInterval(() => fetchMarkets(false), 60000);
    return () => clearInterval(timer);
  }, [fetchMarkets, fetchNews]);

  const { coins, derivedGlobal } = useMemo(
    () => buildTop1000Coins(liveCoinsRaw),
    [liveCoinsRaw]
  );

  // Monitor live price thresholds against active alerts
  useEffect(() => {
    if (coins.length === 0 || alerts.length === 0) return;
    let changed = false;
    const updated = alerts.map((al) => {
      if (!al.active || al.triggeredAt) return al;
      const coin = coins.find((c) => c.id === al.coinId);
      if (!coin) return al;
      const hitAbove = al.kind === 'price_above' && coin.priceUsd >= al.thresholdUsd;
      const hitBelow = al.kind === 'price_below' && coin.priceUsd <= al.thresholdUsd;
      if (hitAbove || hitBelow) {
        changed = true;
        if (pushNotificationsEnabled) {
          pushToast({
            title: `${coin.symbol} Price Alert Triggered`,
            message: `${coin.name} reached ${formatPrice(coin.priceUsd, currency, fxRates)} (${
              al.kind === 'price_above' ? 'Above' : 'Below'
            } target).`,
            kind: al.kind,
          });
        }
        return { ...al, triggeredAt: new Date().toISOString() };
      }
      return al;
    });
    if (changed) setAlerts(updated);
  }, [coins, alerts, currency, fxRates, pushToast, pushNotificationsEnabled]);

  const globalStats: GlobalMarketStats = useMemo(
    () => ({
      totalMarketCapUsd:
        serverGlobal.totalMarketCapUsd && serverGlobal.totalMarketCapUsd > 0
          ? serverGlobal.totalMarketCapUsd
          : derivedGlobal.totalMarketCapUsd ?? 3150000000000,
      totalVolume24hUsd:
        serverGlobal.totalVolume24hUsd && serverGlobal.totalVolume24hUsd > 0
          ? serverGlobal.totalVolume24hUsd
          : derivedGlobal.totalVolume24hUsd ?? 142000000000,
      btcDominance:
        serverGlobal.btcDominance && serverGlobal.btcDominance > 0
          ? serverGlobal.btcDominance
          : derivedGlobal.btcDominance ?? 56.4,
      ethDominance:
        serverGlobal.ethDominance && serverGlobal.ethDominance > 0
          ? serverGlobal.ethDominance
          : derivedGlobal.ethDominance ?? 12.8,
      marketCapChange24h:
        serverGlobal.marketCapChange24h || derivedGlobal.marketCapChange24h || 2.15,
      activeCryptocurrencies: serverGlobal.activeCryptocurrencies ?? 14820,
      altcoinSeasonIndex: derivedGlobal.altcoinSeasonIndex ?? 48,
      fearGreedValue: serverGlobal.fearGreedValue ?? 64,
      fearGreedLabel: serverGlobal.fearGreedLabel ?? 'Greed',
      updatedAt: serverGlobal.updatedAt ?? new Date().toISOString(),
      source: serverGlobal.source ?? 'live-feed',
    }),
    [serverGlobal, derivedGlobal]
  );

  const simulatorCoin = useMemo(
    () => coins.find((c) => c.id === simulatorCoinId) ?? coins[0],
    [coins, simulatorCoinId]
  );

  const radarCoin = useMemo(
    () => coins.find((c) => c.id === radarCoinId) ?? coins[1] ?? coins[0],
    [coins, radarCoinId]
  );

  const liquidityCoin = useMemo(
    () => coins.find((c) => c.id === liquidityCoinId) ?? coins[0],
    [coins, liquidityCoinId]
  );

  const filteredMarketCoins = useMemo(
    () => applyProMarketFilters(coins, selectedNetwork, proFilters),
    [coins, selectedNetwork, proFilters]
  );

  const activeFilterCount = useMemo(
    () => countActiveProFilters(proFilters),
    [proFilters]
  );

  const toggleWatchlist = (coinId: string) => {
    setWatchlistIds((prev) =>
      prev.includes(coinId) ? prev.filter((id) => id !== coinId) : [...prev, coinId]
    );
  };

  const jumpToSimulator = (coin?: Coin) => {
    if (coin) setSimulatorCoinId(coin.id);
    setActiveTab('top1000');
    setTimeout(() => {
      const el = document.getElementById('investment-simulator');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const openAlertForCoin = (
    coin: Coin | null,
    kind: AlertKind = 'price_above'
  ) => {
    setAlertTargetCoin(coin || coins[0] || null);
    setAlertTargetKind(kind);
    setAlertCenterOpen(true);
  };

  const handleAddAlert = (newAlert: PriceWhaleAlert) => {
    setAlerts((prev) => [newAlert, ...prev]);
    const meta = CURRENCY_META[newAlert.createdInCurrency];
    pushToast({
      title: `${newAlert.symbol} Alert Active`,
      message: `Monitoring ${
        newAlert.kind === 'price_above'
          ? 'price above'
          : newAlert.kind === 'price_below'
          ? 'price below'
          : 'whale transfers ≥'
      } ${meta.symbol}${newAlert.displayThreshold.toLocaleString('en-US')}.`,
      kind: newAlert.kind,
    });
  };

  const handleTestTrigger = (al: PriceWhaleAlert) => {
    const meta = CURRENCY_META[al.createdInCurrency];
    setAlerts((prev) =>
      prev.map((item) =>
        item.id === al.id ? { ...item, triggeredAt: new Date().toISOString() } : item
      )
    );
    pushToast({
      title: `${al.symbol} ${al.kind === 'whale_transfer' ? 'Whale Sonar' : 'Price'} Alert Triggered`,
      message:
        al.kind === 'whale_transfer'
          ? `Detected ${meta.symbol}${al.displayThreshold.toLocaleString('en-US')}+ institutional transfer on ${al.coinName}.`
          : `${al.coinName} crossed your ${meta.symbol}${al.displayThreshold.toLocaleString('en-US')} threshold.`,
      kind: al.kind,
    });
  };

  const handleStartCheckout = (plan: 'pro' | 'pro_max', useTrial: boolean) => {
    setCheckoutPlan(plan);
    setCheckoutTrial(plan === 'pro' ? useTrial : false);
    setProModalOpen(false);
    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = (receipt: CheckoutReceipt) => {
    if (receipt.isTrial) {
      const ends = Date.now() + 7 * 24 * 60 * 60 * 1000;
      setTrialEndsAt(ends);
      setNowMs(Date.now());
      setDemoPlan('free');
      pushToast({
        title: 'Pro Trial Active • 7 Days Left',
        message: `7-Day Pulser Pro Trial activated (${receipt.amountFormatted} due today).`,
        kind: 'price_above',
      });
    } else {
      setTrialEndsAt(null);
      setDemoPlan(receipt.plan);
      pushToast({
        title:
          receipt.plan === 'pro_max'
            ? 'Pulser Pro Max Unlocked'
            : 'Pulser Pro Unlocked',
        message: `Receipt ${receipt.id} confirmed (${receipt.methodDetail}).`,
        kind: 'price_above',
      });
    }
  };

  const handleQuickUnlockPlan = (plan: PlanTier) => {
    if (plan === 'free') {
      setTrialEndsAt(null);
    }
    setDemoPlan(plan);
    pushToast({
      title:
        plan === 'pro_max'
          ? 'Demo Mode: Pro Max Active'
          : plan === 'pro'
          ? 'Demo Mode: Pulser Pro Active'
          : 'Reverted to Free Tier',
      message:
        plan === 'pro_max'
          ? 'All Pro tools + Unlimited Advanced AI Copilots unlocked.'
          : plan === 'pro'
          ? 'Bubble Radar, Whale Sonar, Deep History & Ad-Free unlocked.'
          : 'Switched back to Free ($0/mo) tier.',
      kind: plan === 'free' ? 'price_below' : 'price_above',
    });
  };

  const handleCancelTrial = () => {
    setTrialEndsAt(null);
    setDemoPlan('free');
    pushToast({
      title: 'Reverted to Free Tier',
      message: 'Your subscription/trial was canceled. Free tier features remain active.',
      kind: 'price_below',
    });
  };

  const handleSelectNavTab = useCallback(
    (tab: NavTab) => {
      if (tab === 'whale-sonar') {
        setActiveTab('top1000');
        setMarketSubTab('whale-sonar');
      } else {
        if (tab === 'top1000' && marketSubTab === 'whale-sonar') {
          setMarketSubTab('coins');
        }
        setActiveTab(tab);
      }
    },
    [marketSubTab]
  );

  const effectiveTopBarTab: NavTab =
    activeTab === 'top1000' && marketSubTab === 'whale-sonar' ? 'whale-sonar' : activeTab;

  return (
    <div className="min-h-screen w-full overflow-x-clip flex flex-col bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100">
      <TopBar
        activeTab={effectiveTopBarTab}
        onSelectTab={handleSelectNavTab}
        onJumpToSimulator={() => jumpToSimulator()}
        currency={currency}
        fxRates={fxRates}
        activePlan={activePlan}
        isTrialActive={isTrialActive}
        trialDaysLeft={trialDaysLeft}
        onOpenProModal={() => setProModalOpen(true)}
        activeAlertCount={alerts.length}
        onOpenAlertCenter={() => openAlertForCoin(coins[0] || null, 'price_above')}
        onOpenAntiFomoGuard={() => {
          setAntiFomoCoin(coins[0] || null);
          setAntiFomoOpen(true);
        }}
        onOpenMyWallet={() => setMyWalletOpen(true)}
        savedWalletCount={verifiedWallets.length}
      />

      <MarketToolbar
        coins={coins}
        globalStats={globalStats}
        currency={currency}
        onChangeCurrency={setCurrency}
        fxRates={fxRates}
        isDark={isDark}
        onToggleTheme={() => setThemePref(isDark ? 'light' : 'dark')}
        activeTab={activeTab}
        onSelectTab={handleSelectNavTab}
        watchlistCount={watchlistIds.length}
        isPro={isPro}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchMarkets(true)}
        onOpenShareModal={() => setShareModalOpen(true)}
        onSelectCoin={setDetailCoin}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-6 space-y-6 overflow-x-hidden min-w-0">
        {/* Top Sponsored Placement (Free Tier or Custom Banner) */}
        <SponsoredBanner
          variant="vault"
          isPro={isPro}
          customAd={customAds.vault ?? null}
          onOpenAdvertise={() => {
            setAdvertiseSlot('vault');
            setAdvertiseMode('inquiry');
            setAdvertiseModalOpen(true);
          }}
          onCustomizeAd={(slot) => {
            setAdvertiseSlot(slot);
            setAdvertiseMode('customize');
            setAdvertiseModalOpen(true);
          }}
          onOpenProModal={() => setProModalOpen(true)}
        />

        {/* Active Navigation View */}
        {activeTab === 'top1000' && (
          <div className="space-y-4 min-w-0">
            {/* CoinMarketCap-style Pro Markets Sub-Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1">
                {(
                  [
                    {
                      id: 'coins',
                      label: 'Coins (Top 1000)',
                      icon: <CoinsIcon className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'derivatives',
                      label: 'Open Interest & Liquidations',
                      icon: <Flame className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'liquidity-map',
                      label: 'Liquidity Map',
                      icon: <Activity className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'etf-tracker',
                      label: 'ETF Trackers',
                      icon: <BarChart3 className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'yield',
                      label: 'Yield',
                      icon: <Sprout className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'technical-indicators',
                      label: 'Technical Indicators',
                      icon: <Gauge className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'dex-scan',
                      label: 'DEX Scan',
                      icon: <Radar className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'whale-sonar',
                      label: 'Whale Sonar',
                      pro: true,
                      icon: <Waves className="w-3.5 h-3.5" />,
                    },
                  ] as Array<{ id: MarketSubTab; label: string; pro?: boolean; icon: React.ReactNode }>
                ).map((sub) => {
                  const active = marketSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setMarketSubTab(sub.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                      {sub.pro && !isPro && (
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider ${
                            active
                              ? 'text-amber-300 dark:text-slate-950/80'
                              : 'text-amber-500 dark:text-amber-400'
                          }`}
                        >
                          PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="hidden xl:flex items-center gap-2 pr-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                <span>Network: <strong className="text-slate-800 dark:text-slate-200">{selectedNetwork}</strong></span>
                {activeFilterCount > 0 && (
                  <span className="text-emerald-500 font-semibold">
                    · {activeFilterCount} Pro Filter{activeFilterCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            {marketSubTab === 'coins' && (
              <Top1000Table
                allCoins={coins}
                coins={filteredMarketCoins}
                currency={currency}
                fxRates={fxRates}
                watchlistIds={watchlistIds}
                onToggleWatchlist={toggleWatchlist}
                onSelectCoin={setDetailCoin}
                onOpenAlertForCoin={(c) => openAlertForCoin(c, 'price_above')}
                selectedNetwork={selectedNetwork}
                onSelectNetwork={setSelectedNetwork}
                activeFilterCount={activeFilterCount}
                onOpenFilters={() => setFilterDrawerOpen(true)}
                onResetAllFilters={() => {
                  setSelectedNetwork('All Networks');
                  setProFilters(EMPTY_PRO_FILTERS);
                }}
                isLoading={isLoadingMarkets}
              />
            )}

            {marketSubTab === 'derivatives' && (
              <DerivativesView
                allCoins={coins}
                filteredCoins={filteredMarketCoins}
                currency={currency}
                fxRates={fxRates}
                selectedNetwork={selectedNetwork}
                onSelectNetwork={setSelectedNetwork}
                activeFilterCount={activeFilterCount}
                onOpenFilters={() => setFilterDrawerOpen(true)}
                onSelectCoin={setDetailCoin}
              />
            )}

            {marketSubTab === 'liquidity-map' && liquidityCoin && (
              <LiquidityMapView
                coins={coins}
                selectedCoin={liquidityCoin}
                onSelectCoin={(c) => setLiquidityCoinId(c.id)}
                currency={currency}
                fxRates={fxRates}
                onOpenCoinModal={setDetailCoin}
              />
            )}

            {marketSubTab === 'etf-tracker' && (
              <EtfTrackerView
                coins={coins}
                currency={currency}
                fxRates={fxRates}
              />
            )}

            {marketSubTab === 'yield' && (
              <YieldView
                coins={coins}
                currency={currency}
                fxRates={fxRates}
                onSelectCoin={setDetailCoin}
              />
            )}

            {marketSubTab === 'technical-indicators' && (
              <TechnicalIndicatorsView
                coins={coins}
                currency={currency}
                fxRates={fxRates}
                onSelectCoin={setDetailCoin}
              />
            )}

            {marketSubTab === 'dex-scan' && (
              <DexScanView
                coins={coins}
                currency={currency}
                fxRates={fxRates}
                onSelectCoin={setDetailCoin}
              />
            )}

            {marketSubTab === 'whale-sonar' && (
              <WhaleSonarView
                coins={coins}
                currency={currency}
                fxRates={fxRates}
                isPro={isPro}
                onOpenProModal={() => setProModalOpen(true)}
                onSelectCoin={setDetailCoin}
                onOpenAlertForCoin={(c, kind) => openAlertForCoin(c, kind || 'whale_transfer')}
                externalInspectWallet={whaleSonarTargetAddress}
              />
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <TrendingView
            coins={coins}
            currency={currency}
            fxRates={fxRates}
            onSelectCoin={setDetailCoin}
          />
        )}

        {activeTab === 'crypto-bubbles' && (
          <CryptoBubblesView
            coins={coins}
            watchlistIds={watchlistIds}
            currency={currency}
            fxRates={fxRates}
            isDark={isDark}
            onSelectCoin={setDetailCoin}
          />
        )}

        {activeTab === 'gainers-losers' && (
          <GainersLosersView
            coins={coins}
            currency={currency}
            fxRates={fxRates}
            onSelectCoin={setDetailCoin}
          />
        )}

        {activeTab === 'rwa' && (
          <RwaHubView
            coins={coins}
            currency={currency}
            fxRates={fxRates}
            onSelectCoin={setDetailCoin}
          />
        )}

        {activeTab === 'ipo-launchpad' && (
          <IpoLaunchpadView
            coins={coins}
            currency={currency}
            fxRates={fxRates}
            onSelectCoin={setDetailCoin}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            coins={coins}
            watchlistIds={watchlistIds}
            currency={currency}
            fxRates={fxRates}
            onToggleWatchlist={toggleWatchlist}
            onSelectCoin={setDetailCoin}
            onExploreMarkets={() => setActiveTab('top1000')}
          />
        )}

        {activeTab === 'altcoins' && (
          <AltcoinsIndexView
            coins={coins}
            globalStats={globalStats}
            currency={currency}
            fxRates={fxRates}
            onSelectCoin={setDetailCoin}
          />
        )}

        {activeTab === 'news' && (
          <NewsView articles={newsArticles} isLoading={isLoadingNews} />
        )}

        {activeTab === 'pulser-square' && (
          <PulserSquareView
            coins={coins}
            currency={currency}
            fxRates={fxRates}
            posts={squarePosts}
            onCreatePost={(post) => setSquarePosts((prev) => [post, ...prev])}
            onToggleLike={(postId) =>
              setSquarePosts((prev) =>
                prev.map((p) =>
                  p.id === postId
                    ? {
                        ...p,
                        likedByMe: !p.likedByMe,
                        likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
                      }
                    : p
                )
              )
            }
            onToggleRepost={(postId) =>
              setSquarePosts((prev) =>
                prev.map((p) =>
                  p.id === postId
                    ? {
                        ...p,
                        repostedByMe: !p.repostedByMe,
                        reposts: p.repostedByMe ? p.reposts - 1 : p.reposts + 1,
                      }
                    : p
                )
              )
            }
            onAddComment={(postId, content) =>
              setSquarePosts((prev) =>
                prev.map((p) =>
                  p.id === postId
                    ? {
                        ...p,
                        comments: [
                          ...p.comments,
                          {
                            id: `cm-${Date.now()}`,
                            author: currentUser?.displayName || 'CryptoPulser Trader',
                            handle: currentUser?.username || '@pulser_member',
                            content,
                            timestamp: new Date().toISOString(),
                          },
                        ],
                      }
                    : p
                )
              )
            }
            onSelectCoin={setDetailCoin}
            isPro={isPro}
            pulserSquareAd={customAds['pulser-square'] ?? null}
            onOpenAdvertise={() => {
              setAdvertiseSlot('pulser-square');
              setAdvertiseMode('inquiry');
              setAdvertiseModalOpen(true);
            }}
            onCustomizeAd={() => {
              setAdvertiseSlot('pulser-square');
              setAdvertiseMode('customize');
              setAdvertiseModalOpen(true);
            }}
            onOpenProModal={() => setProModalOpen(true)}
            onNotifyShare={(msg) =>
              pushToast({
                title: 'Pulser Square',
                message: msg,
                kind: 'price_above',
              })
            }
          />
        )}

        {activeTab === 'bubble-radar' && radarCoin && (
          <BubbleRadarView
            coins={coins}
            selectedCoin={radarCoin}
            onSelectCoin={(c) => setRadarCoinId(c.id)}
            currency={currency}
            fxRates={fxRates}
            isPro={isPro}
            onOpenProModal={() => setProModalOpen(true)}
          />
        )}

        {/* Secondary Sponsored Placement (Free Tier or Custom Banner) */}
        <SponsoredBanner
          variant="liquidity"
          isPro={isPro}
          customAd={customAds.liquidity ?? null}
          onOpenAdvertise={() => {
            setAdvertiseSlot('liquidity');
            setAdvertiseMode('inquiry');
            setAdvertiseModalOpen(true);
          }}
          onCustomizeAd={(slot) => {
            setAdvertiseSlot(slot);
            setAdvertiseMode('customize');
            setAdvertiseModalOpen(true);
          }}
          onOpenProModal={() => setProModalOpen(true)}
        />

        {/* Historical Investment Simulator */}
        {simulatorCoin && (
          <InvestmentSimulator
            coins={coins}
            selectedCoin={simulatorCoin}
            onSelectCoin={(c) => setSimulatorCoinId(c.id)}
            currency={currency}
            fxRates={fxRates}
            isPro={isPro}
            onOpenProModal={() => setProModalOpen(true)}
          />
        )}
      </main>

      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 py-5 text-xs text-slate-500 dark:text-slate-400">
        <div className="w-full max-w-[1440px] mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <span>CryptoPulser.com · Real-Time Digital Asset Intelligence</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setProModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            >
              Pulser Pro
            </button>
            <button
              type="button"
              onClick={() => {
                setAdvertiseSlot('vault');
                setAdvertiseMode('customize');
                setAdvertiseModalOpen(true);
              }}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            >
              Advertise
            </button>
            <span>USD / PKR FX Synced</span>
          </div>
        </div>
      </footer>

      {/* Modals, Alerts & Drawers */}
      <CoinDetailModal
        coin={detailCoin}
        onClose={() => setDetailCoin(null)}
        currency={currency}
        fxRates={fxRates}
        isDark={isDark}
        isStarred={detailCoin ? watchlistIds.includes(detailCoin.id) : false}
        onToggleWatchlist={toggleWatchlist}
        onSimulateCoin={(c) => jumpToSimulator(c)}
        onInspectBubbleRadar={(c) => {
          setRadarCoinId(c.id);
          setActiveTab('bubble-radar');
        }}
        onOpenAlertForCoin={(c) => openAlertForCoin(c, 'price_above')}
        onOpenAntiFomoGuard={(c) => {
          setAntiFomoCoin(c);
          setAntiFomoOpen(true);
        }}
      />

      <AntiFomoGuardModal
        isOpen={antiFomoOpen}
        onClose={() => setAntiFomoOpen(false)}
        coins={coins}
        initialCoin={antiFomoCoin}
        currency={currency}
        fxRates={fxRates}
        onOpenCoinDetail={(c) => setDetailCoin(c)}
      />

      <ProPricingModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        currency={currency}
        fxRates={fxRates}
        activePlan={activePlan}
        onQuickUnlockPlan={handleQuickUnlockPlan}
        trialEndsAt={trialEndsAt}
        nowMs={nowMs}
        onStartCheckout={handleStartCheckout}
        onCancelTrial={handleCancelTrial}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        initialPlan={checkoutPlan}
        initialTrial={checkoutTrial}
        coins={coins}
        currency={currency}
        onChangeCurrency={setCurrency}
        fxRates={fxRates}
        onCheckoutSuccess={handleCheckoutSuccess}
      />

      <AdvertiseModal
        isOpen={advertiseModalOpen}
        onClose={() => setAdvertiseModalOpen(false)}
        currency={currency}
        fxRates={fxRates}
        initialSlot={advertiseSlot}
        initialMode={advertiseMode}
        customAds={customAds}
        onSaveCustomAd={(ad) => {
          setCustomAds((prev) => ({ ...prev, [ad.slot]: ad }));
          pushToast({
            title: 'Sponsored Banner Published',
            message: `"${ad.headline}" is now live on CryptoPulser.com.`,
            kind: 'price_above',
          });
        }}
        onResetCustomAd={(slot) => {
          setCustomAds((prev) => {
            const next = { ...prev };
            delete next[slot];
            return next;
          });
          pushToast({
            title: 'Ad Slot Reset',
            message: 'Restored default sponsored placement banner.',
            kind: 'price_below',
          });
        }}
      />

      <AlertCenterPopover
        isOpen={alertCenterOpen}
        onClose={() => setAlertCenterOpen(false)}
        coins={coins}
        initialCoin={alertTargetCoin}
        initialKind={alertTargetKind}
        currency={currency}
        fxRates={fxRates}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onRemoveAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onTestTrigger={handleTestTrigger}
      />

      <AlertToastStack
        toasts={toasts}
        onDismiss={dismissToast}
      />

      <AskPulserAIDrawer
        coins={coins}
        watchlistIds={watchlistIds}
        globalStats={globalStats}
        currency={currency}
        fxRates={fxRates}
        activeTab={activeTab}
        activePlan={activePlan}
        newsArticles={newsArticles}
        onOpenProMaxModal={() => setProModalOpen(true)}
      />

      <ProFilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        coins={coins}
        selectedNetwork={selectedNetwork}
        filters={proFilters}
        onApplyFilters={setProFilters}
        onResetFilters={() => setProFilters(EMPTY_PRO_FILTERS)}
      />

      <SharePageModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        activeContextLabel={
          activeTab === 'top1000'
            ? marketSubTab === 'coins'
              ? `Markets · ${selectedNetwork}`
              : marketSubTab === 'derivatives'
              ? 'Open Interest & Liquidations'
              : marketSubTab === 'liquidity-map'
              ? `Liquidity Map (${liquidityCoin?.symbol || 'BTC'})`
              : marketSubTab === 'yield'
              ? 'DeFi Staking & Lending Yield'
              : marketSubTab === 'technical-indicators'
              ? 'Technical Indicators Screener'
              : marketSubTab === 'dex-scan'
              ? 'On-Chain DEX Pair Scanner'
              : marketSubTab === 'whale-sonar'
              ? 'Pulser Whale Sonar™'
              : 'Spot ETF Tracker'
            : activeTab === 'crypto-bubbles'
            ? 'Crypto Bubbles Live Visualizer'
            : activeTab === 'gainers-losers'
            ? 'Top 25 Gainers & Losers'
            : activeTab === 'rwa'
            ? 'RWA Real-World Assets Hub'
            : activeTab === 'ipo-launchpad'
            ? 'Crypto IPOs & Launchpads'
            : activeTab
        }
        globalStats={globalStats}
        topCoins={filteredMarketCoins}
        currency={currency}
        fxRates={fxRates}
        onNotify={(title, message) => pushToast({ title, message, kind: 'price_above' })}
      />

      <AuthModal />

      <UserProfileDrawer
        coins={coins}
        currency={currency}
        onChangeCurrency={setCurrency}
        fxRates={fxRates}
        alerts={alerts}
        onOpenAlertCenter={() => openAlertForCoin(coins[0] || null, 'price_above')}
        onDeepXrayInWhaleSonar={(address) => {
          setWhaleSonarTargetAddress({ address, nonce: Date.now() });
          handleSelectNavTab('whale-sonar');
        }}
      />

      <SettingsModal
        currency={currency}
        onChangeCurrency={setCurrency}
        fxRates={fxRates}
        onNavigateLaunchScreen={(scr: LaunchScreenOption) => {
          if (scr === 'Pulser Square') handleSelectNavTab('pulser-square');
          else if (scr === 'Whale Sonar') handleSelectNavTab('whale-sonar');
          else if (scr === 'Simulator') jumpToSimulator();
          else handleSelectNavTab('top1000');
        }}
        onNotify={(title, message, kind = 'price_above') =>
          pushToast({ title, message, kind })
        }
      />

      <MyWalletDrawer
        isOpen={myWalletOpen}
        onClose={() => setMyWalletOpen(false)}
        coins={coins}
        currency={currency}
        onChangeCurrency={setCurrency}
        fxRates={fxRates}
        onDeepXrayInWhaleSonar={(address) => {
          setMyWalletOpen(false);
          setWhaleSonarTargetAddress({ address, nonce: Date.now() });
          handleSelectNavTab('whale-sonar');
        }}
      />

      <PrivacyLockOverlay />
    </div>
  );
};

export default function App() {
  const [toasts, setToasts] = useState<AlertToast[]>([]);
  const [demoPlan, setDemoPlan] = useState<PlanTier>(() => {
    const stored = readStorage<PlanTier | null>('cp_plan_tier', null);
    if (stored === 'free' || stored === 'pro' || stored === 'pro_max') return stored;
    return readStorage<boolean>('cp_pro', false) ? 'pro' : 'free';
  });
  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(() =>
    readStorage<number | null>('cp_trial_ends_at', null)
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    localStorage.setItem('cp_plan_tier', JSON.stringify(demoPlan));
  }, [demoPlan]);

  useEffect(() => {
    localStorage.setItem('cp_trial_ends_at', JSON.stringify(trialEndsAt));
  }, [trialEndsAt]);

  useEffect(() => {
    if (!trialEndsAt) return;
    setNowMs(Date.now());
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [trialEndsAt]);

  const isTrialActive = Boolean(trialEndsAt && trialEndsAt > nowMs);
  const trialDaysLeft =
    isTrialActive && trialEndsAt
      ? Math.max(1, Math.ceil((trialEndsAt - nowMs) / 86400000))
      : 0;
  const activePlan: PlanTier =
    demoPlan === 'pro_max'
      ? 'pro_max'
      : demoPlan === 'pro' || isTrialActive
      ? 'pro'
      : 'free';
  const isPro = activePlan === 'pro' || activePlan === 'pro_max';

  const pushToast = useCallback((toast: Omit<AlertToast, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [
      { ...toast, id, timestamp: new Date().toISOString() },
      ...prev.slice(0, 3),
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePrivacyNotify = useCallback(
    (title: string, message: string, kind: AlertKind = 'price_above') => {
      pushToast({ title, message, kind });
    },
    [pushToast]
  );

  return (
    <UserAccountProvider onNotify={handlePrivacyNotify}>
      <PrivacyProvider isPro={isPro} onNotify={handlePrivacyNotify}>
        <CryptoPulserApp
          toasts={toasts}
          pushToast={pushToast}
          dismissToast={dismissToast}
          setDemoPlan={setDemoPlan}
          trialEndsAt={trialEndsAt}
          setTrialEndsAt={setTrialEndsAt}
          nowMs={nowMs}
          setNowMs={setNowMs}
          isTrialActive={isTrialActive}
          trialDaysLeft={trialDaysLeft}
          activePlan={activePlan}
          isPro={isPro}
        />
      </PrivacyProvider>
    </UserAccountProvider>
  );
}
