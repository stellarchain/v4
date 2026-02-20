'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useNetwork } from '@/contexts/NetworkContext';
import { apiEndpoints, getApiData, postApiV1Data } from '@/services/api';

type VerificationType = 'user_defined' | 'verified';

export default function AddLabelPage() {
  const USER_DEFINED_USD = 99;
  const VERIFIED_USD = 299;
  const router = useRouter();
  const { network } = useNetwork();
  const searchParams = useSearchParams();
  const [accountId, setAccountId] = useState(searchParams.get('account') || '');
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [verificationType, setVerificationType] = useState<VerificationType>('user_defined');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [xlmPriceUsd, setXlmPriceUsd] = useState<number | null>(null);

  const verificationOptions = [
    {
      id: 'user_defined' as VerificationType,
      name: 'User Defined',
      price: USER_DEFINED_USD,
      description: 'For normal users.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'verified' as VerificationType,
      name: 'Verified',
      price: VERIFIED_USD,
      description: 'For organisations and companies.',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    let active = true;
    getApiData('/api/coins/stellar')
      .then((data: any) => {
        const price = Number(data?.coingecko_stellar?.market_data?.current_price?.usd || 0);
        if (active) setXlmPriceUsd(price > 0 ? price : null);
      })
      .catch(() => {
        if (active) setXlmPriceUsd(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const extractOrderId = (payload: any): string | null => {
    const direct = payload?.order_uuid || payload?.orderId || payload?.id || payload?.uuid || payload?.data?.order_no || payload?.data?.id || null;
    if (typeof direct === 'string' && direct.length > 0) return direct;
    const iri = payload?.['@id'];
    if (typeof iri === 'string' && iri.includes('/')) {
      return iri.split('/').pop() || null;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const payload = {
        network,
        account: accountId.trim(),
        accountid: accountId.trim(),
        label: label.trim(),
        label_name: label.trim(),
        order_type: verificationType,
        email: email.trim(),
      };

      const response = await postApiV1Data(apiEndpoints.v1.orders(), payload, {
        headers: { Accept: 'application/ld+json' },
      });

      const orderId = extractOrderId(response);
      if (!orderId) {
        throw new Error('Order created but order id is missing from response');
      }

      router.push(`/accounts/directory/order/status?order_id=${encodeURIComponent(orderId)}`);
    } catch (error: any) {
      console.error('Failed to create label order:', error);
      const backendMessage = error?.response?.data?.message || error?.message;
      setSubmitError(backendMessage ? `Failed to create order: ${backendMessage}` : 'Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[800px] p-4 lg:p-4">
        {/* Header Card */}
        <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-start gap-4">
            <Link
              href="/known-accounts"
              className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 transition hover:bg-sky-100 dark:hover:bg-sky-900/50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Accounts</span>
                <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                  Label Submission
                </span>
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">Add Label</div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                Submit a label for a Stellar account to help identify it on the network
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account ID Field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="G..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 text-sm font-mono placeholder:text-[var(--text-muted)]"
                required
              />
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                The Stellar public key (starts with G)
              </p>
            </div>

            {/* Label Field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Enter a name for this account"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 text-sm placeholder:text-[var(--text-muted)]"
                required
              />
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                A descriptive name for the account (e.g., &quot;Company Treasury&quot;)
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 text-sm placeholder:text-[var(--text-muted)]"
                required
              />
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                Contact email for verification and updates
              </p>
            </div>

            {/* Verification Type Selection */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                Verification Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {verificationOptions.map((option) => {
                  const isSelected = verificationType === option.id;
                  const optionXlm = xlmPriceUsd && xlmPriceUsd > 0 ? (option.price / xlmPriceUsd) : null;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setVerificationType(option.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                          : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                          }`}
                        >
                          {option.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={`font-semibold text-sm ${
                                isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {option.name}
                            </span>
                            {isSelected && (
                              <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="text-lg font-bold text-[var(--text-primary)]">
                            ${option.price}
                            <span className="text-sm font-medium text-[var(--text-muted)]">
                              {' '} / {optionXlm ? `${optionXlm.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM` : 'N/A XLM'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {isSubmitting ? 'Creating order...' : 'Proceed with payment'}
            </button>
            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}
          </form>
        </div>

        {/* Info Cards */}
        <div className="mt-4 space-y-3">
          {/* Process Info */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">
                  Processing Time
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  The user defined process is instant once the payment has been made. For organisation you will need to contact support and provide evidence of being a legitimate organisation or company.
                </p>
              </div>
            </div>
          </div>

          {/* Paid Service Info */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">
                  Why Paid?
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  To prevent scams, this is a paid service.
                </p>
              </div>
            </div>
          </div>

          {/* Community Projects Info */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                  Community Projects
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Contact support if you&apos;re a community project and would like to be verified for free.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
