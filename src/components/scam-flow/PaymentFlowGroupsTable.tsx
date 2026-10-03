'use client';

import Link from 'next/link';
import type { PaymentFlowGroup } from '@/lib/stellar';
import { shortenAddress } from '@/lib/stellar';
import Card from '@/components/ui/Card';
import InfoTooltip from '@/components/InfoTooltip';
import CompactAmount from '@/components/scam-flow/CompactAmount';

const tableHeaderClass = 'px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap';

type FlowAsset = PaymentFlowGroup['sourceAsset'];

function formatAsset(asset: FlowAsset): string {
  return asset.display || asset.code || asset.key;
}

function hasSingleAmount(group: PaymentFlowGroup): boolean {
  return group.sourceAmountTotal === group.destinationAmountTotal
    && group.sourceAsset.key === group.destinationAsset.key;
}

function formatObservedDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatObservedRange(group: PaymentFlowGroup): string {
  const first = formatObservedDate(group.firstClosedAt);
  const last = formatObservedDate(group.lastClosedAt);

  if (!first && !last) return 'Date unavailable';
  if (!first || first === last) return first ?? last ?? 'Date unavailable';

  return `${first} – ${last}`;
}

function directionStyles(direction: PaymentFlowGroup['direction']): string {
  if (direction === 'incoming') {
    return 'border-[var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]';
  }

  if (direction === 'outgoing') {
    return 'border-[var(--error)]/20 bg-[var(--error-muted)] text-[var(--error)]';
  }

  return 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
}

function AccountLink({ address }: { address: string | null }) {
  if (!address) {
    return <span className="text-[12px] text-[var(--text-muted)]">Unknown</span>;
  }

  return (
    <Link
      href={`/account/${address}`}
      aria-label={`Open account ${address}`}
      title={address}
      className="rounded font-mono text-[12px] text-[var(--text-secondary)] transition-colors hover:text-sky-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]"
    >
      {shortenAddress(address, 5)}
    </Link>
  );
}

function FlowAmount({ group }: { group: PaymentFlowGroup }) {
  if (hasSingleAmount(group)) {
    return (
      <CompactAmount
        value={group.sourceAmountTotal}
        asset={formatAsset(group.sourceAsset)}
        className="whitespace-nowrap"
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <CompactAmount value={group.sourceAmountTotal} asset={formatAsset(group.sourceAsset)} />
      <span className="text-[var(--text-muted)]" aria-hidden="true">→</span>
      <CompactAmount value={group.destinationAmountTotal} asset={formatAsset(group.destinationAsset)} />
    </span>
  );
}

function ObservedRange({ group }: { group: PaymentFlowGroup }) {
  return (
    <div className="flex items-center gap-1">
      <span className="whitespace-nowrap text-[12px] text-[var(--text-secondary)]">
        {formatObservedRange(group)}
      </span>
      <InfoTooltip
        ariaLabel="Show exact observed range"
        align="end"
        content={(
          <span className="space-y-1">
            <span className="block font-semibold">Exact observed range</span>
            <span className="block font-mono">Ledgers {group.firstLedger.toLocaleString()}–{group.lastLedger.toLocaleString()}</span>
            <span className="block break-all font-mono">{group.firstClosedAt ?? 'Start time unavailable'}</span>
            <span className="block break-all font-mono">{group.lastClosedAt ?? 'End time unavailable'}</span>
          </span>
        )}
      />
    </div>
  );
}

export default function PaymentFlowGroupsTable({ groups }: { groups?: PaymentFlowGroup[] }) {
  return (
    <Card className="overflow-hidden shadow-sm">
      {groups === undefined ? (
        <p role="status" className="p-6 text-sm text-[var(--text-secondary)]">Grouped flows are unavailable from this API version. Transaction evidence remains available below.</p>
      ) : groups.length === 0 ? (
        <p role="status" className="p-6 text-sm text-[var(--text-secondary)]">No flows on this page for the selected filters.</p>
      ) : (
        <div
          role="region"
          aria-label="Grouped payment flows"
          tabIndex={0}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]"
        >
          <table className="w-full min-w-[980px] text-left">
            <caption className="sr-only">Grouped payment flows from the current evidence page, with exact amounts by asset pair.</caption>
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
                <th scope="col" className={`${tableHeaderClass} pl-4`}>From</th>
                <th scope="col" className="w-8 px-1 py-3"><span className="sr-only">Flow direction</span></th>
                <th scope="col" className={tableHeaderClass}>To</th>
                <th scope="col" className={tableHeaderClass}>Direction</th>
                <th scope="col" className={`${tableHeaderClass} text-right`}>Events</th>
                <th scope="col" className={`${tableHeaderClass} text-right`}>
                  <span className="inline-flex items-center justify-end gap-0.5">
                    Amount
                    <InfoTooltip
                      ariaLabel="About grouped flow amounts"
                      direction="bottom"
                      align="end"
                      content="One value is shown when the sent and received asset match. Asset conversions show both exact values. Unknown means at least one indexed event has no recorded amount."
                    />
                  </span>
                </th>
                <th scope="col" className={`${tableHeaderClass} pr-4`}>Observed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {groups.map((group, index) => (
                <tr
                  key={`${group.fromAddress}-${group.toAddress}-${group.direction}-${group.sourceAsset.key}-${group.destinationAsset.key}-${index}`}
                  className="transition-colors hover:bg-sky-50/30"
                >
                  <td className="py-3 pl-4 pr-3"><AccountLink address={group.fromAddress} /></td>
                  <td className="px-1 py-3 text-center">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-500">
                      <svg className="h-3 w-3" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </td>
                  <td className="px-3 py-3"><AccountLink address={group.toAddress} /></td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium capitalize ${directionStyles(group.direction)}`}>
                      {group.direction}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums text-[var(--text-primary)]">
                    {group.events.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums text-[var(--text-primary)]">
                    <FlowAmount group={group} />
                  </td>
                  <td className="py-3 pl-3 pr-4"><ObservedRange group={group} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
