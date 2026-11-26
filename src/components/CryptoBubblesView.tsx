import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { Coin, CurrencyCode, FxRates } from '../types/crypto';
import { getCmcLogoUrl } from '../utils/coinLogos';
import { formatCompactCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { CoinLogo } from './CoinLogo';

interface CryptoBubblesViewProps {
  coins: Coin[];
  watchlistIds: string[];
  currency: CurrencyCode;
  fxRates: FxRates;
  isDark: boolean;
  onSelectCoin: (coin: Coin) => void;
}

type RankRangeOption = 'top100' | 'top200' | 'top300' | 'watchlist';
type BubblePeriod =
  | '1 Min'
  | '5 Min'
  | '15 Min'
  | 'Hour'
  | '4 Hours'
  | 'Day'
  | 'Week'
  | 'Month'
  | '3 Months'
  | 'Year';
type BubbleSizeBy = 'performance' | 'marketCap' | 'volume' | 'rank';
type BubbleContentBy =
  | 'performance'
  | 'price'
  | 'marketCap'
  | 'volume'
  | 'rank'
  | 'name'
  | 'dominance';
type BubbleColorBy = 'performance' | 'rankGradient' | 'neutral';

interface PhysicsBubble {
  id: string;
  coin: Coin;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  perfPct: number;
  normRank: number;
  contentLabel: string;
  logoUrl: string | null;
}

const RANK_RANGES: Array<{ id: RankRangeOption; label: string }> = [
  { id: 'top100', label: 'Top 1–100' },
  { id: 'top200', label: '101–200' },
  { id: 'top300', label: '201–300' },
  { id: 'watchlist', label: 'Watchlist' },
];

const QUICK_TIMEFRAME_PILLS: Array<{
  id: string;
  label: string;
  period?: BubblePeriod;
  sizeBy?: BubbleSizeBy;
  contentBy?: BubbleContentBy;
}> = [
  { id: '1H', label: '1H', period: 'Hour' },
  { id: '1D', label: '1D', period: 'Day' },
  { id: '1W', label: '1W', period: 'Week' },
  { id: '1M', label: '1M', period: 'Month' },
  { id: '1Y', label: '1Y', period: 'Year' },
  { id: 'MCAP', label: 'Market Cap', sizeBy: 'marketCap', contentBy: 'marketCap' },
];

const PERIOD_OPTIONS: BubblePeriod[] = [
  '1 Min',
  '5 Min',
  '15 Min',
  'Hour',
  '4 Hours',
  'Day',
  'Week',
  'Month',
  '3 Months',
  'Year',
];

function getPeriodChangePct(coin: Coin, period: BubblePeriod): number {
  const h1 = Number.isFinite(coin.change1h) ? coin.change1h : 0;
  const d1 = Number.isFinite(coin.change24h) ? coin.change24h : 0;
  const w1 = Number.isFinite(coin.change7d) ? coin.change7d : 0;
  const m1 = Number.isFinite(coin.change30d) ? coin.change30d : d1 * 2.1;
  const y1 = Number.isFinite(coin.change1y) ? coin.change1y : m1 * 2.5;

  switch (period) {
    case '1 Min':
      return h1 * 0.12;
    case '5 Min':
      return h1 * 0.28;
    case '15 Min':
      return h1 * 0.52;
    case 'Hour':
      return h1;
    case '4 Hours':
      return h1 * 0.45 + d1 * 0.35;
    case 'Day':
      return d1;
    case 'Week':
      return w1;
    case 'Month':
      return m1;
    case '3 Months':
      return m1 * 1.65 + y1 * 0.25;
    case 'Year':
      return y1;
  }
}

export const CryptoBubblesView: React.FC<CryptoBubblesViewProps> = ({
  coins,
  watchlistIds,
  currency,
  fxRates,
  isDark,
  onSelectCoin,
}) => {
  const [rankRange, setRankRange] = useState<RankRangeOption>('top100');
  const [period, setPeriod] = useState<BubblePeriod>('Day');
  const [sizeBy, setSizeBy] = useState<BubbleSizeBy>('performance');
  const [contentBy, setContentBy] = useState<BubbleContentBy>('performance');
  const [colorBy, setColorBy] = useState<BubbleColorBy>('performance');
  const [activeQuickPill, setActiveQuickPill] = useState<string>('1D');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hoveredCoin, setHoveredCoin] = useState<{ coin: Coin; perfPct: number } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<PhysicsBubble[]>([]);
  const imageCacheRef = useRef<Map<string, HTMLImageElement | 'error'>>(new Map());
  const dragStateRef = useRef<{
    bubbleId: string | null;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    moved: boolean;
  }>({
    bubbleId: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    moved: false,
  });
  const hoveredIdRef = useRef<string | null>(null);
  const canvasDimsRef = useRef<{ width: number; height: number }>({ width: 1100, height: 640 });

  useEffect(() => {
    if (!isFullScreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullScreen]);

  const sortedByRank = useMemo(() => {
    return [...coins].sort((a, b) => a.rank - b.rank);
  }, [coins]);

  const rangedCoins = useMemo(() => {
    let base: Coin[];
    if (rankRange === 'top100') {
      base = sortedByRank.slice(0, 100);
    } else if (rankRange === 'top200') {
      base = sortedByRank.slice(100, 200);
    } else if (rankRange === 'top300') {
      base = sortedByRank.slice(200, 300);
    } else {
      const watchSet = new Set(watchlistIds);
      base = sortedByRank.filter((c) => watchSet.has(c.id));
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [sortedByRank, rankRange, watchlistIds, searchQuery]);

  const summaryStats = useMemo(() => {
    if (rangedCoins.length === 0) {
      return { gainers: 0, losers: 0, topMover: null as { coin: Coin; pct: number } | null };
    }
    let gainers = 0;
    let losers = 0;
    let topMover: { coin: Coin; pct: number } | null = null;
    for (const c of rangedCoins) {
      const pct = getPeriodChangePct(c, period);
      if (pct >= 0) gainers += 1;
      else losers += 1;
      if (!topMover || Math.abs(pct) > Math.abs(topMover.pct)) {
        topMover = { coin: c, pct };
      }
    }
    return { gainers, losers, topMover };
  }, [rangedCoins, period]);

  const getContentLabel = useCallback(
    (coin: Coin, perfPct: number): string => {
      switch (contentBy) {
        case 'performance':
          return formatPercent(perfPct);
        case 'price':
          return formatPrice(coin.priceUsd, currency, fxRates);
        case 'marketCap':
          return formatCompactCurrency(coin.marketCapUsd, currency, fxRates);
        case 'volume':
          return formatCompactCurrency(coin.volume24hUsd, currency, fxRates);
        case 'rank':
          return `#${coin.rank}`;
        case 'name':
          return coin.name.length > 10 ? `${coin.name.slice(0, 9)}…` : coin.name;
        case 'dominance':
          return `${coin.dominancePct.toFixed(2)}%`;
      }
    },
    [contentBy, currency, fxRates]
  );

  // Sync bubble models + target radii whenever dataset or settings change
  useEffect(() => {
    const { width, height } = canvasDimsRef.current;
    const area = Math.max(200_000, width * height);
    const count = Math.max(1, rangedCoins.length);

    // Target ~58% packing density so bubbles bounce freely without getting squished
    const avgRadius = Math.sqrt((area * 0.56) / (count * Math.PI));
    const minRadius = Math.max(18, Math.min(34, avgRadius * 0.56));
    const maxRadius = Math.max(46, Math.min(94, avgRadius * 1.88));

    const scores = rangedCoins.map((c) => {
      const perf = Math.abs(getPeriodChangePct(c, period));
      if (sizeBy === 'performance') return Math.max(0.25, perf);
      if (sizeBy === 'marketCap') return Math.max(1, Math.log10(Math.max(10, c.marketCapUsd)));
      if (sizeBy === 'volume') return Math.max(1, Math.log10(Math.max(10, c.volume24hUsd)));
      return 1 / Math.sqrt(Math.max(1, c.rank));
    });

    const minScore = scores.length ? Math.min(...scores) : 0;
    const maxScore = scores.length ? Math.max(...scores) : 1;
    const span = Math.max(0.0001, maxScore - minScore);

    const existingMap = new Map<string, PhysicsBubble>();
    for (const b of bubblesRef.current) {
      existingMap.set(b.id, b);
    }

    const minRank = rangedCoins.length ? Math.min(...rangedCoins.map((c) => c.rank)) : 1;
    const maxRank = rangedCoins.length ? Math.max(...rangedCoins.map((c) => c.rank)) : 100;
    const rankSpan = Math.max(1, maxRank - minRank);

    const nextBubbles: PhysicsBubble[] = rangedCoins.map((coin, idx) => {
      const perfPct = getPeriodChangePct(coin, period);
      const rawNorm = (scores[idx] - minScore) / span;
      const curvedNorm = Math.pow(Math.min(1, Math.max(0, rawNorm)), 0.72);
      const targetRadius = minRadius + curvedNorm * (maxRadius - minRadius);

      const prev = existingMap.get(coin.id);
      const angle = (idx / Math.max(1, count)) * Math.PI * 2;
      const ringDist = Math.min(width, height) * (0.14 + ((idx * 17) % 30) / 100);
      const initX = prev
        ? Math.min(width - targetRadius - 8, Math.max(targetRadius + 8, prev.x))
        : width / 2 + Math.cos(angle) * ringDist;
      const initY = prev
        ? Math.min(height - targetRadius - 8, Math.max(targetRadius + 8, prev.y))
        : height / 2 + Math.sin(angle) * ringDist;

      const logoUrl = coin.image || getCmcLogoUrl(coin.symbol);
      if (logoUrl && !imageCacheRef.current.has(logoUrl)) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.onload = () => {
          imageCacheRef.current.set(logoUrl, img);
        };
        img.onerror = () => {
          imageCacheRef.current.set(logoUrl, 'error');
        };
        img.src = logoUrl;
      }

      return {
        id: coin.id,
        coin,
        x: initX,
        y: initY,
        vx: prev ? prev.vx : (Math.cos(angle * 2) * 0.45),
        vy: prev ? prev.vy : (Math.sin(angle * 2) * 0.45),
        radius: prev ? prev.radius : Math.max(12, targetRadius * 0.6),
        targetRadius,
        perfPct,
        normRank: (coin.rank - minRank) / rankSpan,
        contentLabel: getContentLabel(coin, perfPct),
        logoUrl,
      };
    });

    bubblesRef.current = nextBubbles;
  }, [rangedCoins, period, sizeBy, getContentLabel]);

  // ResizeObserver for crisp HiDPI canvas sizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(420, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      canvasDimsRef.current = { width, height };
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isFullScreen]);

  // Main 60fps physics + render loop
  useEffect(() => {
    let rafId = 0;

    const step = (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = window.requestAnimationFrame(step);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = window.requestAnimationFrame(step);
        return;
      }

      const { width, height } = canvasDimsRef.current;
      const list = bubblesRef.current;
      const draggingId = dragStateRef.current.bubbleId;
      const hoveredId = hoveredIdRef.current;
      const t = timeMs * 0.001;

      // 1. Update radii, ambient float, and gentle centering
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        b.radius += (b.targetRadius - b.radius) * 0.14;

        if (b.id === draggingId) continue;

        const dxCenter = cx - b.x;
        const dyCenter = cy - b.y;
        b.vx += dxCenter * 0.00018;
        b.vy += dyCenter * 0.00018;

        // Subtle organic float impulse
        b.vx += Math.sin(t * 0.9 + i * 1.37) * 0.012;
        b.vy += Math.cos(t * 0.8 + i * 1.91) * 0.012;

        b.vx *= 0.982;
        b.vy *= 0.982;

        // Clamp max speed for stability
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 9) {
          b.vx = (b.vx / speed) * 9;
          b.vy = (b.vy / speed) * 9;
        }

        b.x += b.vx;
        b.y += b.vy;
      }

      // 2. Pairwise elastic collision resolution (2 passes for crisp packing)
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < list.length; i++) {
          const a = list[i];
          for (let j = i + 1; j < list.length; j++) {
            const b = list[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = a.radius + b.radius + 3;
            const distSq = dx * dx + dy * dy;
            if (distSq >= minDist * minDist) continue;

            const dist = Math.sqrt(distSq) || 0.01;
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;

            const massA = a.radius * a.radius;
            const massB = b.radius * b.radius;
            const totalMass = massA + massB;

            if (a.id !== draggingId && b.id !== draggingId) {
              const ratioA = massB / totalMass;
              const ratioB = massA / totalMass;
              a.x -= nx * overlap * ratioA;
              a.y -= ny * overlap * ratioA;
              b.x += nx * overlap * ratioB;
              b.y += ny * overlap * ratioB;

              const rvx = b.vx - a.vx;
              const rvy = b.vy - a.vy;
              const velAlongNormal = rvx * nx + rvy * ny;
              if (velAlongNormal < 0) {
                const restitution = 0.68;
                const impulse = (-(1 + restitution) * velAlongNormal) / (1 / massA + 1 / massB);
                a.vx -= (impulse / massA) * nx;
                a.vy -= (impulse / massA) * ny;
                b.vx += (impulse / massB) * nx;
                b.vy += (impulse / massB) * ny;
              }
            } else if (a.id === draggingId) {
              b.x += nx * overlap;
              b.y += ny * overlap;
              b.vx += nx * 0.45;
              b.vy += ny * 0.45;
            } else {
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              a.vx -= nx * 0.45;
              a.vy -= ny * 0.45;
            }
          }
        }

        // Wall containment
        const wallPad = 8;
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          const minX = b.radius + wallPad;
          const maxX = width - b.radius - wallPad;
          const minY = b.radius + wallPad;
          const maxY = height - b.radius - wallPad;

          if (b.x < minX) {
            b.x = minX;
            if (b.vx < 0) b.vx *= -0.72;
          } else if (b.x > maxX) {
            b.x = maxX;
            if (b.vx > 0) b.vx *= -0.72;
          }
          if (b.y < minY) {
            b.y = minY;
            if (b.vy < 0) b.vy *= -0.72;
          } else if (b.y > maxY) {
            b.y = maxY;
            if (b.vy > 0) b.vy *= -0.72;
          }
        }
      }

      // 3. Draw Canvas
      ctx.clearRect(0, 0, width, height);

      // Subtle atmospheric canvas backdrop
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72
      );
      if (isDark) {
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#070b14');
      } else {
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(1, '#eef2f7');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw each glowing bubble
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const r = b.radius;
        if (r < 4) continue;
        const isHovered = b.id === hoveredId || b.id === draggingId;

        let borderRgb = '34, 197, 94';
        let fillTop = 'rgba(16, 185, 129, 0.16)';
        let fillBottom = 'rgba(6, 95, 70, 0.42)';
        let textPrimary = isDark ? '#ffffff' : '#064e3b';
        let textSub = isDark ? '#86efac' : '#047857';

        if (colorBy === 'performance') {
          const intensity = Math.min(1, Math.abs(b.perfPct) / 14);
          if (b.perfPct >= 0) {
            borderRgb = isDark ? '34, 197, 94' : '16, 185, 129';
            fillTop = `rgba(34, 197, 94, ${(0.12 + intensity * 0.14).toFixed(2)})`;
            fillBottom = isDark
              ? `rgba(6, 95, 70, ${(0.34 + intensity * 0.34).toFixed(2)})`
              : `rgba(16, 185, 129, ${(0.18 + intensity * 0.2).toFixed(2)})`;
            textPrimary = isDark ? '#f8fafc' : '#064e3b';
            textSub = isDark ? '#4ade80' : '#047857';
          } else {
            borderRgb = isDark ? '244, 63, 94' : '225, 29, 72';
            fillTop = `rgba(244, 63, 94, ${(0.12 + intensity * 0.14).toFixed(2)})`;
            fillBottom = isDark
              ? `rgba(136, 19, 55, ${(0.34 + intensity * 0.34).toFixed(2)})`
              : `rgba(244, 63, 94, ${(0.16 + intensity * 0.2).toFixed(2)})`;
            textPrimary = isDark ? '#f8fafc' : '#881337';
            textSub = isDark ? '#fda4af' : '#be123c';
          }
        } else if (colorBy === 'rankGradient') {
          const hue = Math.round(188 + b.normRank * 92); // cyan -> violet
          borderRgb = `${hue === 188 ? '6, 182, 212' : '99, 102, 241'}`;
          fillTop = `hsla(${hue}, 85%, 58%, 0.2)`;
          fillBottom = isDark
            ? `hsla(${hue}, 72%, 28%, 0.56)`
            : `hsla(${hue}, 75%, 85%, 0.55)`;
          textPrimary = isDark ? '#ffffff' : '#0f172a';
          textSub = isDark ? `hsl(${hue}, 90%, 78%)` : `hsl(${hue}, 75%, 34%)`;
        } else {
          borderRgb = isDark ? '148, 163, 184' : '100, 116, 139';
          fillTop = isDark ? 'rgba(51, 65, 85, 0.32)' : 'rgba(226, 232, 240, 0.55)';
          fillBottom = isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(203, 213, 225, 0.78)';
          textPrimary = isDark ? '#f8fafc' : '#0f172a';
          textSub = isDark ? '#cbd5e1' : '#334155';
        }

        ctx.save();
        // Outer neon glow
        ctx.shadowColor = `rgba(${borderRgb}, ${isHovered ? 0.85 : 0.42})`;
        ctx.shadowBlur = isHovered ? 24 : Math.min(18, r * 0.32);

        const sphereGrad = ctx.createRadialGradient(
          b.x - r * 0.28,
          b.y - r * 0.32,
          r * 0.08,
          b.x,
          b.y,
          r
        );
        sphereGrad.addColorStop(0, fillTop);
        sphereGrad.addColorStop(1, fillBottom);

        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = isHovered ? 2.6 : 1.5;
        ctx.strokeStyle = `rgba(${borderRgb}, ${isHovered ? 1 : 0.78})`;
        ctx.stroke();

        // Top glass rim highlight
        ctx.beginPath();
        ctx.arc(b.x, b.y, Math.max(2, r - 2), -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Draw circular coin logo if bubble is large enough
        const showLogo = r >= 24;
        const logoSize = Math.min(34, Math.max(12, r * 0.44));
        const logoY = r >= 36 ? b.y - r * 0.34 : b.y - r * 0.26;

        if (showLogo) {
          const cachedImg = b.logoUrl ? imageCacheRef.current.get(b.logoUrl) : null;
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, logoY, logoSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          if (cachedImg && cachedImg !== 'error' && cachedImg.complete && cachedImg.naturalWidth > 0) {
            ctx.drawImage(
              cachedImg,
              b.x - logoSize / 2,
              logoY - logoSize / 2,
              logoSize,
              logoSize
            );
          } else {
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(241, 245, 249, 0.95)';
            ctx.fillRect(b.x - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
            ctx.fillStyle = textPrimary;
            ctx.font = `700 ${Math.max(8, Math.round(logoSize * 0.42))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.coin.symbol.slice(0, 2), b.x, logoY + 0.5);
          }
          ctx.restore();
        }

        // Ticker Symbol + Live Metric inside bubble
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const symbolFontSize = Math.min(20, Math.max(9, Math.round(r * 0.27)));
        const metricFontSize = Math.min(15, Math.max(8, Math.round(r * 0.21)));
        const symbolY = showLogo ? b.y + r * 0.12 : b.y - metricFontSize * 0.42;
        const metricY = symbolY + symbolFontSize * 0.95;

        ctx.fillStyle = textPrimary;
        ctx.font = `700 ${symbolFontSize}px Inter, system-ui, -apple-system, sans-serif`;
        const maxSymChars = r < 24 ? 4 : 7;
        const symText =
          b.coin.symbol.length > maxSymChars
            ? `${b.coin.symbol.slice(0, maxSymChars - 1)}…`
            : b.coin.symbol;
        ctx.fillText(symText, b.x, symbolY);

        if (r >= 20) {
          ctx.fillStyle = textSub;
          ctx.font = `700 ${metricFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(b.contentLabel, b.x, metricY);
        }

        ctx.restore();
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [colorBy, isDark]);

  const findBubbleAt = (x: number, y: number): PhysicsBubble | null => {
    const list = bubblesRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      const dx = x - b.x;
      const dy = y - b.y;
      if (dx * dx + dy * dy <= b.radius * b.radius) {
        return b;
      }
    }
    return null;
  };

  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getPointerCoords(e);
    const hit = findBubbleAt(x, y);
    if (!hit) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      bubbleId: hit.id,
      offsetX: hit.x - x,
      offsetY: hit.y - y,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      lastTime: performance.now(),
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getPointerCoords(e);
    const drag = dragStateRef.current;

    if (drag.bubbleId) {
      const target = bubblesRef.current.find((b) => b.id === drag.bubbleId);
      if (target) {
        const now = performance.now();
        const dt = Math.max(8, now - drag.lastTime);
        const nx = x + drag.offsetX;
        const ny = y + drag.offsetY;
        target.vx = ((x - drag.lastX) / dt) * 14;
        target.vy = ((y - drag.lastY) / dt) * 14;
        target.x = nx;
        target.y = ny;

        if (Math.hypot(x - drag.startX, y - drag.startY) > 6) {
          drag.moved = true;
        }
        drag.lastX = x;
        drag.lastY = y;
        drag.lastTime = now;
      }
      return;
    }

    const hit = findBubbleAt(x, y);
    hoveredIdRef.current = hit ? hit.id : null;
    if (hit) {
      setHoveredCoin({ coin: hit.coin, perfPct: hit.perfPct });
    } else {
      setHoveredCoin(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    if (drag.bubbleId) {
      const clicked = !drag.moved
        ? bubblesRef.current.find((b) => b.id === drag.bubbleId)
        : null;
      dragStateRef.current = {
        bubbleId: null,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        lastTime: 0,
        moved: false,
      };
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (clicked) {
        onSelectCoin(clicked.coin);
      }
    }
  };

  const handleQuickPillClick = (pill: (typeof QUICK_TIMEFRAME_PILLS)[number]) => {
    setActiveQuickPill(pill.id);
    if (pill.period) {
      setPeriod(pill.period);
      if (sizeBy === 'marketCap' && contentBy === 'marketCap') {
        setSizeBy('performance');
        setContentBy('performance');
      }
    }
    if (pill.sizeBy) setSizeBy(pill.sizeBy);
    if (pill.contentBy) setContentBy(pill.contentBy);
  };

  const resetCustomization = () => {
    setPeriod('Day');
    setSizeBy('performance');
    setContentBy('performance');
    setColorBy('performance');
    setActiveQuickPill('1D');
  };

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-[#070b14]'
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden flex flex-col'
      }
    >
      {/* Top Controls & Rank Range Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#101624]/95 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Crypto Bubbles
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-mono font-bold uppercase whitespace-nowrap">
              {rangedCoins.length} Live Bubbles · {period}
            </span>
            <span className="hidden md:inline-flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400">
                {summaryStats.gainers} Up
              </span>
              <span>/</span>
              <span className="text-rose-600 dark:text-rose-400">
                {summaryStats.losers} Down
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter bubbles..."
                className="pl-8 pr-3 py-1.5 w-40 sm:w-48 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settingsOpen
                  ? 'border-emerald-500/50 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Customize Bubbles</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Expand Full Screen'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Full</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rank Range Selector + Quick Timeframe Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="group"
            aria-label="Rank range selector"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5"
          >
            {RANK_RANGES.map((r) => {
              const active = rankRange === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRankRange(r.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {r.label}
                  {r.id === 'watchlist' && ` (${watchlistIds.length})`}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Quick bubble timeframe pills"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5"
          >
            {QUICK_TIMEFRAME_PILLS.map((pill) => {
              const active = activeQuickPill === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleQuickPillClick(pill)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Canvas Stage + Optional Customize Drawer */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden select-none ${
          isFullScreen ? 'flex-1 min-h-0' : 'h-[68vh] min-h-[540px]'
        }`}
      >
        {rangedCoins.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-[#070b14]">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {rankRange === 'watchlist'
                ? 'Your Watchlist has no matching coins yet. Star coins in Top 1000 or switch to Top 1–100.'
                : `No coins matched "${searchQuery}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (rankRange === 'watchlist') setRankRange('top100');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
            >
              Show Top 1–100 Bubbles
            </button>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => {
              hoveredIdRef.current = null;
              setHoveredCoin(null);
            }}
            className={`block w-full h-full touch-none ${
              hoveredCoin ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
          />
        )}

        {/* Hovered Bubble Telemetry HUD */}
        {hoveredCoin && (
          <div className="pointer-events-none absolute left-4 bottom-4 z-20 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 shadow-lg max-w-xs">
            <div className="flex items-center gap-2.5">
              <CoinLogo coin={hoveredCoin.coin} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {hoveredCoin.coin.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    #{hoveredCoin.coin.rank} {hoveredCoin.coin.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 mt-0.5 font-mono tabular-nums text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatPrice(hoveredCoin.coin.priceUsd, currency, fxRates)}
                  </span>
                  <span
                    className={`font-bold ${
                      hoveredCoin.perfPct >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatPercent(hoveredCoin.perfPct)} ({period})
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>MCap {formatCompactCurrency(hoveredCoin.coin.marketCapUsd, currency, fxRates)}</span>
              <span>Vol {formatCompactCurrency(hoveredCoin.coin.volume24hUsd, currency, fxRates)}</span>
            </div>
            <div className="mt-1 text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
              Drag to toss · Click for Chart &amp; Anti-FOMO Audit
            </div>
          </div>
        )}

        {/* Top Mover Pill in Bottom-Right */}
        {summaryStats.topMover && !hoveredCoin && (
          <div className="pointer-events-none hidden sm:flex items-center gap-2 absolute right-4 bottom-4 z-10 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-1.5 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span>Top Mover ({period}):</span>
            <strong className="text-slate-900 dark:text-white">
              {summaryStats.topMover.coin.symbol}
            </strong>
            <span
              className={
                summaryStats.topMover.pct >= 0
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {formatPercent(summaryStats.topMover.pct)}
            </span>
          </div>
        )}

        {/* Custom Bubble Settings Drawer */}
        {settingsOpen && (
          <aside className="absolute top-3 right-3 bottom-3 z-30 w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0f1626]/95 backdrop-blur-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Customize Bubbles
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetCustomization}
                  title="Reset bubble settings"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close Customize Bubbles"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* Period */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Period
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERIOD_OPTIONS.map((p) => {
                    const active = period === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPeriod(p);
                          setActiveQuickPill(
                            p === 'Hour'
                              ? '1H'
                              : p === 'Day'
                              ? '1D'
                              : p === 'Week'
                              ? '1W'
                              : p === 'Month'
                              ? '1M'
                              : p === 'Year'
                              ? '1Y'
                              : ''
                          );
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-left font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bubble Size */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Bubble Size
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'performance', label: 'Performance %' },
                      { id: 'marketCap', label: 'Market Cap' },
                      { id: 'volume', label: '24h Volume' },
                      { id: 'rank', label: 'Rank' },
                    ] as Array<{ id: BubbleSizeBy; label: string }>
                  ).map((opt) => {
                    const active = sizeBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSizeBy(opt.id);
                          if (opt.id !== 'marketCap' && activeQuickPill === 'MCAP') {
                            setActiveQuickPill('');
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-left font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bubble Content */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Bubble Content
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'performance', label: 'Performance %' },
                      { id: 'price', label: 'Price' },
                      { id: 'marketCap', label: 'Market Cap' },
                      { id: 'volume', label: '24h Volume' },
                      { id: 'rank', label: 'Rank' },
                      { id: 'name', label: 'Name' },
                      { id: 'dominance', label: 'Dominance' },
                    ] as Array<{ id: BubbleContentBy; label: string }>
                  ).map((opt) => {
                    const active = contentBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setContentBy(opt.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-left font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bubble Color */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Bubble Color
                </div>
                <div className="space-y-1.5">
                  {(
                    [
                      { id: 'performance', label: 'Performance (Green / Red)' },
                      { id: 'rankGradient', label: 'Rank Gradient' },
                      { id: 'neutral', label: 'Neutral' },
                    ] as Array<{ id: BubbleColorBy; label: string }>
                  ).map((opt) => {
                    const active = colorBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setColorBy(opt.id)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-left font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
