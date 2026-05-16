'use client';

import Link from 'next/link';
import { PaymentFlowInvestigationResponse, PaymentFlowCounterparty } from '@/lib/stellar';
import Card from '@/components/ui/Card';
import PaymentFlowAccountIdentity from '@/components/scam-flow/PaymentFlowAccountIdentity';

interface PaymentFlowMapProps {
  investigation: PaymentFlowInvestigationResponse;
}

function formatAmount(value: string | number | null | undefined): string {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue === 0) return '0';
  if (Math.abs(numericValue) >= 1_000_000_000) return `${(numericValue / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(numericValue) >= 1_000_000) return `${(numericValue / 1_000_000).toFixed(2)}M`;
  if (Math.abs(numericValue) >= 1_000) return `${(numericValue / 1_000).toFixed(2)}K`;
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function flowValueLabel(value: string, assets: string[]): string {
  if (Number(value) > 0) return `${formatAmount(value)} XLM`;
  if (assets.length === 0) return 'assets';
  return assets.slice(0, 3).join(', ');
}

function CounterpartyRow({
  counterparty,
  variant,
  maxEvents,
}: {
  counterparty: PaymentFlowCounterparty;
  variant: 'incoming' | 'outgoing';
  maxEvents: number;
}) {
  const isIncoming = variant === 'incoming';
  const accentColor = isIncoming ? 'var(--success)' : 'var(--error)';
  const events = isIncoming ? counterparty.incoming : counterparty.outgoing;
  const widthPct = maxEvents > 0 ? Math.max(8, (events / maxEvents) * 100) : 12;
  const valueLabel = isIncoming
    ? flowValueLabel(counterparty.nativeReceived, counterparty.assets)
    : flowValueLabel(counterparty.nativeSent, counterparty.assets);

  return (
    <Link
      href={`/account/${counterparty.address}`}
      className="block rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]"
    >
      <div className="flex items-center justify-between gap-2">
        <PaymentFlowAccountIdentity address={counterparty.address} account={counterparty.account} compact link={false} />
        <span
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums"
          style={{ color: accentColor }}
        >
          {isIncoming ? '+' : '−'}{valueLabel}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${widthPct}%`, background: accentColor }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--text-tertiary)]">
        {events} {isIncoming ? 'incoming' : 'outgoing'} {events === 1 ? 'event' : 'events'}
      </p>
    </Link>
  );
}

export default function PaymentFlowMap({ investigation }: PaymentFlowMapProps) {
  const focusAddress = investigation.query.address;
  const incoming = investigation.counterparties
    .filter((counterparty) => counterparty.incoming > 0)
    .slice(0, 6);
  const outgoing = investigation.counterparties
    .filter((counterparty) => counterparty.outgoing > 0)
    .slice(0, 6);
  const topEdges = investigation.graph.edges.slice(0, 8);
  const maxIncoming = Math.max(1, ...incoming.map((c) => c.incoming));
  const maxOutgoing = Math.max(1, ...outgoing.map((c) => c.outgoing));

  if (investigation.events.length === 0) {
    return (
      <Card className="p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.5M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">No indexed flow found</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              The target is not present in the currently collected payment-flow dataset.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!focusAddress) {
    return (
      <Card className="shadow-sm">
        <div className="border-b border-[var(--border-default)] p-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Transaction flow</h2>
          <p className="text-xs text-[var(--text-muted)]">Transfers extracted from the selected transaction.</p>
        </div>
        <div className="space-y-2 p-4">
          {topEdges.map((edge) => (
            <div
              key={`${edge.source}-${edge.target}`}
              className="grid items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 text-xs md:grid-cols-[1fr_auto_1fr]"
            >
              <PaymentFlowAccountIdentity address={edge.source} account={investigation.accounts[edge.source] ?? null} compact />
              <span className="inline-flex items-center gap-1.5 text-[var(--text-tertiary)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                {edge.count} {edge.count === 1 ? 'transfer' : 'transfers'}
              </span>
              <PaymentFlowAccountIdentity address={edge.target} account={investigation.accounts[edge.target] ?? null} align="right" compact />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <div className="flex flex-col gap-1 border-b border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Payment flow map</h2>
          <p className="text-xs text-[var(--text-muted)]">Top counterparties in the returned sample.</p>
        </div>
        <div className="text-[11px] tabular-nums text-[var(--text-tertiary)]">
          <span className="font-medium text-[var(--text-secondary)]">{investigation.graph.nodes.length.toLocaleString()}</span> nodes ·{' '}
          <span className="font-medium text-[var(--text-secondary)]">{investigation.graph.edges.length.toLocaleString()}</span> edges
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success-muted)] text-[var(--success)]">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Incoming</span>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">{incoming.length}</span>
          </div>
          <div className="space-y-2">
            {incoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] p-3 text-xs text-[var(--text-muted)]">
                No incoming rows in this sample.
              </div>
            ) : (
              incoming.map((counterparty) => (
                <CounterpartyRow
                  key={`in-${counterparty.address}`}
                  counterparty={counterparty}
                  variant="incoming"
                  maxEvents={maxIncoming}
                />
              ))
            )}
          </div>
        </section>

        <aside className="lg:w-60">
          <div className="rounded-2xl border border-[var(--primary-blue)]/30 bg-gradient-to-b from-[var(--info-muted)] to-transparent p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--primary-blue)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3zm0 0v10m-5-3a5 5 0 0110 0" />
              </svg>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Focus address</div>
            <PaymentFlowAccountIdentity
              address={focusAddress}
              account={investigation.accountContext.focusAccount}
              align="center"
              showActivity
              className="mt-1"
            />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[var(--bg-secondary)] px-2 py-1.5">
                <div className="font-mono font-semibold tabular-nums text-[var(--success)]">
                  {investigation.summary.incomingEvents}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">in</div>
              </div>
              <div className="rounded-lg bg-[var(--bg-secondary)] px-2 py-1.5">
                <div className="font-mono font-semibold tabular-nums text-[var(--error)]">
                  {investigation.summary.outgoingEvents}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">out</div>
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--error-muted)] text-[var(--error)]">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Outgoing</span>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">{outgoing.length}</span>
          </div>
          <div className="space-y-2">
            {outgoing.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] p-3 text-xs text-[var(--text-muted)]">
                No outgoing rows in this sample.
              </div>
            ) : (
              outgoing.map((counterparty) => (
                <CounterpartyRow
                  key={`out-${counterparty.address}`}
                  counterparty={counterparty}
                  variant="outgoing"
                  maxEvents={maxOutgoing}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </Card>
  );
}
