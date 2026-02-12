'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/shared/designSystem';
import CountBubble from '@/components/ui/CountBubble';

export type GliderTab<TId extends string> = {
  id: TId;
  label: ReactNode;
  count?: number;
  right?: ReactNode;
  disabled?: boolean;
};

interface GliderTabsProps<TId extends string> {
  tabs: readonly GliderTab<TId>[];
  activeId: TId;
  onChange: (id: TId) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function GliderTabs<TId extends string>({
  tabs,
  activeId,
  onChange,
  className,
  size = 'sm',
}: GliderTabsProps<TId>) {
  const activeTabIndex = tabs.findIndex(tab => tab.id === activeId);
  const tabCount = tabs.length;

  const buttonBase = cn(
    'relative z-10 flex-1 rounded-lg transition-colors duration-200 text-center flex items-center justify-center',
    size === 'sm' ? 'py-1.5 text-[11px] gap-1' : 'py-2 text-sm gap-2'
  );

  return (
    <div
      role="tablist"
      className={cn(
        'relative flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl shadow-sm border border-[var(--border-subtle)]',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute top-1 bottom-1 bg-[var(--primary-blue)]/10 rounded-lg transition-transform duration-300 ease-out z-0"
        style={{
          left: '4px',
          width: `calc((100% - 8px) / ${tabCount})`,
          transform: `translateX(${activeTabIndex >= 0 ? activeTabIndex * 100 : 0}%)`,
          opacity: activeTabIndex >= 0 ? 1 : 0,
        }}
      />

      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const disabled = !!tab.disabled;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(tab.id);
            }}
            className={cn(
              buttonBase,
              isActive
                ? 'text-[var(--primary-blue)] font-bold'
                : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)]',
              disabled && 'opacity-50 cursor-not-allowed hover:text-[var(--text-secondary)]'
            )}
          >
            {tab.label}
            {tab.right ?? (tab.count !== undefined ? <CountBubble value={tab.count} /> : null)}
          </button>
        );
      })}
    </div>
  );
}

