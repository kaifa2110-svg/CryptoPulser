import React, { useId } from 'react';

interface PulsarLogoProps {
  size?: number;
}

export const PulsarLogo: React.FC<PulsarLogoProps> = ({ size = 34 }) => {
  const uid = useId().replace(/:/g, '');
  const coreId = `pulsarCoreGlow-${uid}`;
  const topId = `pulsarBeamTop-${uid}`;
  const botId = `pulsarBeamBot-${uid}`;

  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full shrink-0 bg-[#0B1120] border border-cyan-400/40"
      style={{
        width: size,
        height: size,
        boxShadow:
          '0 0 12px rgba(34, 211, 238, 0.35), 0 0 18px rgba(192, 132, 252, 0.25)',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        className="w-[84%] h-[84%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#22D3EE" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#C084FC" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={topId} x1="32" y1="32" x2="56" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={botId} x1="32" y1="32" x2="8" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Orbital magnetic field rings */}
        <ellipse
          cx="32"
          cy="32"
          rx="23"
          ry="9.5"
          transform="rotate(-28 32 32)"
          stroke="#C084FC"
          strokeWidth="1.6"
          strokeOpacity="0.78"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="23"
          ry="9.5"
          transform="rotate(28 32 32)"
          stroke="#22D3EE"
          strokeWidth="1.6"
          strokeOpacity="0.78"
        />

        {/* Twin opposing relativistic radiation cones/beams */}
        <path d="M32 32 L52 6 L58 12 Z" fill={`url(#${topId})`} fillOpacity="0.55" />
        <path d="M32 32 L12 58 L6 52 Z" fill={`url(#${botId})`} fillOpacity="0.55" />
        <line
          x1="9"
          y1="55"
          x2="55"
          y2="9"
          stroke="#22D3EE"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Neutron star core */}
        <circle cx="32" cy="32" r="13" fill={`url(#${coreId})`} />
        <circle cx="32" cy="32" r="4.5" fill="#FFFFFF" />
      </svg>
    </span>
  );
};
