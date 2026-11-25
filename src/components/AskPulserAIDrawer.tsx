import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  Crown,
  Lock,
  Newspaper,
  PieChart,
  Radar,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useUserAccount } from '../context/UserAccountContext';
import { buildBubbleRadarGraph, buildFilteredWhaleSonar } from '../data/cryptoEngine';
import {
  AiChatMessage,
  AiCopilotMode,
  Coin,
  CurrencyCode,
  FxRates,
  GlobalMarketStats,
  NewsArticle,
  PlanTier,
} from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import {
  buildLiveMarketEngineReply,
  extractMentionedCoinsFromPrompt,
} from '../utils/liveMarketAiFallback';

interface AskPulserAIDrawerProps {
  coins: Coin[];
  watchlistIds: string[];
  globalStats: GlobalMarketStats;
  currency: CurrencyCode;
  fxRates: FxRates;
  activeTab: string;
  activePlan: PlanTier;
  newsArticles: NewsArticle[];
  onOpenProMaxModal: () => void;
}

const DAILY_BASIC_LIMIT = 5;

function getTodayQuotaKey(): string {
  return `cp_ai_quota_${new Date().toISOString().slice(0, 10)}`;
}

function readDailyUsage(): number {
  try {
    const raw = localStorage.getItem(getTodayQuotaKey());
    return raw ? Math.max(0, Number(raw) || 0) : 0;
  } catch {
    return 0;
  }
}

const COPILOT_MODES: Array<{
  id: AiCopilotMode;
  label: string;
  proMaxOnly: boolean;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  description: string;
}> = [
  {
    id: 'basic',
    label: 'Market Q&A',
    proMaxOnly: false,
    icon: Sparkles,
    prompt: 'Summarize today’s top movers and BTC dominance',
    description: 'General live market & multi-currency Q&A',
  },
  {
    id: 'trade_signal',
    label: 'Trade Signal',
    proMaxOnly: true,
    icon: Activity,
    prompt: 'Generate Trade Signal & Entry/Exit setups for BTC, ETH, and SOL with support/resistance and risk-reward.',
    description: 'Automated setups, support/resistance & risk-reward',
  },
  {
    id: 'whale_anomaly',
    label: 'Whale & Bubble',
    proMaxOnly: true,
    icon: Radar,
    prompt: 'Run an AI Whale & Bubble Anomaly scan on current exchange inflows, cold outflows, and wallet concentration.',
    description: 'Instant summary of whale inflows & centralization risk',
  },
  {
    id: 'portfolio_advisor',
    label: 'Portfolio Risk',
    proMaxOnly: true,
    icon: PieChart,
    prompt: 'Evaluate my watchlist allocation, assign a Portfolio Health Score (0-100), and suggest rebalance weights.',
    description: 'Watchlist health score & allocation suggestions',
  },
  {
    id: 'sentiment_digest',
    label: 'News Digest',
    proMaxOnly: true,
    icon: Newspaper,
    prompt: 'Deliver an executive AI Market Sentiment & News Digest combining Fear & Greed, Altcoin Index, and headlines.',
    description: 'Executive summary of live market pulse & news',
  },
];

const STARTER_PROMPTS = [
  'Summarize today’s top movers and BTC dominance',
  'What is Arcium (ARX) and how does it work?',
  'Analyze my watchlist coins and risk profile',
  'Compare ETH vs SOL in selected currency and USD',
];

const WELCOME_MESSAGE: AiChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Ask Crypto Pulser AI is connected to your live market feed. Ask about any coin (even emerging tokens), compare assets, or explore setups—Free & Pro include 5 basic queries/day; Pulser Pro Max unlocks Unlimited queries and all 4 AI Copilot suites.',
  timestamp: new Date().toISOString(),
};

const AI_HISTORY_KEY = 'cp_ai_history';

