'use client';

import type { PaymentFlowGroup } from '@/lib/stellar';
import Card from '@/components/ui/Card';

export default function PaymentFlowGroupsTable({ groups }: { groups?: PaymentFlowGroup[] }) {
  return (
    <Card>
      <div className="border-b border-[var(--border-default)] p-4">
        <h2 id="investigation-flow-groups-title" className="font-semibold text-[var(--text-primary)]">Grouped flows</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Source → destination, direction and asset pair on this page only. Amounts are exact; Unknown means at least one event has no recorded amount.
        </p>
      </div>
      {groups === undefined ? (
        <p role="status" className="p-6 text-sm text-[var(--text-secondary)]">Grouped flows are unavailable from this API version. Transaction evidence remains available below.</p>
      ) : groups.length === 0 ? (
        <p role="status" className="p-6 text-sm text-[var(--text-secondary)]">No flows on this page for the selected filters.</p>
      ) : (
        <div role="region" aria-labelledby="investigation-flow-groups-title" tabIndex={0}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
          <table className="w-full min-w-[1000px] text-left text-xs text-[var(--text-secondary)]">
            <caption className="sr-only">Grouped payment flows from the current evidence page; exact totals by asset pair.</caption>
            <thead className="bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
              <tr>
                {['From → To', 'Direction', 'Events', 'Source total / asset', 'Destination total / asset', 'Observed ledgers'].map((label) => (
                  <th scope="col" key={label} className="p-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => (
                <tr key={`${group.fromAddress}-${group.toAddress}-${group.direction}-${group.sourceAsset.key}-${group.destinationAsset.key}-${index}`}
                  className="border-t border-[var(--border-default)] align-top hover:bg-[var(--bg-tertiary)]">
                  <th scope="row" className="max-w-64 break-all p-3 text-left font-mono font-normal">
                    <p>{group.fromAddress ?? 'Unknown address'}</p>
                    <p className="my-1" aria-hidden="true">↓</p>
                    <p>{group.toAddress ?? 'Unknown address'}</p>
                  </th>
                  <td className="p-3 capitalize">{group.direction}</td>
                  <td className="p-3 font-mono tabular-nums">{group.events.toLocaleString()}</td>
                  <td className="max-w-44 break-all p-3 font-mono tabular-nums">
                    <p>{group.sourceAmountTotal ?? 'Unknown'}</p>
                    <p className="mt-1">{group.sourceAsset.key}</p>
                  </td>
                  <td className="max-w-44 break-all p-3 font-mono tabular-nums">
                    <p>{group.destinationAmountTotal ?? 'Unknown'}</p>
                    <p className="mt-1">{group.destinationAsset.key}</p>
                  </td>
                  <td className="p-3 font-mono tabular-nums">
                    <p>{group.firstLedger.toLocaleString()}–{group.lastLedger.toLocaleString()}</p>
                    <p className="mt-1">{group.firstClosedAt ?? 'Unknown UTC'} → {group.lastClosedAt ?? 'Unknown UTC'}</p>
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
