import { useEffect, useState } from 'react';
import { sanitizeHttpUrl } from '../utils/urlUtils';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-sm',
};

export function UserAvatar({ name, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const safeUrl = sanitizeHttpUrl(avatarUrl);

  useEffect(() => {
    setImgError(false);
  }, [safeUrl]);

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'TF';

  if (safeUrl && !imgError) {
    return (
      <img
        src={safeUrl}
        alt={`${name} profile picture`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${SIZE_CLASSES[size]} rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      className={`${SIZE_CLASSES[size]} rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {initials}
    </span>
  );
}
