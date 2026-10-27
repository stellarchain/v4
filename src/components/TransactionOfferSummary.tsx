import { getOfferPresentation, type OfferOperation } from '@/lib/shared/offerPresentation';

export default function TransactionOfferSummary({ operations }: { operations: OfferOperation[] }) {
  return (
    <section aria-label="Offer operations" className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Manage offers</h2>
      {operations.map((operation) => {
        const offer = getOfferPresentation(operation);
        return <div key={operation.id} className="rounded-xl bg-[var(--bg-primary)] p-3">
        <p className="mb-3 text-xs font-mono text-[var(--text-muted)]">Offer {String(operation.offer_id ?? '—')}</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
          <div><dt className="text-xs text-[var(--text-muted)]">Selling</dt><dd className="font-medium text-[var(--text-primary)]">{offer.sellingAmount} {offer.selling}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">Buying</dt><dd className="font-medium text-[var(--text-primary)]">{offer.buyingAmount} {offer.buying}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">Price</dt><dd className="font-medium text-[var(--text-primary)]">{String(operation.price ?? '—')} {offer.priceUnit}</dd></div>
        </dl>
      </div>;
      })}
    </section>
  );
}
