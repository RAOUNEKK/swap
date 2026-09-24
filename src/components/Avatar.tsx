import { getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-2xl',
};

export function Avatar({ name, avatarUrl, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = SIZES[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border-2 border-app-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-app-primary text-white font-bold flex items-center justify-center border-2 border-app-border ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
