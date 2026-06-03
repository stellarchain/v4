'use client';

import { getRiskLabelKind } from '@/lib/shared/riskLabels';

interface RiskWarningRowProps {
  labelText?: string | null;
  subject: 'address' | 'issuer' | 'asset';
  address?: string | null;
  className?: string;
}

export default function RiskWarningRow({ labelText, subject, address, className = '' }: RiskWarningRowProps) {
  const riskKind = getRiskLabelKind(labelText);

  if (!riskKind) {
    return null;
  }

  const isSpam = riskKind === 'spam';
  const subjectText = subject === 'issuer' ? 'issuer address' : subject;
  const headline = isSpam ? 'Spam warning' : 'Scam warning';
  const message = subject === 'issuer'
    ? 'The issuer for this asset is marked as risky. Avoid trusting, trading, or sending funds to this token unless you have independently verified it.'
    : `This ${subjectText} is marked as risky. Avoid sending funds or interacting with it unless you have independently verified it.`;

  return (
    <section
      className={`w-full rounded-lg border px-4 py-3 ${isSpam
        ? 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-500/40 dark:bg-orange-950/40 dark:text-orange-100'
        : 'border-red-300 bg-red-50 text-red-950 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-100'
      } ${className}`}
      aria-label={headline}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isSpam ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'}`}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 8v5m0 3h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-bold">{headline}</h2>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isSpam ? 'bg-orange-200 text-orange-950 dark:bg-orange-500/20 dark:text-orange-100' : 'bg-red-200 text-red-950 dark:bg-red-500/20 dark:text-red-100'}`}>
              {labelText}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 opacity-90">{message}</p>
          {address && (
            <p className="mt-2 break-all font-mono text-[11px] opacity-75">{address}</p>
          )}
        </div>
      </div>
    </section>
  );
}
