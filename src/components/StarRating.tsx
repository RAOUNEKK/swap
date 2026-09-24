import { Star } from 'lucide-react';

export function StarRating({
  value,
  size = 14,
  showNumber = false,
  className = '',
}: {
  value: number;
  size?: number;
  showNumber?: boolean;
  className?: string;
}) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const isFull = i < full;
          const isHalf = i === full && hasHalf;
          return (
            <Star
              key={i}
              size={size}
              className={
                isFull
                  ? 'fill-terracotta-300 text-terracotta-300'
                  : isHalf
                  ? 'fill-terracotta-200 text-terracotta-300'
                  : 'text-charcoal-200'
              }
            />
          );
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-semibold text-charcoal-500">
          {value > 0 ? value.toFixed(1) : 'New'}
        </span>
      )}
    </div>
  );
}
