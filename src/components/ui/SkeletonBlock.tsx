import { cn } from '@/lib/shared/designSystem';

interface SkeletonBlockProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export default function SkeletonBlock({ className, rounded = 'md' }: SkeletonBlockProps) {
  const roundedClass =
    rounded === 'sm'
      ? 'rounded'
      : rounded === 'md'
        ? 'rounded-md'
        : rounded === 'lg'
          ? 'rounded-lg'
          : rounded === 'xl'
            ? 'rounded-xl'
            : rounded === '2xl'
              ? 'rounded-2xl'
              : rounded === 'full'
                ? 'rounded-full'
                : 'rounded-md';

  return (
    <div className={cn('bg-[var(--border-default)] animate-pulse', roundedClass, className)} />
  );
}