function readStoredAiHistory(): AiChatMessage[] {
  try {
    const raw = localStorage.getItem(AI_HISTORY_KEY);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(raw) as AiChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
}

export const AskPulserAIDrawer: React.FC<AskPulserAIDrawerProps> = ({
  coins,
  watchlistIds,
  globalStats,
  currency,
  fxRates,
  activeTab,
  activePlan,
  newsArticles,
  onOpenProMaxModal,
}) => {
  const { incognitoMode, wipeVersion } = usePrivacy();
  const { showAiFloatie } = useUserAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copilotMode, setCopilotMode] = useState<AiCopilotMode>('basic');
  const [dailyUsed, setDailyUsed] = useState<number>(() => readDailyUsage());
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>(() => readStoredAiHistory());

  const scrollRef = useRef<HTMLDivElement>(null);
  const isProMax = activePlan === 'pro_max';
  const remainingBasic = Math.max(0, DAILY_BASIC_LIMIT - dailyUsed);
  const quotaReached = !isProMax && remainingBasic <= 0;

  useEffect(() => {
    if (wipeVersion === 0) return;
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    setInput('');
  }, [wipeVersion]);

  useEffect(() => {
    if (incognitoMode) return;
    try {
      localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(messages.slice(-24)));
    } catch {
      // Ignore storage quota errors
    }
  }, [messages, incognitoMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    if (!isProMax && copilotMode !== 'basic') {
      setCopilotMode('basic');
    }
  }, [isProMax, copilotMode]);

  const activeModeMeta = useMemo(
    () => COPILOT_MODES.find((m) => m.id === copilotMode) || COPILOT_MODES[0],
    [copilotMode]
  );

  const buildLiveContext = (queryText: string, targetMode: AiCopilotMode) => {
    const serializeCoin = (c: Coin) => ({
      rank: c.rank,
      symbol: c.symbol,
      name: c.name,
      category: c.category,
      priceFormatted: formatPrice(c.priceUsd, currency, fxRates),
      priceUsd: Number(c.priceUsd.toFixed(6)),
      low24hUsd: Number(c.low24hUsd.toFixed(6)),
      high24hUsd: Number(c.high24hUsd.toFixed(6)),
      low24hFormatted: formatPrice(c.low24hUsd, currency, fxRates),
      high24hFormatted: formatPrice(c.high24hUsd, currency, fxRates),
      change1h: formatPercent(c.change1h),
      change24h: formatPercent(c.change24h),
      change24hNum: Number(c.change24h.toFixed(2)),
      change7d: formatPercent(c.change7d),
      change7dNum: Number(c.change7d.toFixed(2)),
      marketCap: formatCompactCurrency(c.marketCapUsd, currency, fxRates),
      marketCapUsd: Math.round(c.marketCapUsd),
      volume24h: formatCompactCurrency(c.volume24hUsd, currency, fxRates),
      volume24hUsd: Math.round(c.volume24hUsd),
      fundingRatePct: Number((c.fundingRatePct ?? 0).toFixed(4)),
    });

    const top50 = coins.slice(0, 50).map(serializeCoin);
    const matchedCoinsRaw = extractMentionedCoinsFromPrompt(queryText, coins, 6);
    const matchedQueryCoins = matchedCoinsRaw.map(serializeCoin);

    const nonStables = coins.slice(0, 100).filter((c) => c.category !== 'Stablecoin');
    const topGainers = [...nonStables]
      .sort((a, b) => b.change24h - a.change24h)
      .slice(0, 5)
      .map(serializeCoin);
    const topLosers = [...nonStables]
      .sort((a, b) => a.change24h - b.change24h)
      .slice(0, 5)
      .map(serializeCoin);

    const watched = coins
      .filter((c) => watchlistIds.includes(c.id))
      .map(serializeCoin);

    const focusCoin = matchedCoinsRaw[0] || coins[0];
    const whaleTelemetry =
      coins.length > 0
        ? buildFilteredWhaleSonar(coins, matchedCoinsRaw.length > 0 ? focusCoin.symbol : '', 14)
        : null;
    const leadBubble = focusCoin ? buildBubbleRadarGraph(focusCoin) : null;

    return {
      userPrompt: queryText,
      copilotMode: targetMode,
      selectedCurrency: currency,
      fxRates,
      activeTab,
      activePlan,
      globalMarket: {
        totalMarketCap: formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates),
        totalMarketCapUsd: Math.round(globalStats.totalMarketCapUsd),
        volume24h: formatCompactCurrency(globalStats.totalVolume24hUsd, currency, fxRates),
        marketCapChange24h: formatPercent(globalStats.marketCapChange24h),
        btcDominance: `${globalStats.btcDominance.toFixed(2)}%`,
        ethDominance: `${globalStats.ethDominance.toFixed(2)}%`,
        altcoinSeasonIndex: `${globalStats.altcoinSeasonIndex}/100`,
        fearGreed: `${globalStats.fearGreedValue} (${globalStats.fearGreedLabel})`,
      },
      top50Coins: top50,
      matchedQueryCoins,
      topGainers,
      topLosers,
      userWatchlist: watched,
      whaleSonarSummary: whaleTelemetry
        ? {
            scopedSymbol: matchedCoinsRaw.length > 0 ? focusCoin.symbol : 'ALL',
            totalVolumeUsd: whaleTelemetry.summary.totalVolumeUsd,
            netBiasLabel: whaleTelemetry.summary.netBiasLabel,
            inflowUsd: whaleTelemetry.summary.inflowUsd,
            outflowUsd: whaleTelemetry.summary.outflowUsd,
            recentSignals: whaleTelemetry.signals.slice(0, 6).map((s) => ({
              symbol: s.symbol,
              type: s.signalType,
              amountUsd: Math.round(s.amountUsd),
              walletTag: s.walletTag,
            })),
          }
        : undefined,
      bubbleConcentrationSnapshot: leadBubble
        ? {
            coin: leadBubble.coinSymbol,
            centralizationScore: leadBubble.centralizationScore,
            top10HolderPct: leadBubble.top10HolderPct,
            exchangeCustodyPct: leadBubble.exchangeCustodyPct,
            smartMoneyFlow: leadBubble.smartMoneyFlowLabel,
          }
        : undefined,
      latestNews: newsArticles.slice(0, 8).map((n) => ({
        title: n.title,
        summary: n.summary,
        category: n.category,
        source: n.source,
      })),
    };
  };

  const buildPollinationsSystemPrompt = (
    targetMode: AiCopilotMode,
    ctx: ReturnType<typeof buildLiveContext>
  ): string => {
    const modeNoteMap: Record<AiCopilotMode, string> = {
      basic: 'Conversational Market & Crypto Research Q&A. Answer naturally and helpfully.',
      trade_signal:
        'AI Trade Signal & Entry/Exit Copilot. Provide structured technical setups grounded in live prices and 24h Low/High ranges (Entry Band, Support, Resistance, Stop-Loss, TP1/TP2, Risk-Reward Ratio).',
      whale_anomaly:
        'AI Whale & Bubble Anomaly Detector. Analyze exchange inflows vs cold storage outflows, smart money flows, and holder centralization risk.',
      portfolio_advisor:
        'AI Portfolio Risk & Rebalance Advisor. Evaluate watchlist allocation, score Portfolio Health (0-100), and suggest balanced weights.',
      sentiment_digest:
        'AI Market Sentiment & News Digest. Synthesize Fear & Greed, Altcoin Season Index, BTC/ETH dominance, and top headlines.',
    };

    const topTickerLine = ctx.top50Coins
      .slice(0, 20)
      .map((c) => `${c.symbol}: ${c.priceFormatted} (${c.change24h} 24h)`)
      .join(' | ');

    const matchedLine =
      ctx.matchedQueryCoins.length > 0
        ? ctx.matchedQueryCoins
            .map(
              (c) =>
                `${c.name} (${c.symbol}, #${c.rank}): ${c.priceFormatted} | 24h ${c.change24h} | 7d ${c.change7d} | Low ${c.low24hFormatted} / High ${c.high24hFormatted} | MCap ${c.marketCap} | Vol ${c.volume24h}`
            )
            .join('\n')
        : 'None specifically matched in Top 1000.';

    return [
      `You are Crypto Pulser AI, an expert multi-turn conversational cryptocurrency analyst and researcher inside CryptoPulser.com.`,
      `Active Copilot Mode: ${modeNoteMap[targetMode]}`,
      `User Selected Currency: ${currency} (format prices in ${currency} and mention USD equivalents when helpful).`,
      `Global Snapshot: MCap ${ctx.globalMarket.totalMarketCap} (${ctx.globalMarket.marketCapChange24h} 24h), Vol ${ctx.globalMarket.volume24h}, BTC Dom ${ctx.globalMarket.btcDominance}, ETH Dom ${ctx.globalMarket.ethDominance}, Fear & Greed ${ctx.globalMarket.fearGreed}, Altcoin Season ${ctx.globalMarket.altcoinSeasonIndex}.`,
      `Top 20 Live Prices: ${topTickerLine}`,
      `Matched Query Coins:\n${matchedLine}`,
      ctx.userWatchlist.length > 0
        ? `User Watchlist: ${ctx.userWatchlist.map((c) => `${c.symbol} (${c.priceFormatted}, ${c.change24h})`).join(', ')}`
        : '',
      ctx.whaleSonarSummary
        ? `Whale Sonar (${ctx.whaleSonarSummary.scopedSymbol}): Bias ${ctx.whaleSonarSummary.netBiasLabel}, Total $${Math.round(ctx.whaleSonarSummary.totalVolumeUsd / 1e6)}M`
        : '',
      ctx.latestNews.length > 0
        ? `Latest Headlines: ${ctx.latestNews.slice(0, 4).map((n) => `${n.title} (${n.source})`).join(' | ')}`
        : '',
      `Instructions: Respond in clear, natural conversational prose (like ChatGPT). Remember full conversation history for follow-up questions. You can research ANY coin or protocol (including emerging tokens like Arcium ARX, Monad, Hyperliquid, Berachain, DeFi, or trading strategies) even if not in the Top 50 feed. Never invent fake live spot prices, never output raw JSON, and avoid promising guaranteed financial returns.`,
    ]
      .filter(Boolean)
      .join('\n\n');
  };

  const sendMessage = async (textOverride?: string, modeOverride?: AiCopilotMode) => {
    const text = (textOverride ?? input).trim();
    const targetMode = modeOverride ?? copilotMode;
    if (!text || isSending) return;

    if (!isProMax && targetMode !== 'basic') {
      onOpenProMaxModal();
      return;
    }

    if (!isProMax && remainingBasic <= 0) {
      return;
    }

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    const conversationHistory = nextMessages
      .filter((m) => m.id !== 'welcome')
      .slice(-24)
      .map((m) => ({ role: m.role, content: m.content }));

    const incrementUsageIfNeeded = () => {
      if (!isProMax) {
        const nextUsed = dailyUsed + 1;
        setDailyUsed(nextUsed);
        try {
          localStorage.setItem(getTodayQuotaKey(), String(nextUsed));
        } catch {
          // Ignore storage quota errors
        }
      }
    };

    const triggerConversationalFallback = () => {
      const priorHistory = conversationHistory.slice(0, -1);
      const fallbackReply = buildLiveMarketEngineReply({
        prompt: text,
        copilotMode: targetMode,
        coins,
        watchlistIds,
        globalStats,
        currency,
        fxRates,
        newsArticles,
        history: priorHistory,
      });

      incrementUsageIfNeeded();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: fallbackReply,
          timestamp: new Date().toISOString(),
          engine: 'live-market-engine',
          modelUsed: 'pulser-conversational-analyst',
        },
      ]);
      setIsSending(false);
    };

    const isBrowserOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;

    if (isBrowserOffline) {
      triggerConversationalFallback();
      return;
    }

    const liveContext = buildLiveContext(text, targetMode);
    const systemPrompt = buildPollinationsSystemPrompt(targetMode, liveContext);

    // 1. Primary Zero-Key Live AI via Pollinations Text API (CORS-enabled POST endpoint)
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
            ],
            model: 'openai',
            seed: 42,
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const replyText = (await res.text()).trim();
          if (replyText && !/^<!doctype|^<html/i.test(replyText)) {
            incrementUsageIfNeeded();
            setMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: replyText,
                timestamp: new Date().toISOString(),
                engine: 'gemini',
                modelUsed: 'pollinations-openai',
              },
            ]);
            setIsSending(false);
            return;
          }
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch {
      // Fall through silently to backend proxy & built-in engine
    }

    // 2. Secondary Server Route (/api/ai/chat)
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPrompt: text,
            messages: conversationHistory,
            marketContext: liveContext,
            copilotMode: targetMode,
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            reply?: string;
            engine?: 'gemini' | 'live-market-engine';
            modelUsed?: string;
          };
          const replyText = data?.reply?.trim() || '';
          if (replyText) {
            incrementUsageIfNeeded();
            setMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: replyText,
                timestamp: new Date().toISOString(),
                engine: data.engine || 'gemini',
                modelUsed: data.modelUsed || 'live-ai',
              },
            ]);
            setIsSending(false);
            return;
          }
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch {
      // Fall through silently to built-in conversational analyst engine
    }

    // 3. Instant Zero-Error Built-In Conversational Crypto Analyst Engine
    triggerConversationalFallback();
  };

  const handleResetChat = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    setInput('');
  };

  const handleSelectMode = (mode: typeof COPILOT_MODES[number]) => {
    if (mode.proMaxOnly && !isProMax) {
      onOpenProMaxModal();
      return;
    }
    setCopilotMode(mode.id);
    if (mode.proMaxOnly) {
      sendMessage(mode.prompt, mode.id);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && showAiFloatie && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xl hover:opacity-95 transition-transform active:scale-95 text-xs font-bold cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask Crypto Pulser AI</span>
          {!isProMax && (
            <span className="font-mono text-[10px] opacity-80 tabular-nums">
              ({remainingBasic}/{DAILY_BASIC_LIMIT})
            </span>
          )}
        </button>
      )}

      {/* Slide-Over Assistant Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[440px] h-[610px] max-h-[86vh] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1422] shadow-2xl flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#121A2B]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                    Ask Crypto Pulser AI
                  </h3>
                  <span
                    className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      isProMax
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isProMax ? 'PRO MAX · UNLIMITED' : `${remainingBasic}/${DAILY_BASIC_LIMIT} TODAY`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {incognitoMode
                    ? 'Incognito Zero-Trace Active · History not saved'
                    : `${activeModeMeta.description} (${currency})`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  aria-label="New conversation"
                  title="New conversation"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Drawer"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Advanced AI Copilots + Basic Selector */}
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B101C]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pulser AI Copilots
              </span>
              {!isProMax && (
                <button
                  type="button"
                  onClick={onOpenProMaxModal}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Crown className="w-3 h-3" />
                  <span>Unlock All 4 ($25/mo Max)</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COPILOT_MODES.map((m) => {
                const Icon = m.icon;
                const locked = m.proMaxOnly && !isProMax;
                const active = copilotMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMode(m)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-semibold'
                        : locked
                        ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {locked ? <Lock className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap transition-all ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-medium'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {msg.role === 'assistant' && msg.engine === 'live-market-engine' && (
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Live Market Engine</span>
                      </span>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3.5 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                  Analyzing live market data...
                </div>
              </div>
            )}

            {quotaReached && (
              <div className="rounded-xl p-3 border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Daily 5 Basic AI Queries Used
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Upgrade to Pulser Pro Max ($25/mo) for Unlimited queries plus Trade Signal Copilot,
                  Whale &amp; Bubble Detector, Portfolio Risk Advisor, and Market Sentiment Digest.
                </p>
                <button
                  type="button"
                  onClick={onOpenProMaxModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upgrade to Pro Max ($25/mo)</span>
                </button>
              </div>
            )}

            {messages.length <= 1 && !quotaReached && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] text-slate-400">Suggested questions:</div>
                {STARTER_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-[#121A2B]"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={quotaReached}
              placeholder={
                quotaReached
                  ? 'Daily limit reached — Upgrade to Pro Max...'
                  : `Ask ${activeModeMeta.label} about any coin (${currency})...`
              }
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim() || quotaReached}
              aria-label="Send message"
              className="p-2 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
