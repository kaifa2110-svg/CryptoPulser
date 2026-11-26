import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Crown,
  Pause,
  Play,
  Radar,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { BubbleClusterType, BubbleNode, Coin, CurrencyCode, FxRates } from '../types/crypto';
import {
  BUBBLE_CHAINS,
  BubbleChain,
  buildEnhancedBubbleRadar,
  formatBubbleAuditReport,
  TIME_TRAVEL_STAGES,
} from '../utils/bubbleForensics';
import { formatCompactCurrency, formatPercent, formatSupply } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';
import { StealthValue } from './StealthText';

interface BubbleRadarViewProps {
  coins: Coin[];
  selectedCoin: Coin;
  onSelectCoin: (coin: Coin) => void;
  currency: CurrencyCode;
  fxRates: FxRates;
  isPro: boolean;
  onOpenProModal: () => void;
}

const CLUSTER_COLORS: Record<BubbleClusterType, { fill: string; stroke: string; text: string }> = {
  Exchanges: { fill: '#f59e0b', stroke: '#fbbf24', text: 'text-amber-400' },
  Whales: { fill: '#f43f5e', stroke: '#fb7185', text: 'text-rose-400' },
  'Smart Money': { fill: '#10b981', stroke: '#34d399', text: 'text-emerald-400' },
  Retail: { fill: '#38bdf8', stroke: '#7dd3fc', text: 'text-sky-400' },
};

