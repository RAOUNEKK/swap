import { Repeat } from 'lucide-react';

export function Logo({ className = '', showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center w-9 h-9 rounded-xl border-2 border-app-border bg-app-primary text-white shadow-[2px_2px_0_var(--app-shadow)]">
        <Repeat className="w-5 h-5" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className="font-display text-xl font-bold text-charcoal-800 tracking-tight">
          Swap
        </span>
      )}
    </div>
  );
}
