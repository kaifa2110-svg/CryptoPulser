import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { WalletProviderId } from '../types/crypto';

interface WalletProviderIconProps {
  providerId: WalletProviderId;
  size?: number;
  className?: string;
}

export const WalletProviderIcon: React.FC<WalletProviderIconProps> = ({
  providerId,
  size = 22,
  className = '',
}) => {
  switch (providerId) {
    case 'metamask':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#F6851B" fillOpacity="0.16" />
          <path
            d="M19.5 5.2L13.4 9.7L14.5 7.1L19.5 5.2Z"
            fill="#E2761B"
            stroke="#E2761B"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 5.2L10.5 9.8L9.5 7.1L4.5 5.2Z"
            fill="#E4761B"
            stroke="#E4761B"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path
            d="M17.3 15.6L15.7 18L19.2 19L20.2 15.7L17.3 15.6Z"
            fill="#E4761B"
          />
          <path
            d="M3.8 15.7L4.8 19L8.3 18L6.7 15.6L3.8 15.7Z"
            fill="#E4761B"
          />
          <path
            d="M8.1 11.2L7.1 12.7L10.6 12.9L10.5 9.1L8.1 11.2Z"
            fill="#F6851B"
          />
          <path
            d="M15.9 11.2L13.4 9L13.4 12.9L16.9 12.7L15.9 11.2Z"
            fill="#F6851B"
          />
          <path
            d="M8.3 18L10.4 17L8.6 15.7L8.3 18Z"
            fill="#CD6116"
          />
          <path
            d="M13.6 17L15.7 18L15.4 15.7L13.6 17Z"
            fill="#CD6116"
          />
          <path
            d="M10.4 13.5L9.4 15.3L12 16.4L14.6 15.3L13.6 13.5H10.4Z"
            fill="#F5841F"
          />
        </svg>
      );

    case 'trust':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#0500FF" fillOpacity="0.16" />
          <path
            d="M12 4.5C9.7 6.3 7.2 6.8 5.5 6.9V12.5C5.5 16.4 8.3 18.8 12 20C15.7 18.8 18.5 16.4 18.5 12.5V6.9C16.8 6.8 14.3 6.3 12 4.5Z"
            stroke="#38BDF8"
            strokeWidth="1.8"
            strokeLinejoin="round"
            fill="#0EA5E9"
            fillOpacity="0.2"
          />
        </svg>
      );

    case 'phantom':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#AB9FF2" fillOpacity="0.18" />
          <path
            d="M12 4.8C7.9 4.8 5.2 8 5.2 12.4C5.2 15.7 7.1 18.8 9.6 18.8C10.5 18.8 11.2 18.1 11.7 17.5C12.1 18.2 12.8 18.8 13.7 18.8C16.3 18.8 18.8 15.6 18.8 11.9C18.8 7.8 15.8 4.8 12 4.8Z"
            fill="#A78BFA"
          />
          <circle cx="10" cy="11.2" r="1.15" fill="#0F172A" />
          <circle cx="14" cy="11.2" r="1.15" fill="#0F172A" />
        </svg>
      );

    case 'coinbase':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#0052FF" fillOpacity="0.2" />
          <circle cx="12" cy="12" r="7" fill="#0052FF" />
          <rect x="9.3" y="9.3" width="5.4" height="5.4" rx="1.2" fill="#FFFFFF" />
        </svg>
      );

    case 'ledger':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#64748B" fillOpacity="0.2" />
          <path d="M5.5 9V5.5H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M15 5.5H18.5V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M5.5 15V18.5H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M15 18.5H18.5V15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M10 8.5V14.5H14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );

    case 'demo_judge':
    default:
      return (
        <span
          style={{ width: size, height: size }}
          className={`inline-flex items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400 ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
        </span>
      );
  }
};