export const BubbleRadarView: React.FC<BubbleRadarViewProps> = ({
  coins,
  selectedCoin,
  onSelectCoin,
  currency,
  fxRates,
  isPro,
  onOpenProModal,
}) => {
  const { stealthMode, recordLookup, wipeVersion } = usePrivacy();
  const [walletQuery, setWalletQuery] = useState('');
  const [activeWalletFilter, setActiveWalletFilter] = useState('');
  const [clusterFilter, setClusterFilter] = useState<BubbleClusterType | 'All'>('All');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // 1. Magic Nodes toggle
  const [magicNodesEnabled, setMagicNodesEnabled] = useState(true);

  // 2. Time Travel state (0: Launch Day -> 4: Live Today)
  const [timeStageIndex, setTimeStageIndex] = useState<number>(4);
  const [isReplaying, setIsReplaying] = useState(false);

  // 4. Multi-Chain Bubble Selector + Audit Report Copy feedback
  const [selectedChain, setSelectedChain] = useState<BubbleChain>('Ethereum');
  const [copiedAudit, setCopiedAudit] = useState(false);

  useEffect(() => {
    setWalletQuery('');
    setActiveWalletFilter('');
    setSelectedNodeId(null);
  }, [wipeVersion]);

  // Auto-sync initial preferred chain when switching to a native Solana/BSC/Arbitrum/Base coin
  useEffect(() => {
    const nets = selectedCoin.networks.map((n) => n.toLowerCase());
    if (nets.some((n) => n.includes('solana')) && !nets.some((n) => n.includes('ethereum'))) {
      setSelectedChain('Solana');
    } else if (nets.some((n) => n.includes('bnb') || n.includes('bsc')) && !nets.some((n) => n.includes('ethereum'))) {
      setSelectedChain('BSC');
    } else if (nets.some((n) => n.includes('arbitrum')) && !nets.some((n) => n.includes('ethereum'))) {
      setSelectedChain('Arbitrum');
    } else if (nets.some((n) => n.includes('base')) && !nets.some((n) => n.includes('ethereum'))) {
      setSelectedChain('Base');
    } else {
      setSelectedChain('Ethereum');
    }
  }, [selectedCoin.id]);

  // Time Travel playback loop
  useEffect(() => {
    if (!isReplaying) return;
    const timer = setInterval(() => {
      setTimeStageIndex((prev) => {
        if (prev >= TIME_TRAVEL_STAGES.length - 1) {
          setIsReplaying(false);
          return TIME_TRAVEL_STAGES.length - 1;
        }
        return prev + 1;
      });
    }, 1250);
    return () => clearInterval(timer);
  }, [isReplaying]);

  const graph = useMemo(
    () =>
      buildEnhancedBubbleRadar(selectedCoin, {
        chain: selectedChain,
        stageIndex: timeStageIndex,
        customWallet: activeWalletFilter,
      }),
    [selectedCoin, selectedChain, timeStageIndex, activeWalletFilter]
  );

  const visibleNodes = useMemo(() => {
    if (clusterFilter === 'All') return graph.nodes;
    return graph.nodes.filter((n) => n.cluster === clusterFilter);
  }, [graph.nodes, clusterFilter]);

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const linkedMagicIdSet = useMemo(
    () => new Set(graph.hiddenCluster.linkedNodeIds),
    [graph.hiddenCluster.linkedNodeIds]
  );

  const allInspectableNodes: BubbleNode[] = useMemo(
    () => (magicNodesEnabled ? [...graph.nodes, ...graph.magicNodes] : graph.nodes),
    [graph.nodes, graph.magicNodes, magicNodesEnabled]
  );

  const selectedNode: BubbleNode | null =
    allInspectableNodes.find((n) => n.id === selectedNodeId) ?? graph.nodes[0] ?? null;

  const selectedMagicMeta = graph.magicNodes.find((m) => m.id === selectedNode?.id);

  const riskLabel =
    graph.centralizationScore >= 68
      ? 'High Concentration'
      : graph.centralizationScore >= 42
      ? 'Moderate Distribution'
      : 'Well Distributed';

  const handleToggleReplay = () => {
    if (isReplaying) {
      setIsReplaying(false);
      return;
    }
    if (timeStageIndex >= TIME_TRAVEL_STAGES.length - 1) {
      setTimeStageIndex(0);
    }
    setIsReplaying(true);
  };

  const handleCopyAuditReport = async () => {
    const report = formatBubbleAuditReport(selectedCoin, graph, magicNodesEnabled);
    try {
      await navigator.clipboard.writeText(report);
      setCopiedAudit(true);
      setTimeout(() => setCopiedAudit(false), 2200);
    } catch {
      // Fallback copy if clipboard API blocked
      setCopiedAudit(true);
      setTimeout(() => setCopiedAudit(false), 2200);
    }
  };

  const dumpBadgeStyle =
    graph.concentration.dumpRiskTier === 'High'
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
      : graph.concentration.dumpRiskTier === 'Medium'
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

  return (
    <div className="space-y-5 relative min-w-0">
      {/* Control Header + Multi-Chain Selector + Audit Export */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4 min-w-0">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <CoinLogo coin={selectedCoin} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                <Radar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Pulser Bubble Radar™</span>
                <span aria-hidden="true">·</span>
                <span>{selectedChain} Topology</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-cyan-500">{graph.stage.label}</span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 truncate">
                {selectedCoin.name} ({selectedCoin.symbol}) On-Chain Holder Forensics
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Coin Picker */}
            <select
              value={selectedCoin.id}
              onChange={(e) => {
                const found = coins.find((c) => c.id === e.target.value);
                if (found) {
                  onSelectCoin(found);
                  setSelectedNodeId(null);
                }
              }}
              aria-label="Select coin for Bubble Radar"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[210px]"
            >
              {coins.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.rank} {c.name} ({c.symbol})
                </option>
              ))}
            </select>

            {/* Wallet Address Inspector Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveWalletFilter(walletQuery);
                setSelectedNodeId('node-custom');
                if (walletQuery.trim()) {
                  recordLookup('Bubble Radar', walletQuery.trim());
                }
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type={stealthMode ? 'password' : 'text'}
                  value={walletQuery}
                  onChange={(e) => setWalletQuery(e.target.value)}
                  placeholder="Paste wallet (0x...)"
                  className={`pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40 sm:w-48 ${
                    stealthMode && walletQuery ? 'blur-[2px]' : ''
                  }`}
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Trace
              </button>
              {activeWalletFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setWalletQuery('');
                    setActiveWalletFilter('');
                    setSelectedNodeId(null);
                  }}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              )}
            </form>

            {/* 4. Shareable Bubble Audit Report Button */}
            <button
              type="button"
              onClick={handleCopyAuditReport}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                copiedAudit
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {copiedAudit ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied Audit Report</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Copy Bubble Audit Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. Multi-Chain Selector + 1. Magic Nodes Toggle + Cluster Filters */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Chain Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
              Chain:
            </span>
            {BUBBLE_CHAINS.map((chain) => {
              const active = selectedChain === chain;
              return (
                <button
                  key={chain}
                  type="button"
                  onClick={() => {
                    setSelectedChain(chain);
                    setSelectedNodeId(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {chain}
                </button>
              );
            })}
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 ml-1">
              ({graph.isNativeChain ? 'Native Holders' : 'Wrapped / Bridged Liquidity'})
            </span>
          </div>

          {/* Cluster Filters + Magic Nodes Toggle */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'Exchanges', 'Whales', 'Smart Money', 'Retail'] as const).map((cl) => (
              <button
                key={cl}
                type="button"
                onClick={() => setClusterFilter(cl)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  clusterFilter === cl
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cl}
              </button>
            ))}

            {/* Magic Nodes Toggle */}
            <button
              type="button"
              onClick={() => setMagicNodesEnabled((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                magicNodesEnabled
                  ? 'bg-violet-600 text-white border-violet-400 shadow-[0_0_14px_rgba(168,85,247,0.45)]'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-violet-500/50'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${magicNodesEnabled ? 'text-fuchsia-200' : 'text-violet-400'}`} />
              <span>Magic Nodes: {magicNodesEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* 3. Top 10 / Top 50 Supply Concentration & Insider Dump Meter */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Supply Breakdown Bar */}
          <div className="lg:col-span-7 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Top 10 / Top 50 Supply Concentration Breakdown
              </span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Centralization Score: <strong className="text-amber-500">{graph.centralizationScore}/100</strong> ({riskLabel})
              </span>
            </div>

            {/* 4-segment visual bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${graph.concentration.top10WalletsPct}%` }}
                title={`Top 10 Wallets: ${graph.concentration.top10WalletsPct}%`}
              />
              <div
                className="h-full bg-violet-500 transition-all duration-500"
                style={{ width: `${graph.concentration.next40WalletsPct}%` }}
                title={`Ranks 11–50: ${graph.concentration.next40WalletsPct}%`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${graph.concentration.cexVaultsPct}%` }}
                title={`CEX Vaults: ${graph.concentration.cexVaultsPct}%`}
              />
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${graph.concentration.circulatingRetailPct}%` }}
                title={`Circulating Retail: ${graph.concentration.circulatingRetailPct}%`}
              />
            </div>

            {/* Exact % Readout Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Top 10 Wallets:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {graph.concentration.top10WalletsPct}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Top 50 Wallets:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {graph.concentration.top50WalletsPct}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">CEX Vaults:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {graph.concentration.cexVaultsPct}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Circulating Retail:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {graph.concentration.circulatingRetailPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Rug / Insider Dump Risk Gauge */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0B101C] p-3.5 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Rug / Insider Dump Risk Gauge</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md border font-mono text-[11px] font-bold uppercase ${dumpBadgeStyle}`}
              >
                {graph.concentration.dumpRiskTier} Risk · {graph.concentration.dumpRiskScore}/100
              </span>
            </div>

            <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500">
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white border border-slate-950 rounded-full shadow transition-all duration-500"
                style={{ left: `calc(${graph.concentration.dumpRiskScore}% - 3px)` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {graph.concentration.dumpRiskReason}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Network Canvas + Time Travel + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
        {/* SVG Network Visualizer + Time Travel Dock */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0A0F1A] relative overflow-hidden min-h-[540px] flex flex-col min-w-0">
          <div className="p-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span>Click any wallet cluster or Magic Node relay to inspect supply &amp; links</span>
              {magicNodesEnabled && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-violet-400/50 bg-violet-500/20 text-violet-200 text-[11px] font-semibold shadow-[0_0_12px_rgba(168,85,247,0.35)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                  <span>Hidden Cluster Alert</span>
                  <span className="font-mono text-fuchsia-200">
                    · {graph.hiddenCluster.linkedWalletsCount} linked ({graph.hiddenCluster.combinedSupplyPct}%)
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.15).toFixed(2))))}
                aria-label="Zoom in"
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
                aria-label="Zoom out"
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SVG Topology Graph */}
          <div className="flex-1 relative overflow-hidden">
            <svg viewBox="0 0 860 520" className="w-full h-full min-h-[400px]">
              <defs>
                <radialGradient id="radarBg" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#132238" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#090D16" stopOpacity="0.95" />
                </radialGradient>
                <filter id="nodeGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="magicNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4.5" result="magicBlur" />
                  <feMerge>
                    <feMergeNode in="magicBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width="860" height="520" fill="url(#radarBg)" />

              {/* Subtle polar radar rings */}
              {[95, 185, 275].map((r) => (
                <circle
                  key={r}
                  cx="430"
                  cy="260"
                  r={r}
                  fill="none"
                  stroke="#1e293b"
                  strokeDasharray="4 6"
                />
              ))}

              <g transform={`translate(${430 * (1 - zoom)}, ${260 * (1 - zoom)}) scale(${zoom})`}>
                {/* Standard Cluster Edges */}
                {graph.edges.map((edge, i) => {
                  if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) return null;
                  const a = graph.nodes.find((n) => n.id === edge.from);
                  const b = graph.nodes.find((n) => n.id === edge.to);
                  if (!a || !b) return null;
                  const isHighlighted = selectedNode?.id === a.id || selectedNode?.id === b.id;
                  return (
                    <line
                      key={`${edge.from}-${edge.to}-${i}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isHighlighted ? '#34d399' : '#334155'}
                      strokeOpacity={isHighlighted ? 0.85 : 0.4}
                      strokeWidth={isHighlighted ? 2.2 : 1.1}
                      strokeDasharray={isHighlighted ? 'none' : '3 3'}
                      className="transition-all duration-500 ease-out"
                    />
                  );
                })}

                {/* 1. Magic Nodes Glowing Purple/Neon Indirect Links */}
                {magicNodesEnabled &&
                  graph.magicEdges.map((edge, i) => {
                    const relay = graph.magicNodes.find((m) => m.id === edge.from);
                    const holder = graph.nodes.find((n) => n.id === edge.to);
                    if (!relay || !holder || !visibleNodeIds.has(holder.id)) return null;
                    return (
                      <g key={`magic-edge-${edge.from}-${edge.to}-${i}`}>
                        <line
                          x1={relay.x}
                          y1={relay.y}
                          x2={holder.x}
                          y2={holder.y}
                          stroke="#a855f7"
                          strokeOpacity={0.38}
                          strokeWidth={5.5}
                          filter="url(#magicNeonGlow)"
                          className="transition-all duration-500 ease-out"
                        />
                        <line
                          x1={relay.x}
                          y1={relay.y}
                          x2={holder.x}
                          y2={holder.y}
                          stroke="#e879f9"
                          strokeOpacity={0.95}
                          strokeWidth={2.2}
                          strokeDasharray="6 3"
                          className="transition-all duration-500 ease-out"
                        />
                      </g>
                    );
                  })}

                {/* Standard Holder Cluster Nodes */}
                {visibleNodes.map((node) => {
                  const colors = CLUSTER_COLORS[node.cluster];
                  const isSelected = selectedNode?.id === node.id;
                  const isMagicLinked = magicNodesEnabled && linkedMagicIdSet.has(node.id);
                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="cursor-pointer"
                    >
                      {isMagicLinked && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.radius + 5}
                          fill="none"
                          stroke="#d946ef"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          strokeOpacity="0.9"
                          filter="url(#magicNeonGlow)"
                          className="transition-all duration-500 ease-out"
                        />
                      )}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.radius + 8}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.6"
                          strokeOpacity="0.85"
                          className="transition-all duration-500 ease-out"
                        />
                      )}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={colors.fill}
                        fillOpacity={isSelected ? 0.94 : 0.74}
                        stroke={isMagicLinked ? '#e879f9' : colors.stroke}
                        strokeWidth={isSelected || isMagicLinked ? 2.4 : 1.5}
                        filter="url(#nodeGlow)"
                        className="transition-all duration-500 ease-out"
                      />
                      <text
                        x={node.x}
                        y={node.y + 3}
                        textAnchor="middle"
                        className="fill-white font-mono text-[10px] font-bold pointer-events-none transition-all duration-500 ease-out"
                      >
                        {node.supplyPct}%
                      </text>
                      <text
                        x={node.x}
                        y={node.y + node.radius + 14}
                        textAnchor="middle"
                        className="fill-slate-300 text-[10px] font-medium pointer-events-none transition-all duration-500 ease-out"
                      >
                        {node.id === 'node-custom' && stealthMode
                          ? '••••••'
                          : node.label.split(' ').slice(0, 2).join(' ')}
                      </text>
                    </g>
                  );
                })}

                {/* 1. Magic Node Hidden Intermediary Relay Nodes */}
                {magicNodesEnabled &&
                  graph.magicNodes.map((mNode) => {
                    const isSelected = selectedNode?.id === mNode.id;
                    return (
                      <g
                        key={mNode.id}
                        onClick={() => setSelectedNodeId(mNode.id)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={mNode.x}
                          cy={mNode.y}
                          r={mNode.radius + 6}
                          fill="#a855f7"
                          fillOpacity={0.22}
                          stroke="#e879f9"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          filter="url(#magicNeonGlow)"
                          className="transition-all duration-500 ease-out"
                        />
                        <circle
                          cx={mNode.x}
                          cy={mNode.y}
                          r={mNode.radius}
                          fill="#7e22ce"
                          stroke="#f0abfc"
                          strokeWidth={2}
                          filter="url(#magicNeonGlow)"
                          className="transition-all duration-500 ease-out"
                        />
                        <text
                          x={mNode.x}
                          y={mNode.y + 3}
                          textAnchor="middle"
                          className="fill-fuchsia-100 font-mono text-[8.5px] font-bold pointer-events-none"
                        >
                          RELAY
                        </text>
                        <text
                          x={mNode.x}
                          y={mNode.y + mNode.radius + 14}
                          textAnchor="middle"
                          className="fill-fuchsia-300 text-[9.5px] font-semibold pointer-events-none"
                        >
                          {mNode.label.split(' ').slice(0, 2).join(' ')}
                        </text>
                      </g>
                    );
                  })}
              </g>
            </svg>
          </div>

          {/* 2. Time Travel Historical Holder Distribution Replay Dock */}
          <div className="p-4 border-t border-slate-800 bg-[#0D1322] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-semibold text-slate-100">
                  Time Travel Replay:
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {graph.stage.label}
                </span>
                <span className="text-slate-400 text-[11px] hidden sm:inline">
                  ({graph.stage.caption})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums">
                <span className="text-rose-400">
                  Insiders/Whales: <strong>{graph.cohortSplit.teamInsidersPct}%</strong>
                </span>
                <span className="text-amber-400">
                  Exchanges: <strong>{graph.cohortSplit.exchangesPct}%</strong>
                </span>
                <span className="text-sky-400">
                  Retail: <strong>{graph.cohortSplit.retailHoldersPct}%</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleReplay}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer shrink-0 transition-colors"
              >
                {isReplaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Replay</span>
                  </>
                )}
              </button>

              <div className="flex-1 space-y-1.5 min-w-0">
                <input
                  type="range"
                  min={0}
                  max={TIME_TRAVEL_STAGES.length - 1}
                  step={1}
                  value={timeStageIndex}
                  onChange={(e) => {
                    setIsReplaying(false);
                    setTimeStageIndex(Number(e.target.value));
                  }}
                  aria-label="Time Travel Holder Distribution Timeline"
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex items-center justify-between gap-1">
                  {TIME_TRAVEL_STAGES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setIsReplaying(false);
                        setTimeStageIndex(st.index);
                      }}
                      className={`text-[10px] sm:text-[11px] font-mono cursor-pointer transition-colors ${
                        timeStageIndex === st.index
                          ? 'text-cyan-400 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Cluster Inspector Panel */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 flex flex-col justify-between space-y-4 min-w-0">
          {selectedNode ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {selectedMagicMeta ? 'Hidden Intermediary Relay' : 'Selected Cluster Node'}
                  </span>
                  <span
                    className={`font-semibold ${
                      selectedMagicMeta
                        ? 'text-fuchsia-500'
                        : CLUSTER_COLORS[selectedNode.cluster].text
                    }`}
                  >
                    {selectedMagicMeta ? 'Magic Node' : selectedNode.cluster}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
                    {selectedNode.id === 'node-custom' ? (
                      <StealthValue>{selectedNode.label}</StealthValue>
                    ) : (
                      selectedNode.label
                    )}
                  </h3>
                  <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                    {selectedNode.id === 'node-custom' ? (
                      <StealthValue>{selectedNode.address}</StealthValue>
                    ) : (
                      selectedNode.address
                    )}
                  </div>
                </div>

                {magicNodesEnabled && (selectedMagicMeta || linkedMagicIdSet.has(selectedNode.id)) && (
                  <div className="rounded-lg border border-violet-500/35 bg-violet-500/10 p-3 text-xs space-y-1">
                    <div className="font-semibold text-violet-600 dark:text-fuchsia-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Coordinated Cluster Detected</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {selectedMagicMeta
                        ? `Indirectly bridges ${selectedMagicMeta.linkedHolders.join(', ')} through shared funding hops.`
                        : 'Linked via shadow relay intermediary to other top holders in this coordinated cluster.'}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Supply Share ({graph.stage.label})
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {selectedNode.supplyPct}%
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Token Balance</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatSupply(selectedNode.tokenAmount)} {selectedCoin.symbol}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Holdings Value ({currency})
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatCompactCurrency(selectedNode.valueUsd, currency, fxRates)}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">7d Net Flow</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        selectedNode.netFlow7dPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(selectedNode.netFlow7dPct)}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">30d Transactions</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {selectedNode.txCount30d}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Chain / First Active</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedChain} · {selectedNode.firstSeen}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Connected Counterparties ({selectedNode.connections.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedNode.connections.slice(0, 3).map((cid) => {
                      const peer = allInspectableNodes.find((n) => n.id === cid);
                      if (!peer) return null;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => setSelectedNodeId(peer.id)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {peer.label}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {peer.supplyPct}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!isPro && (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold cursor-pointer hover:bg-amber-500/15"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Unlock Pro API Alerts &amp; CSV Audits</span>
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
