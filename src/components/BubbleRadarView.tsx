import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Lock, Radar, Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { buildBubbleRadarGraph } from '../data/cryptoEngine';
import { BubbleClusterType, BubbleNode, Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatSupply } from '../utils/formatters';
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

  useEffect(() => {
    setWalletQuery('');
    setActiveWalletFilter('');
    setSelectedNodeId(null);
  }, [wipeVersion]);

  const graph = useMemo(
    () => buildBubbleRadarGraph(selectedCoin, activeWalletFilter),
    [selectedCoin, activeWalletFilter]
  );

  const visibleNodes = useMemo(() => {
    if (clusterFilter === 'All') return graph.nodes;
    return graph.nodes.filter((n) => n.cluster === clusterFilter);
  }, [graph.nodes, clusterFilter]);

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const selectedNode: BubbleNode | null =
    graph.nodes.find((n) => n.id === selectedNodeId) ?? graph.nodes[0] ?? null;

  const riskLabel =
    graph.centralizationScore >= 68
      ? 'High Concentration'
      : graph.centralizationScore >= 42
      ? 'Moderate Distribution'
      : 'Well Distributed';

  return (
    <div className="space-y-5 relative">
      {/* Control Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Radar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Pulser Bubble Radar™</span>
              <span aria-hidden="true">·</span>
              <span>On-Chain Holder Cluster & Supply Concentration Topology</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
              {selectedCoin.name} ({selectedCoin.symbol}) Holder Network
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {coins.slice(0, 60).map((c) => (
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
                  className={`pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44 sm:w-52 ${
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
          </div>
        </div>

        {/* Cluster Filter + Centralization Score Strip */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'Exchanges', 'Whales', 'Smart Money', 'Retail'] as const).map((cl) => (
              <button
                key={cl}
                type="button"
                onClick={() => setClusterFilter(cl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  clusterFilter === cl
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cl}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Centralization Risk: </span>
              <span className="font-mono tabular-nums font-bold text-amber-500">
                {graph.centralizationScore}/100 ({riskLabel})
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Top 10 Holders: </span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {graph.top10HolderPct}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Exchange Custody: </span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {graph.exchangeCustodyPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Network Canvas + Node Inspector */}
      <div className="relative">
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-5 ${
            !isPro ? 'blur-[5px] pointer-events-none select-none opacity-65' : ''
          }`}
        >
          {/* SVG Network Visualizer */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0A0F1A] relative overflow-hidden min-h-[480px] flex flex-col">
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Click any wallet cluster node to inspect supply share & counterparties</span>
              <div className="flex items-center gap-1">
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

            <div className="flex-1 relative overflow-hidden">
              <svg viewBox="0 0 860 520" className="w-full h-full min-h-[430px]">
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

                <g
                  transform={`translate(${430 * (1 - zoom)}, ${260 * (1 - zoom)}) scale(${zoom})`}
                >
                  {/* Interconnected Cluster Edges */}
                  {graph.edges.map((edge, i) => {
                    if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) return null;
                    const a = graph.nodes.find((n) => n.id === edge.from);
                    const b = graph.nodes.find((n) => n.id === edge.to);
                    if (!a || !b) return null;
                    const isHighlighted =
                      selectedNode?.id === a.id || selectedNode?.id === b.id;
                    return (
                      <line
                        key={`${edge.from}-${edge.to}-${i}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={isHighlighted ? '#34d399' : '#334155'}
                        strokeOpacity={isHighlighted ? 0.85 : 0.45}
                        strokeWidth={isHighlighted ? 2.2 : 1.2}
                        strokeDasharray={isHighlighted ? 'none' : '3 3'}
                      />
                    );
                  })}

                  {/* Cluster Nodes */}
                  {visibleNodes.map((node) => {
                    const colors = CLUSTER_COLORS[node.cluster];
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer"
                      >
                        {isSelected && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius + 7}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            strokeOpacity="0.8"
                          />
                        )}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.radius}
                          fill={colors.fill}
                          fillOpacity={isSelected ? 0.92 : 0.72}
                          stroke={colors.stroke}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          filter="url(#nodeGlow)"
                        />
                        <text
                          x={node.x}
                          y={node.y + 3}
                          textAnchor="middle"
                          className="fill-white font-mono text-[10px] font-bold pointer-events-none"
                        >
                          {node.supplyPct}%
                        </text>
                        <text
                          x={node.x}
                          y={node.y + node.radius + 13}
                          textAnchor="middle"
                          className="fill-slate-300 text-[10px] font-medium pointer-events-none"
                        >
                          {node.id === 'node-custom' && stealthMode
                            ? '••••••'
                            : node.label.split(' ').slice(0, 2).join(' ')}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          {/* Wallet Cluster Inspector Panel */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 flex flex-col justify-between space-y-4">
            {selectedNode ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Selected Cluster Node</span>
                    <span className={`font-semibold ${CLUSTER_COLORS[selectedNode.cluster].text}`}>
                      {selectedNode.cluster}
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

                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Supply Share</span>
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
                      <span className="text-slate-500 dark:text-slate-400">Holdings Value</span>
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
                      <span className="text-slate-500 dark:text-slate-400">First Active</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {selectedNode.firstSeen}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Connected Counterparties ({selectedNode.connections.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedNode.connections.slice(0, 3).map((cid) => {
                      const peer = graph.nodes.find((n) => n.id === cid);
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
              </>
            ) : null}
          </div>
        </div>

        {/* Pro Gate Overlay when Free Tier */}
        {!isPro && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0E1422]/95 p-6 text-center shadow-2xl space-y-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Unlock Pulser Bubble Radar™
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Inspect interactive holder clusters, trace custom 0x wallet connections, and view the Centralization Risk Score with Pulser Pro ($10/mo · 7-Day Free Trial) or instant Judge Demo Unlock.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenProModal}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>Unlock Pulser Pro / Judge Demo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
