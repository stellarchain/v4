import type { ReactNode } from 'react';
import { cn, containers } from '@/lib/shared/designSystem';

type CardVariant = 'default' | 'bordered' | 'list' | 'compact';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
}

export default function Card({ children, className, variant = 'default' }: CardProps) {
  const base =
    variant === 'list'
      ? containers.cardList
      : variant === 'bordered'
        ? containers.cardBordered
        : variant === 'compact'
          ? containers.cardCompact
          : containers.card;

  return (
    <div className={cn(base, className)}>
      {children}
    </div>
  );
}

