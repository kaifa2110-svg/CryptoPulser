import React, { useEffect, useId, useRef, useState } from 'react';

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

let tvScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.TradingView?.widget) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;

  tvScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://s3.tradingview.com/tv.js"]'
    );
    if (existing) {
      if (window.TradingView?.widget) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load tv.js')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      tvScriptPromise = null;
      reject(new Error('Failed to load TradingView tv.js'));
    };
    document.head.appendChild(script);
  });

  return tvScriptPromise;
}

interface TradingViewAdvancedChartProps {
  tvSymbol: string;
  coinSymbol: string;
  isDark: boolean;
  isFullScreen?: boolean;
}

export const TradingViewAdvancedChart: React.FC<TradingViewAdvancedChartProps> = ({
  tvSymbol,
  coinSymbol,
  isDark,
  isFullScreen = false,
}) => {
  const reactId = useId();
  const containerId = `tv_adv_${reactId.replace(/[^a-zA-Z0-9_]/g, '')}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptFallback, setScriptFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setScriptFallback(false);

    loadTradingViewScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.TradingView?.widget) return;
        containerRef.current.innerHTML = '';

        const bg = isDark ? '#0b0f19' : '#ffffff';
        const toolbarBg = isDark ? '#0b0f19' : '#f8fafc';
        const gridColor = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.8)';

        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: '60',
          timezone: 'Etc/UTC',
          theme: isDark ? 'dark' : 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: toolbarBg,
          backgroundColor: bg,
          gridColor,
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          withdateranges: true,
          save_image: false,
          container_id: containerId,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setScriptFallback(true);
        }
      });

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tvSymbol, isDark, containerId]);

  const fallbackEmbedUrl = `https://s.tradingview.com/widgetembed/?frameElementId=${encodeURIComponent(
    containerId
  )}&symbol=${encodeURIComponent(tvSymbol)}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=${
    isDark ? '0b0f19' : 'f8fafc'
  }&studies=[]&theme=${isDark ? 'dark' : 'light'}&style=1&timezone=Etc%2FUTC&withdateranges=1`;

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-[#0b0f19] ${
        isFullScreen ? 'flex-1 min-h-[500px] lg:min-h-0' : 'h-[380px]'
      }`}
    >
      {scriptFallback ? (
        <iframe
          key={fallbackEmbedUrl}
          src={fallbackEmbedUrl}
          title={`TradingView ${coinSymbol} Candlestick Chart (${tvSymbol})`}
          className="w-full h-full border-0"
          allowFullScreen
        />
      ) : (
        <div ref={containerRef} id={containerId} className="w-full h-full" />
      )}
    </div>
  );
};
