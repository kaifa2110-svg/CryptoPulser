import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  Share2,
  X,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates, GlobalMarketStats } from '../types/crypto';
import {
  downloadCsvFile,
  formatCompactCurrency,
  formatPercent,
  formatPrice,
} from '../utils/formatters';

interface SharePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeContextLabel: string;
  globalStats: GlobalMarketStats;
  topCoins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  onNotify?: (title: string, message: string) => void;
}

function buildQrGrid(seedStr: string, size = 21): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (ox: number, oy: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[oy + r][ox + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      if (r === 6 || c === 6) {
        grid[r][c] = (r + c) % 2 === 0;
        continue;
      }
      const v = Math.abs(Math.imul(hash ^ (r * 31 + c * 17), 2654435761));
      grid[r][c] = (v & 3) < 2;
    }
  }

  return grid;
}

export const SharePageModal: React.FC<SharePageModalProps> = ({
  isOpen,
  onClose,
  activeContextLabel,
  globalStats,
  topCoins,
  currency,
  fxRates,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://cryptopulser.com';
    return window.location.href;
  }, [isOpen]);

  const qrGrid = useMemo(() => buildQrGrid(shareUrl + activeContextLabel, 21), [shareUrl, activeContextLabel]);

  if (!isOpen) return null;

  const btc = topCoins.find((c) => c.symbol === 'BTC');
  const eth = topCoins.find((c) => c.symbol === 'ETH');

  const shareHeadline = `CryptoPulser Live Markets (${activeContextLabel}) — Total Cap ${formatCompactCurrency(
    globalStats.totalMarketCapUsd,
    currency,
    fxRates
  )} (${formatPercent(globalStats.marketCapChange24h)})${
    btc ? ` | BTC ${formatPrice(btc.priceUsd, currency, fxRates)}` : ''
  }`;

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareHeadline);

  const socialChannels = [
    {
      name: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      badgeClass: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
      short: 'X',
    },
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareHeadline} ${shareUrl}`)}`,
      badgeClass: 'bg-emerald-600 text-white',
      short: 'WA',
    },
    {
      name: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      badgeClass: 'bg-sky-500 text-white',
      short: 'TG',
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      badgeClass: 'bg-blue-600 text-white',
      short: 'FB',
    },
    {
      name: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
      badgeClass: 'bg-orange-600 text-white',
      short: 'RD',
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onNotify?.('Link Copied', 'CryptoPulser Markets link copied to clipboard.');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleSaveSnapshotPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 1200, 675);
    grad.addColorStop(0, '#090D16');
    grad.addColorStop(1, '#101A2F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 675);

    // Subtle border & glow
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 1152, 627);

    // Header
    ctx.fillStyle = '#22D3EE';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.fillText('CryptoPulser.com · Pro Market Snapshot', 56, 86);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '18px monospace';
    ctx.fillText(`${activeContextLabel} · ${new Date().toLocaleString()}`, 56, 122);

    // Global metrics cards
    const metrics = [
      {
        label: 'TOTAL MARKET CAP',
        value: formatCompactCurrency(globalStats.totalMarketCapUsd, currency, fxRates),
        sub: formatPercent(globalStats.marketCapChange24h),
      },
      {
        label: '24H SPOT VOLUME',
        value: formatCompactCurrency(globalStats.totalVolume24hUsd, currency, fxRates),
        sub: `BTC Dom ${globalStats.btcDominance.toFixed(1)}%`,
      },
      {
        label: 'BITCOIN (BTC)',
        value: btc ? formatPrice(btc.priceUsd, currency, fxRates) : '—',
        sub: btc ? formatPercent(btc.change24h) : '',
      },
      {
        label: 'ETHEREUM (ETH)',
        value: eth ? formatPrice(eth.priceUsd, currency, fxRates) : '—',
        sub: eth ? formatPercent(eth.change24h) : '',
      },
    ];

    metrics.forEach((m, i) => {
      const x = 56 + i * 276;
      const y = 160;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(x, y, 256, 128);
      ctx.strokeStyle = '#1E293B';
      ctx.strokeRect(x, y, 256, 128);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(m.label, x + 18, y + 34);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(m.value, x + 18, y + 76);

      ctx.fillStyle = m.sub.startsWith('-') ? '#FB7185' : '#34D399';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(m.sub, x + 18, y + 108);
    });

    // Top 6 rows
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.fillText('Top Market Leaders', 56, 336);

    topCoins.slice(0, 6).forEach((c, idx) => {
      const rowY = 362 + idx * 44;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(15, 23, 42, 0.8)' : 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(56, rowY, 1088, 38);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '15px monospace';
      ctx.fillText(`#${c.rank}`, 74, rowY + 24);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText(`${c.name} (${c.symbol})`, 140, rowY + 24);

      ctx.font = 'bold 15px monospace';
      ctx.fillText(formatPrice(c.priceUsd, currency, fxRates), 540, rowY + 24);

      ctx.fillStyle = c.change24h >= 0 ? '#34D399' : '#FB7185';
      ctx.fillText(formatPercent(c.change24h), 760, rowY + 24);

      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(formatCompactCurrency(c.marketCapUsd, currency, fxRates), 940, rowY + 24);
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cryptopulser-snapshot-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify?.('Snapshot Saved', 'Downloaded CryptoPulser visual PNG snapshot.');
    }, 'image/png');
  };

  const handleExportCsvSnapshot = () => {
    const header = [
      'Rank',
      'Name',
      'Symbol',
      'Category',
      `Price (${currency})`,
      '24h %',
      `Market Cap (${currency})`,
      `24h Volume (${currency})`,
      `Open Interest (${currency})`,
      'Funding Rate %',
      `24h Liquidations (${currency})`,
    ];
    const rows = topCoins.slice(0, 100).map((c) => [
      String(c.rank),
      c.name,
      c.symbol,
      c.category,
      formatPrice(c.priceUsd, currency, fxRates),
      formatPercent(c.change24h),
      formatCompactCurrency(c.marketCapUsd, currency, fxRates),
      formatCompactCurrency(c.volume24hUsd, currency, fxRates),
      formatCompactCurrency(c.openInterestUsd, currency, fxRates),
      `${c.fundingRatePct.toFixed(4)}%`,
      formatCompactCurrency(c.totalLiq24hUsd, currency, fxRates),
    ]);
    downloadCsvFile(`cryptopulser-markets-snapshot-${new Date().toISOString().slice(0, 10)}.csv`, [
      header,
      ...rows,
    ]);
    onNotify?.('CSV Exported', 'Exported Top 100 filtered market snapshot as CSV.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Share & Export Markets
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                View: {activeContextLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Copy Link + QR Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11182A]/70 p-4">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shrink-0 shadow-sm">
              <svg width="105" height="105" viewBox="0 0 21 21" shapeRendering="crispEdges">
                <rect width="21" height="21" fill="#ffffff" />
                {qrGrid.map((row, r) =>
                  row.map((cell, c) =>
                    cell ? (
                      <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#090D16" />
                    ) : null
                  )
                )}
              </svg>
              <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-mono text-slate-500">
                <QrCode className="w-2.5 h-2.5" />
                <span>Scan on Mobile</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2.5">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                One-Click Page Link
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  aria-label="Share URL"
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    copied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 hover:opacity-90'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {shareHeadline}
              </p>
            </div>
          </div>

          {/* Direct Social Share Buttons */}
          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
              Share directly to community
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {socialChannels.map((ch) => (
                <a
                  key={ch.name}
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700/90 bg-slate-50 dark:bg-slate-900 hover:border-cyan-500/60 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <span
                    className={`w-5 h-5 rounded-md text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${ch.badgeClass}`}
                  >
                    {ch.short}
                  </span>
                  <span className="truncate">{ch.name.split(' ')[0]}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* Save / Export Snapshot */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleSaveSnapshotPng}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Save Visual Snapshot (PNG)</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsvSnapshot}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Market CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
