import { cn } from '@/lib/shared/designSystem';

export interface SegmentedControlOption<T extends string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string | number> {
  ariaLabel: string;
  className?: string;
  onChange: (value: T) => void;
  options: Array<SegmentedControlOption<T>>;
  value: T;
}

export default function SegmentedControl<T extends string | number>({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex max-w-full overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-0.5', className)}
    >
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            aria-pressed={active}
            className={cn(
              'min-w-12 cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[4.75rem]',
              active
                ? 'bg-[var(--primary-blue)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
