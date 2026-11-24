import React, { useMemo, useState } from 'react';
import { ChevronDown, Globe2, Search } from 'lucide-react';
import { BLOCKCHAIN_NETWORKS, ChainNetwork } from '../data/cryptoEngine';
import { BlockchainNetwork, Coin } from '../types/crypto';

interface NetworkFilterBarProps {
  coins: Coin[];
  selectedNetwork: BlockchainNetwork;
  onSelectNetwork: (net: BlockchainNetwork) => void;
}

const NETWORK_SHORT_BADGES: Record<BlockchainNetwork, { code: string; dot: string }> = {
  'All Networks': { code: 'ALL', dot: 'bg-cyan-400' },
  Ethereum: { code: 'ETH', dot: 'bg-indigo-400' },
  'BNB Smart Chain (BSC)': { code: 'BSC', dot: 'bg-amber-400' },
  Solana: { code: 'SOL', dot: 'bg-emerald-400' },
  Arbitrum: { code: 'ARB', dot: 'bg-sky-400' },
  Base: { code: 'BASE', dot: 'bg-blue-500' },
  Polygon: { code: 'POL', dot: 'bg-violet-400' },
  Avalanche: { code: 'AVAX', dot: 'bg-rose-500' },
  Optimism: { code: 'OP', dot: 'bg-red-500' },
  Tron: { code: 'TRX', dot: 'bg-rose-400' },
  Sui: { code: 'SUI', dot: 'bg-cyan-400' },
  Aptos: { code: 'APT', dot: 'bg-teal-400' },
  TON: { code: 'TON', dot: 'bg-sky-500' },
  Cosmos: { code: 'ATOM', dot: 'bg-purple-400' },
  Polkadot: { code: 'DOT', dot: 'bg-pink-500' },
  Cardano: { code: 'ADA', dot: 'bg-blue-400' },
  Near: { code: 'NEAR', dot: 'bg-emerald-500' },
  Fantom: { code: 'FTM', dot: 'bg-blue-500' },
  Mantle: { code: 'MNT', dot: 'bg-slate-400' },
  zkSync: { code: 'ZK', dot: 'bg-indigo-500' },
  Linea: { code: 'LINEA', dot: 'bg-cyan-300' },
  Blast: { code: 'BLAST', dot: 'bg-yellow-400' },
  Cronos: { code: 'CRO', dot: 'bg-sky-600' },
};

const QUICK_NETWORKS: BlockchainNetwork[] = [
  'All Networks',
  'Ethereum',
  'Solana',
  'BNB Smart Chain (BSC)',
  'Arbitrum',
  'Base',
  'Polygon',
  'Avalanche',
  'Optimism',
  'Sui',
  'TON',
  'Tron',
];

export const NetworkFilterBar: React.FC<NetworkFilterBarProps> = ({
  coins,
  selectedNetwork,
  onSelectNetwork,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [netQuery, setNetQuery] = useState('');

  const networkCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Networks': coins.length };
    for (const c of coins) {
      for (const n of c.networks) {
        counts[n] = (counts[n] || 0) + 1;
      }
    }
    return counts;
  }, [coins]);

  const filteredDropdownNetworks = useMemo(() => {
    const q = netQuery.trim().toLowerCase();
    if (!q) return BLOCKCHAIN_NETWORKS;
    return BLOCKCHAIN_NETWORKS.filter(
      (n) =>
        n.toLowerCase().includes(q) ||
        NETWORK_SHORT_BADGES[n].code.toLowerCase().includes(q)
    );
  }, [netQuery]);

  const activeBadge = NETWORK_SHORT_BADGES[selectedNetwork];

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {/* Full 23-Chain Searchable Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            selectedNetwork !== 'All Networks'
              ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5 text-cyan-500" />
          <span className={`w-2 h-2 rounded-full ${activeBadge.dot}`} />
          <span>{selectedNetwork}</span>
          <span className="font-mono text-[10px] opacity-75">
            ({networkCounts[selectedNetwork] ?? 0})
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute left-0 top-full mt-1.5 z-40 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1422] shadow-2xl overflow-hidden">
              <div className="p-2.5 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={netQuery}
                    onChange={(e) => setNetQuery(e.target.value)}
                    placeholder="Find network (22+ chains)..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-1.5 grid grid-cols-1 gap-0.5">
                {filteredDropdownNetworks.map((net) => {
                  const meta = NETWORK_SHORT_BADGES[net];
                  const active = selectedNetwork === net;
                  return (
                    <button
                      key={net}
                      type="button"
                      onClick={() => {
                        onSelectNetwork(net);
                        setDropdownOpen(false);
                        setNetQuery('');
                      }}
                      className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                        <span className="truncate">{net}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {networkCounts[net as ChainNetwork | 'All Networks'] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Horizontal Quick-Select Ecosystem Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {QUICK_NETWORKS.map((net) => {
          const active = selectedNetwork === net;
          const meta = NETWORK_SHORT_BADGES[net];
          return (
            <button
              key={net}
              type="button"
              onClick={() => onSelectNetwork(net)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              <span>{net === 'BNB Smart Chain (BSC)' ? 'BSC' : net}</span>
            </button>
          );
        })}
        {selectedNetwork !== 'All Networks' && !QUICK_NETWORKS.includes(selectedNetwork) && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-500 text-slate-950 whitespace-nowrap shrink-0">
            {selectedNetwork}
          </span>
        )}
      </div>
    </div>
  );
};
