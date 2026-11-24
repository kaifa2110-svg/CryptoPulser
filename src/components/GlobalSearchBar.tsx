import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, FileCode2, Search, X } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';

interface GlobalSearchBarProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onSelectCoin: (coin: Coin) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  coins,
  currency,
  fxRates,
  onSelectCoin,
}) => {
  const { recordLookup, wipeVersion } = usePrivacy();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery('');
    setOpen(false);
  }, [wipeVersion]);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    window.addEventListener('keydown', handleKeyShortcut);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      window.removeEventListener('keydown', handleKeyShortcut);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return coins.slice(0, 8).map((coin) => ({ coin, matchedContract: null as string | null }));
    }

    const exactMatches: Array<{ coin: Coin; matchedContract: string | null }> = [];
    const partialMatches: Array<{ coin: Coin; matchedContract: string | null }> = [];

    for (const coin of coins) {
      const nameL = coin.name.toLowerCase();
      const symL = coin.symbol.toLowerCase();
      const contractHit = coin.contracts.find((ct) =>
        ct.address.toLowerCase().includes(q)
      );

      if (symL === q || nameL === q || String(coin.rank) === q) {
        exactMatches.push({
          coin,
          matchedContract: contractHit ? `${contractHit.network}: ${contractHit.address}` : null,
        });
      } else if (
        symL.includes(q) ||
        nameL.includes(q) ||
        Boolean(contractHit)
      ) {
        partialMatches.push({
          coin,
          matchedContract: contractHit ? `${contractHit.network}: ${contractHit.address}` : null,
        });
      }

      if (exactMatches.length + partialMatches.length >= 16) break;
    }

    return [...exactMatches, ...partialMatches].slice(0, 10);
  }, [coins, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleChoose = (coin: Coin) => {
    recordLookup('Markets', `${coin.symbol} (${coin.name})`);
    onSelectCoin(coin);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = results[activeIndex] ?? results[0];
      if (chosen) handleChoose(chosen.coin);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[240px] max-w-2xl">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search 1,000+ coins by name, ticker (BTC, SOL) or contract address (0x...)"
          aria-label="Global search across 1000+ cryptocurrencies by name, symbol, or contract address"
          className="w-full pl-10 pr-16 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-[#101624] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/80 focus:border-cyan-500 transition-shadow shadow-sm"
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded">
              /
            </kbd>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-[#0E1422] shadow-2xl overflow-hidden">
          <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {query.trim()
                ? `${results.length} matching asset${results.length === 1 ? '' : 's'} across 1,000+ markets`
                : 'Top Liquid Assets · Type name, symbol or contract (0x...)'}
            </span>
            <span className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
              Click or Enter to inspect chart
            </span>
          </div>

          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No asset or contract matched "{query}". Try a ticker like BTC, ETH, SOL or paste an 0x / Solana contract.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
              {results.map(({ coin, matchedContract }, idx) => {
                const pos = coin.change24h >= 0;
                const isSelected = idx === activeIndex;
                return (
                  <li key={coin.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleChoose(coin)}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-50/80 dark:bg-cyan-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/45'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                          #{coin.rank}
                        </span>
                        {coin.image ? (
                          <img
                            src={coin.image}
                            alt={coin.symbol}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full shrink-0 bg-slate-800"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full shrink-0 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-[10px] font-bold">
                            {coin.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {coin.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {coin.symbol}
                            </span>
                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                              {coin.category}
                            </span>
                          </div>
                          {matchedContract ? (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 truncate mt-0.5">
                              <FileCode2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">{matchedContract}</span>
                            </div>
                          ) : coin.contracts[0] ? (
                            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {coin.networks[0]} · {coin.contracts[0].address.slice(0, 10)}...{coin.contracts[0].address.slice(-6)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <div className="text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                            {formatPrice(coin.priceUsd, currency, fxRates)}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                            MCap {formatCompactCurrency(coin.marketCapUsd, currency, fxRates)}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-mono tabular-nums font-semibold w-16 text-right ${
                            pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatPercent(coin.change24h)}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
