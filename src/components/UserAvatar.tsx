import React from 'react';
import { COSMIC_AVATAR_PRESETS } from '../context/UserAccountContext';

interface UserAvatarProps {
  displayName: string;
  avatarUrl?: string;
  avatarPresetId?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  displayName,
  avatarUrl,
  avatarPresetId = 'pulsar-cyan',
  size = 'md',
}) => {
  const dim =
    size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-xs';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${dim} rounded-full object-cover border border-cyan-400/50 shrink-0`}
      />
    );
  }

  const preset =
    COSMIC_AVATAR_PRESETS.find((p) => p.id === avatarPresetId) ?? COSMIC_AVATAR_PRESETS[0];

  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'CP';

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-display font-bold text-white shrink-0 relative overflow-hidden border border-white/20`}
      style={{
        background: `linear-gradient(135deg, ${preset.bgFrom}, ${preset.bgTo})`,
        boxShadow: `0 0 12px ${preset.accent}33`,
      }}
    >
      <span
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 25% 25%, ${preset.accent}, transparent 65%)`,
        }}
      />
      <span className="relative z-10">{initials}</span>
    </div>
  );
};
