import { formatContractObservation } from '@/lib/shared/contractOverview';

export default function ContractFirstSeen({ value, className = '' }: { value?: string | null; className?: string }) {
  const formatted = formatContractObservation(value);
  if (!formatted) return null;
  return (
    <div className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-3 ${className}`}>
      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)]">
        <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--primary-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
        <span>First seen (Orion)</span>
      </div>
      <time dateTime={value!} className="mt-2 block font-mono text-[11px] leading-relaxed text-[var(--text-primary)]">{formatted}</time>
    </div>
  );
}
