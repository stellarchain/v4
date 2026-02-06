import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/design-system';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'pill';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export default function Button({ children, className, variant = 'secondary', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClass =
    variant === 'primary'
      ? 'bg-[var(--info)] text-white font-semibold rounded-xl hover:opacity-90'
      : variant === 'ghost'
        ? 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl'
        : variant === 'pill'
          ? 'px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight whitespace-nowrap'
          : 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] font-semibold rounded-xl hover:bg-[var(--bg-tertiary)] shadow-sm';

  const padding = variant === 'pill' ? '' : 'px-4 py-2';

  return (
    <button className={cn(base, padding, variantClass, className)} {...props}>
      {children}
    </button>
  );
}

