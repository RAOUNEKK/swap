import type { ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms, e.g. 0, 100, 200 for a cascading card grid. */
  delay?: number;
  className?: string;
  /** 'up' (default) slides in from below; 'scale' pops in from slightly smaller. */
  variant?: 'up' | 'scale';
  /** Override text direction independently of the page's dir — useful when a
   * parent section is pinned to a physical side (dir="ltr") but the content
   * inside it is Arabic and needs to read right-to-left. */
  dir?: 'ltr' | 'rtl';
}

export function Reveal({ children, delay = 0, className = '', variant = 'up', dir }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  const hidden = variant === 'scale' ? 'opacity-0 scale-95' : 'opacity-0 translate-y-8';
  const shown = 'opacity-100 translate-y-0 scale-100';

  return (
    <div
      ref={ref}
      dir={dir}
      className={`transition-all duration-700 ease-out ${visible ? shown : hidden} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
