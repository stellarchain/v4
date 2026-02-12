import type { ReactNode } from 'react';
import { cn } from '@/lib/shared/designSystem';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
}

export default function Badge({ children, className, variant = 'neutral' }: BadgeProps) {
  const variantClass =
    variant === 'info'
      ? 'bg-[var(--info-muted)] text-[var(--info)] border border-[var(--info)]/20'
      : variant === 'success'
        ? 'bg-[var(--success-muted)] text-[var(--success)] border border-[var(--success)]/20'
        : variant === 'warning'
          ? 'bg-[var(--warning-muted)] text-[var(--warning)] border border-[var(--warning)]/20'
          : variant === 'error'
            ? 'bg-[var(--error-muted)] text-[var(--error)] border border-[var(--error)]/20'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--border-default)]';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
        variantClass,
        className
      )}
    >
      {children}
    </span>
  );
}

