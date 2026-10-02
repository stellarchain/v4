'use client';

import InfoTooltip from '@/components/InfoTooltip';
import { formatCompactAmount } from '@/lib/shared/formatCompactAmount';
import { formatExactAmount } from '@/lib/shared/formatExactAmount';

interface CompactAmountProps {
  value: string | null | undefined;
  asset?: string;
  prefix?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export default function CompactAmount({
  value,
  asset,
  prefix = '',
  className = '',
  align = 'end',
}: CompactAmountProps) {
  const compact = formatCompactAmount(value);
  const exact = formatExactAmount(value);
  const suffix = asset ? ` ${asset}` : '';
  const displayValue = `${prefix}${compact}${suffix}`;

  if (compact === exact || exact === 'Unknown') {
    return <span className={className}>{displayValue}</span>;
  }

  return (
    <InfoTooltip
      ariaLabel={`Show exact amount: ${prefix}${exact}${suffix}`}
      align={align}
      className="-my-1"
      label={<span className={className}>{displayValue}</span>}
      content={(
        <span>
          <span className="block font-semibold">Exact amount</span>
          <span className="mt-1 block break-all font-mono tabular-nums">{prefix}{exact}{suffix}</span>
        </span>
      )}
    />
  );
}
