'use client';

import Link from 'next/link';
import type { PaymentFlowEvent } from '@/lib/stellar';
import { shortenAddress } from '@/lib/stellar';
import Card from '@/components/ui/Card';
import InfoTooltip from '@/components/InfoTooltip';
import CompactAmount from '@/components/scam-flow/CompactAmount';

const tableHeaderClass = 'px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap';

function formatAsset(eventAsset: PaymentFlowEvent['sourceAsset']): string {
  return eventAsset.display || eventAsset.code || eventAsset.key;
}

function formatEventDate(value: string | null): string {
  if (!value) return 'Unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';

  return date.toLocaleString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function AccountLink({ address }: { address: string | null }) {
  if (!address) return <span className="text-[var(--text-muted)]">Unknown</span>;

  return (
    <Link
      href={`/account/${address}`}
      aria-label={`Open account ${address}`}
      title={address}
      className="rounded font-mono text-[12px] text-[var(--text-secondary)] hover:text-sky-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]"
    >
      {shortenAddress(address, 5)}
    </Link>
  );
}

function EventAmount({ event }: { event: PaymentFlowEvent }) {
  const isSameAmount = event.sourceAmount === event.destinationAmount
    && event.sourceAsset.key === event.destinationAsset.key;

  if (isSameAmount) {
    return <CompactAmount value={event.sourceAmount} asset={formatAsset(event.sourceAsset)} />;
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <CompactAmount value={event.sourceAmount} asset={formatAsset(event.sourceAsset)} />
      <span className="text-[var(--text-muted)]" aria-hidden="true">→</span>
      <CompactAmount value={event.destinationAmount} asset={formatAsset(event.destinationAsset)} />
    </span>
  );
}

export default function PaymentFlowEvidenceTable({ events }: { events: PaymentFlowEvent[] }) {
  return (
    <Card className="overflow-hidden shadow-sm">
      {events.length === 0 ? (
        <p role="status" className="p-6 text-sm text-[var(--text-secondary)]">No indexed payment-flow events match these filters. Other activity may exist outside this result.</p>
      ) : (
        <div
          role="region"
          aria-label="Individual payment events"
          tabIndex={0}
          className="max-h-[680px] overflow-auto focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]"
        >
          <table className="w-full min-w-[1120px] text-left">
            <caption className="sr-only">Individual payment-flow events for the current result page.</caption>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                <th scope="col" className={`${tableHeaderClass} pl-4`}>Transaction</th>
                <th scope="col" className={tableHeaderClass}>Method</th>
                <th scope="col" className={`${tableHeaderClass} text-right`}>Ledger</th>
                <th scope="col" className={tableHeaderClass}>Date · UTC</th>
                <th scope="col" className={tableHeaderClass}>From</th>
                <th scope="col" className="w-8 px-1 py-3"><span className="sr-only">Flow direction</span></th>
                <th scope="col" className={tableHeaderClass}>To</th>
                <th scope="col" className={`${tableHeaderClass} pr-4 text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {events.map((event) => (
                <tr key={event.id} className="transition-colors hover:bg-sky-50/30">
                  <td className="py-3 pl-4 pr-3">
                    <Link
                      href={`/tx/${event.txHash}`}
                      aria-label={`Open transaction ${event.txHash}`}
                      title={event.txHash}
                      className="rounded font-mono text-[12px] text-sky-600 hover:text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]"
                    >
                      {shortenAddress(event.txHash, 5)}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-0.5">
                      <span className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--text-secondary)]">
                        {event.operationType.replaceAll('_', ' ')}
                      </span>
                      <InfoTooltip
                        ariaLabel="Show operation ID"
                        align="start"
                        content={<span><span className="block font-semibold">Operation ID</span><span className="mt-1 block break-all font-mono">{event.operationId}</span></span>}
                      />
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/ledger/${event.ledger}`} className="font-mono text-[12px] text-sky-600 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
                      {event.ledger.toLocaleString()}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--text-secondary)]">{formatEventDate(event.closedAt)}</td>
                  <td className="px-3 py-3"><AccountLink address={event.fromAddress} /></td>
                  <td className="px-1 py-3 text-center">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-500">
                      <svg className="h-3 w-3" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </td>
                  <td className="px-3 py-3"><AccountLink address={event.toAddress} /></td>
                  <td className="py-3 pl-3 pr-4 text-right font-mono text-[12px] tabular-nums text-[var(--text-primary)]">
                    <EventAmount event={event} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
