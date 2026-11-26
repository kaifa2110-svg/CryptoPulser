import React, { useEffect, useState } from 'react';
import { Coin } from '../types/crypto';
import { getBadgeColorClass, getCmcLogoUrl } from '../utils/coinLogos';

interface CoinLogoProps {
  coin?: Pick<Coin, 'symbol' | 'name' | 'image'> | null;
  symbol?: string;
  name?: string;
  cmcId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CoinLogoProps['size']>, string> = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-6 h-6 text-[10px]',
  lg: 'w-10 h-10 text-sm',
};

export const CoinLogo: React.FC<CoinLogoProps> = ({
  coin,
  symbol,
  name,
  cmcId,
  size = 'md',
  className = '',
}) => {
  const sym = (coin?.symbol || symbol || '?').toUpperCase();
  const label = coin?.name || name || sym;
  const cmcUrl = getCmcLogoUrl(sym, cmcId);
  const altUrl = coin?.image;

  const [stage, setStage] = useState<'cmc' | 'alt' | 'fallback'>(() =>
    cmcUrl ? 'cmc' : altUrl ? 'alt' : 'fallback'
  );

  useEffect(() => {
    setStage(cmcUrl ? 'cmc' : altUrl ? 'alt' : 'fallback');
  }, [cmcUrl, altUrl, sym]);

  const activeSrc = stage === 'cmc' ? cmcUrl : stage === 'alt' ? altUrl : null;
  const dim = SIZE_CLASSES[size];

  if (activeSrc) {
    return (
      <img
        src={activeSrc}
        alt={label}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (stage === 'cmc' && altUrl && altUrl !== cmcUrl) {
            setStage('alt');
          } else {
            setStage('fallback');
          }
        }}
        className={`${dim} rounded-full shrink-0 object-cover bg-slate-100 dark:bg-slate-800 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={label}
      className={`${dim} rounded-full shrink-0 border flex items-center justify-center font-mono font-bold ${getBadgeColorClass(
        sym
      )} ${className}`}
    >
      {sym.slice(0, 2)}
    </div>
  );
};
