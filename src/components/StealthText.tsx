import React from 'react';
import { usePrivacy } from '../context/PrivacyContext';

interface StealthValueProps {
  children: React.ReactNode;
  mask?: string;
  className?: string;
}

export const StealthValue: React.FC<StealthValueProps> = ({
  children,
  mask = '••••••',
  className = '',
}) => {
  const { stealthMode } = usePrivacy();

  if (!stealthMode) {
    return <>{children}</>;
  }

  return (
    <span
      className={`inline-block font-mono tracking-widest blur-[2.5px] select-none opacity-80 transition-all ${className}`}
      aria-label="Hidden in Stealth Mode"
      title="Stealth Mode Active (Alt + H)"
    >
      {mask}
    </span>
  );
};
