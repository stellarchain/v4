'use client';

import Link from 'next/link';
import type { PaymentFlowEvent } from '@/lib/stellar';
import Card from '@/components/ui/Card';

export default function PaymentFlowEvidenceTable({ events }: { events: PaymentFlowEvent[] }) {
  const groups = new Map<string, PaymentFlowEvent[]>();
  for (const event of events) {
    const group = groups.get(event.txHash) ?? [];
    group.push(event);
    groups.set(event.txHash, group);
  }

  return (
    <Card>
      <div className="border-b border-[var(--border-default)] p-4">
        <h2 id="investigation-evidence-title" className="font-semibold text-[var(--text-primary)]">Transaction evidence</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Grouped within this page only; a transaction may continue on another page. Scroll horizontally for all fields.</p>
      </div>
      {events.length === 0 ? (
        <p role="status" className="p-6 text-sm text-[var(--text-secondary)]">No indexed payment-flow events match these filters. This does not establish that the account has no activity.</p>
      ) : (
        <div role="region" aria-labelledby="investigation-evidence-title" tabIndex={0} className="max-h-[680px] overflow-auto focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
          <table className="w-full min-w-[1050px] text-left text-xs text-[var(--text-secondary)]">
            <caption className="sr-only">Payment-flow evidence for the current page. Exact amounts and UTC times.</caption>
            <thead className="bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
              <tr>{['Transaction / UTC time', 'Operation', 'From → To', 'Source amount / asset', 'Destination amount / asset'].map((label) => <th scope="col" key={label} className="p-3 font-semibold">{label}</th>)}</tr>
            </thead>
            {[...groups].map(([hash, rows]) => (
              <tbody key={hash} className="border-t border-[var(--border-default)]">
                {rows.map((event, index) => (
                  <tr key={event.id} className="align-top hover:bg-[var(--bg-tertiary)]">
                    {index === 0 && <th scope="rowgroup" rowSpan={rows.length} className="w-64 p-3 text-left font-normal">
                      <Link href={`/tx/${hash}`} className="break-all font-mono text-[var(--primary-blue)] underline focus-visible:outline-2">{hash}</Link>
                      <p className="mt-2">{event.closedAt ?? 'Unknown time'}</p>
                      <p>Ledger {event.ledger}</p>
                    </th>}
                    <td className="p-3"><p>{event.operationType.replaceAll('_', ' ')}</p><p className="mt-1 font-mono">{event.operationId}</p></td>
                    <td className="max-w-64 break-all p-3 font-mono"><p>{event.fromAddress ?? 'Unknown'}</p><p className="my-1" aria-hidden>↓</p><p>{event.toAddress ?? 'Unknown'}</p></td>
                    <td className="max-w-52 break-all p-3 font-mono"><p>{event.sourceAmount ?? 'Unknown'}</p><p className="mt-1">{event.sourceAsset.key}</p></td>
                    <td className="max-w-52 break-all p-3 font-mono"><p>{event.destinationAmount ?? 'Unknown'}</p><p className="mt-1">{event.destinationAsset.key}</p></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </Card>
  );
}
