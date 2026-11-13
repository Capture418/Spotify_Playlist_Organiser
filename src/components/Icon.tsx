import type { ReactNode } from 'react';

type IconName = 'search' | 'tag' | 'close' | 'arrow' | 'check' | 'select';
const shapes: Record<IconName, ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  tag: <><path d="M20.5 13 13 20.5a2 2 0 0 1-2.8 0L3 13.3V3h10.3l7.2 7.2a2 2 0 0 1 0 2.8Z" /><circle cx="8" cy="8" r="1" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M6 18 18 6M7 6h11v11" />,
  check: <path d="m5 12 4 4L19 6" />,
  select: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="m8 12 3 3 5-6" /></>,
};

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {shapes[name]}
    </svg>
  );
}
