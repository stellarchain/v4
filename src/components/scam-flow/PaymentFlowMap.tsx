'use client';

import Link from 'next/link';
import { PaymentFlowInvestigationResponse, PaymentFlowCounterparty } from '@/lib/stellar';
import Card from '@/components/ui/Card';
import PaymentFlowAccountIdentity from '@/components/scam-flow/PaymentFlowAccountIdentity';
import CompactAmount from '@/components/scam-flow/CompactAmount';
import { formatExactAmount } from '@/lib/shared/formatExactAmount';

interface PaymentFlowMapProps {
  investigation: PaymentFlowInvestigationResponse;
}

type CandidatePath = NonNullable<PaymentFlowInvestigationResponse['trace']>['candidatePaths'][number];

function CandidatePathRow({
  path,
  investigation,
}: {
  path: CandidatePath;
  investigation: PaymentFlowInvestigationResponse;
}) {
  const source = path.accounts[0];
  const via = path.accounts[1];
  const target = path.accounts[2];
  if (!source || !via || !target) return null;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
      <div className="grid gap-2 text-xs md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <PaymentFlowAccountIdentity address={source} account={investigation.accounts[source] ?? null} />
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">→</span>
        <PaymentFlowAccountIdentity address={via} account={investigation.accounts[via] ?? null} align="center" />
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">→</span>
        <PaymentFlowAccountIdentity address={target} account={investigation.accounts[target] ?? null} align="right" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-secondary)]">
        <span className="font-mono text-[var(--text-primary)]">{path.asset.display}</span>
        <span>ledgers {path.firstLedger.toLocaleString()}–{path.lastLedger.toLocaleString()}</span>
        <span>{path.direction}</span>
        {path.containsConversion && <span>contains path-payment conversion</span>}
        {!path.amountsKnown && <span>one or more amounts unavailable</span>}
      </div>
    </div>
  );
}

function hasKnownFlowValue(value: string): boolean {
  const amount = formatExactAmount(value);
  return amount !== 'Unknown' && amount !== '0';
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
  const value = isIncoming ? counterparty.nativeReceived : counterparty.nativeSent;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/account/${counterparty.address}`} className="min-w-0 rounded text-[var(--primary-blue)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
          <PaymentFlowAccountIdentity address={counterparty.address} account={counterparty.account} link={false} />
        </Link>
        {hasKnownFlowValue(value) ? (
          <CompactAmount
            value={value}
            asset="XLM"
            prefix={isIncoming ? '+' : '−'}
            className={`whitespace-nowrap text-right text-[11px] font-semibold tabular-nums ${isIncoming ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}
          />
        ) : (
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Amount unavailable</span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${widthPct}%`, background: accentColor }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <p className="text-[var(--text-secondary)]">
          {events} {events === 1 ? 'event' : 'events'}
        </p>
        <Link href={`/investigate/${counterparty.address}?direction=both`} className="inline-flex min-h-8 items-center rounded px-1 text-xs font-medium text-[var(--primary-blue)] underline hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
          Inspect ↗
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFlowMap({ investigation }: PaymentFlowMapProps) {
  const focusAddress = investigation.query.address;
  const trace = investigation.trace;
  const isTwoHop = trace?.depthReturned === 2;
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
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">No matching indexed flow</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              No collected payment-flow events match this target and these filters. Other activity may exist outside the indexed history or selected range.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!focusAddress) {
    const isAssetTarget = investigation.query.targetType === 'asset';
    return (
      <Card className="shadow-sm">
        <div className="border-b border-[var(--border-default)] p-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{isAssetTarget ? 'Observed asset flows' : 'Transaction flow'}</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {isAssetTarget ? 'Top account-to-account edges on this indexed asset page.' : 'Transfers extracted from the selected transaction.'}
          </p>
        </div>
        <div className="space-y-2 p-4">
          {topEdges.map((edge) => (
            <div
              key={`${edge.source}-${edge.target}`}
              className="grid items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 text-xs md:grid-cols-[1fr_auto_1fr]"
            >
              <PaymentFlowAccountIdentity address={edge.source} account={investigation.accounts[edge.source] ?? null} />
              <span className="inline-flex items-center gap-1.5 text-[var(--text-tertiary)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                {edge.count} {edge.count === 1 ? 'transfer' : 'transfers'}
              </span>
              <PaymentFlowAccountIdentity address={edge.target} account={investigation.accounts[edge.target] ?? null} align="right" />
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
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{isTwoHop ? 'Two-hop activity' : 'Payment activity'}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{isTwoHop ? 'Possible paths within the selected range.' : 'Accounts that sent or received funds in this result.'}</p>
        </div>
        <div className="text-[11px] tabular-nums text-[var(--text-tertiary)]">
          <span className="font-medium text-[var(--text-secondary)]">{investigation.graph.edges.length.toLocaleString()}</span> connections
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--primary-blue)] ring-1 ring-[var(--border-default)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3zm0 0v10m-5-3a5 5 0 0110 0" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Checked account</div>
            <PaymentFlowAccountIdentity
              address={focusAddress}
              account={investigation.accountContext.focusAccount}
              className="mt-0.5"
            />
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="rounded-lg bg-[var(--bg-secondary)] px-3 py-1.5 text-center ring-1 ring-[var(--border-default)]">
            <span className="font-mono font-semibold tabular-nums text-[var(--success)]">{investigation.summary.incomingEvents}</span>
            <span className="ml-1 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">in</span>
          </div>
          <div className="rounded-lg bg-[var(--bg-secondary)] px-3 py-1.5 text-center ring-1 ring-[var(--border-default)]">
            <span className="font-mono font-semibold tabular-nums text-[var(--error)]">{investigation.summary.outgoingEvents}</span>
            <span className="ml-1 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">out</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:items-start">
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
          <div className="grid gap-2 sm:grid-cols-2">
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

      {isTwoHop && trace && (
        <section className="border-t border-[var(--border-default)] p-4" aria-labelledby="candidate-paths-heading">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 id="candidate-paths-heading" className="text-sm font-semibold text-[var(--text-primary)]">Candidate two-hop paths</h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-secondary)]">{trace.note}</p>
            </div>
            <div className="text-right text-[10px] tabular-nums text-[var(--text-tertiary)]">
              <div>{trace.candidatePaths.length.toLocaleString()} paths · {trace.frontierAccounts.toLocaleString()} frontier accounts</div>
              {trace.truncated && <div className="mt-1 font-medium text-[var(--warning)]">Bounded result · one or more branches were truncated</div>}
            </div>
          </div>
          {trace.candidatePaths.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-default)] p-4 text-xs text-[var(--text-secondary)]">
              No asset-continuous, time-ordered two-hop candidate appears inside the selected bounds and fan-out limits.
            </div>
          ) : (
            <div className="space-y-2">
              {trace.candidatePaths.slice(0, 12).map((path) => (
                <CandidatePathRow key={path.id} path={path} investigation={investigation} />
              ))}
            </div>
          )}
        </section>
      )}
    </Card>
  );
}
