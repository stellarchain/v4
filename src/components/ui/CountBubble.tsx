import { cn } from '@/lib/design-system';

interface CountBubbleProps {
  value: number | string;
  className?: string;
  title?: string;
}

export default function CountBubble({ value, className, title }: CountBubbleProps) {
  return (
    <span
      title={title}
      className={cn(
        'text-[10px] px-1.5 h-[18px] rounded-full flex items-center justify-center bg-[var(--primary-blue)] text-white font-bold min-w-[18px]',
        className
      )}
    >
      {value}
    </span>
  );
}

