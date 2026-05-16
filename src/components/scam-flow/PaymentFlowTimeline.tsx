'use client';

import Link from 'next/link';
import { PaymentFlowEvent } from '@/lib/stellar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import PaymentFlowAccountIdentity from '@/components/scam-flow/PaymentFlowAccountIdentity';

interface PaymentFlowTimelineProps {
  events: PaymentFlowEvent[];
}

function shorten(value: string | null | undefined, head = 6, tail = 6): string {
  if (!value) return 'unknown';
  return value.length <= head + tail + 3 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'unknown time';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(value: string | null, asset: string): string {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return `0 ${asset}`;
  return `${numericValue.toLocaleString(undefined, { maximumFractionDigits: 7 })} ${asset}`;
}

function directionMeta(direction: PaymentFlowEvent['direction']) {
  if (direction === 'incoming') {
    return {
      label: 'Incoming',
      variant: 'success' as const,
      color: 'var(--success)',
      iconPath: 'M19 14l-7 7m0 0l-7-7m7 7V3',
    };
  }
  if (direction === 'outgoing') {
    return {
      label: 'Outgoing',
      variant: 'error' as const,
      color: 'var(--error)',
      iconPath: 'M5 10l7-7m0 0l7 7m-7-7v18',
    };
  }
  return {
    label: 'Related',
    variant: 'info' as const,
    color: 'var(--info)',
    iconPath: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  };
}

export default function PaymentFlowTimeline({ events }: PaymentFlowTimelineProps) {
  return (
    <Card className="shadow-sm">
      <div className="flex flex-col gap-1 border-b border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Event timeline</h2>
          <p className="text-xs text-[var(--text-muted)]">Latest matching payment-flow events from the indexed dataset.</p>
        </div>
        {events.length > 0 && (
          <span className="text-[11px] tabular-nums text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-secondary)]">{events.length.toLocaleString()}</span> {events.length === 1 ? 'event' : 'events'}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-muted)]">No timeline rows to display.</p>
        </div>
      ) : (
        <div className="max-h-[760px] divide-y divide-[var(--border-default)] overflow-y-auto">
          {events.map((event) => {
            const meta = directionMeta(event.direction);
            const primaryAmount = event.destinationAmount ?? event.sourceAmount;
            const primaryAsset = event.destinationAsset?.display || event.sourceAsset?.display || 'asset';

            return (
              <div
                key={event.id}
                className="relative grid gap-3 p-4 transition-colors hover:bg-[var(--bg-tertiary)] lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <span
                  className="absolute inset-y-3 left-0 w-0.5 rounded-r"
                  style={{ background: meta.color }}
                  aria-hidden
                />
                <div className="min-w-0 pl-2">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                        color: meta.color,
                      }}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d={meta.iconPath} />
                      </svg>
                      {meta.label}
                    </span>
                    <Badge>{event.operationType.replaceAll('_', ' ')}</Badge>
                    {event.memo && <Badge variant="warning">Memo</Badge>}
                    {!event.successful && <Badge variant="error">Failed</Badge>}
                  </div>

                  <div className="grid gap-2 text-xs md:grid-cols-[1fr_auto_1fr] md:items-center">
                    {event.fromAddress ? (
                      <PaymentFlowAccountIdentity address={event.fromAddress} account={event.fromAccount} compact />
                    ) : (
                      <span className="min-w-0 font-mono text-[var(--text-muted)]">unknown</span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="hidden h-px w-8 bg-[var(--border-default)] md:block" />
                      <span
                        className="rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                        style={{
                          background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                          color: meta.color,
                        }}
                      >
                        {formatAmount(primaryAmount, primaryAsset)}
                      </span>
                      <svg
                        className="hidden h-3 w-3 md:block"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: meta.color }}
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                    {event.toAddress ? (
                      <PaymentFlowAccountIdentity address={event.toAddress} account={event.toAccount} align="right" compact />
                    ) : (
                      <span className="min-w-0 font-mono text-[var(--text-muted)] md:text-right">unknown</span>
                    )}
                  </div>

                  {event.sourceAccount && event.sourceAccount !== event.fromAddress && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Source
                      </span>
                      <PaymentFlowAccountIdentity address={event.sourceAccount} account={event.sourceAccountMetadata} compact />
                    </div>
                  )}

                  {event.memo && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning-muted)] px-3 py-2 text-xs">
                      <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {event.memoType ?? 'memo'}
                        </span>
                        <span className="break-all font-mono text-[var(--text-secondary)]">{event.memo}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-row items-center justify-between gap-4 text-xs lg:flex-col lg:items-end lg:gap-1 lg:text-right">
                  <div className="text-[var(--text-tertiary)]">{formatDate(event.closedAt)}</div>
                  <div className="flex items-center gap-3 lg:flex-col lg:items-end lg:gap-1">
                    <Link
                      href={`/ledger/${event.ledger}`}
                      className="inline-flex items-center gap-1 font-mono text-[var(--text-secondary)] hover:text-[var(--primary-blue)]"
                    >
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">L</span>
                      {event.ledger.toLocaleString()}
                    </Link>
                    <Link
                      href={`/tx/${event.txHash}`}
                      className="inline-flex items-center gap-1 font-mono text-[var(--text-secondary)] hover:text-[var(--primary-blue)]"
                    >
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Tx</span>
                      {shorten(event.txHash, 5, 5)}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
