'use client';

import Link from 'next/link';
import { PaymentFlowAccountMetadata } from '@/lib/stellar';
import Badge from '@/components/ui/Badge';

interface PaymentFlowAccountIdentityProps {
  address: string | null | undefined;
  account?: PaymentFlowAccountMetadata | null;
  align?: 'left' | 'right' | 'center';
  compact?: boolean;
  showActivity?: boolean;
  link?: boolean;
  className?: string;
}

function shortenAddress(address: string | null | undefined, head = 6, tail = 6): string {
  if (!address) return 'unknown';
  return address.length <= head + tail + 3 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No data';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCount(value: string | number | null | undefined): string {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return '0';
  if (Math.abs(numericValue) >= 1_000_000) return `${(numericValue / 1_000_000).toFixed(1)}M`;
  if (Math.abs(numericValue) >= 1_000) return `${(numericValue / 1_000).toFixed(1)}K`;
  return numericValue.toLocaleString();
}

export default function PaymentFlowAccountIdentity({
  address,
  account,
  align = 'left',
  compact = false,
  showActivity = false,
  link = true,
  className = '',
}: PaymentFlowAccountIdentityProps) {
  const displayName = account?.label || shortenAddress(address);
  const hasLabel = Boolean(account?.label);
  const alignmentClass =
    align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const labelClass = hasLabel ? 'font-semibold text-[var(--text-primary)]' : 'font-mono font-medium text-[var(--text-secondary)]';
  const body = (
    <span className={`flex min-w-0 flex-col ${alignmentClass} ${className}`}>
      <span className="flex max-w-full items-center gap-1.5">
        <span className={`min-w-0 truncate text-xs ${labelClass}`}>{displayName}</span>
        {account?.verified && <Badge variant="success" className="shrink-0 px-1.5">Verified</Badge>}
        {!account?.verified && hasLabel && <Badge variant="info" className="shrink-0 px-1.5">Label</Badge>}
      </span>
      {hasLabel && (
        <span className="mt-0.5 max-w-full truncate font-mono text-[10px] text-[var(--text-muted)]">
          {shortenAddress(address)}
        </span>
      )}
      {showActivity && account && (
        <span className={`mt-2 grid gap-1 text-[10px] text-[var(--text-tertiary)] ${compact ? '' : 'sm:grid-cols-2'}`}>
          <span>
            <span className="uppercase tracking-wider">First tx</span>{' '}
            <span className="text-[var(--text-secondary)]">{formatDate(account.firstTransactionAt)}</span>
          </span>
          <span>
            <span className="uppercase tracking-wider">Last tx</span>{' '}
            <span className="text-[var(--text-secondary)]">{formatDate(account.lastTransactionAt)}</span>
          </span>
          <span>
            <span className="uppercase tracking-wider">Payments</span>{' '}
            <span className="font-mono text-[var(--text-secondary)]">{formatCount(account.paymentsCount)}</span>
          </span>
          {Number(account.tradesCount) > 0 && (
            <span>
              <span className="uppercase tracking-wider">Trades</span>{' '}
              <span className="font-mono text-[var(--text-secondary)]">{formatCount(account.tradesCount)}</span>
            </span>
          )}
          {account.rankPosition !== null && (
            <span>
              <span className="uppercase tracking-wider">Rank</span>{' '}
              <span className="font-mono text-[var(--text-secondary)]">#{account.rankPosition.toLocaleString()}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!address || !link) {
    return body;
  }

  return (
    <Link href={`/account/${address}`} className="block min-w-0 hover:text-[var(--primary-blue)]" title={address}>
      {body}
    </Link>
  );
}
