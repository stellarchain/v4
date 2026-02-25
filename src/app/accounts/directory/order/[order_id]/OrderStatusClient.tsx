'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNetwork, type NetworkType } from '@/contexts/NetworkContext';
import { apiEndpoints, getApiData, getApiV1Data, patchApiV1Data } from '@/services/api';
import { startAccountPaymentsStreamListener } from '@/services/horizon';

type OrderState = {
  id?: string;
  order_uuid?: string;
  order_no?: string;
  order_type?: string;
  status?: string;
  account?: string;
  accountid?: string;
  label?: string;
  label_name?: string;
  email?: string;
  network?: string | number;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  expires_at?: string;
  expiration_time?: number | string;
  payment_tx_hash?: string | null;
  payment_monitor_account?: string | null;
  [key: string]: unknown;
};

type StreamStatus = 'idle' | 'connecting' | 'listening' | 'event' | 'error';

const STREAMABLE_PAYMENT_TYPES = new Set([
  'payment',
  'path_payment_strict_send',
  'path_payment_strict_receive',
]);

const STEPS = ['Payment', 'Done'] as const;

function resolveOrderNetwork(value: string | number | undefined, fallback: NetworkType): NetworkType {
  if (value === 'mainnet' || value === 'testnet' || value === 'futurenet') {
    return value;
  }

  const normalized = Number(value);
  if (Number.isFinite(normalized)) {
    if (normalized === 2) return 'testnet';
    if (normalized === 3) return 'futurenet';
    if (normalized === 1) return 'mainnet';
  }

  return fallback;
}

function normalizeAccount(value: string): string {
  return String(value || '').trim().toUpperCase();
}

function isIncomingPaymentForAccount(payment: any, monitorAccount: string, sourceAccount: string): boolean {
  const paymentType = String(payment?.type || '').toLowerCase();
  if (!STREAMABLE_PAYMENT_TYPES.has(paymentType)) {
    return false;
  }

  const destination = normalizeAccount(payment?.to || '');
  const expectedDestination = normalizeAccount(monitorAccount);
  if (!destination || destination !== expectedDestination) {
    return false;
  }

  const expectedSource = normalizeAccount(sourceAccount);
  if (!expectedSource) {
    return false;
  }

  const possibleSources = [
    normalizeAccount(payment?.from || ''),
    normalizeAccount(payment?.source_account || ''),
    normalizeAccount(payment?.account || ''),
  ].filter(Boolean);

  return possibleSources.includes(expectedSource);
}

function extractPaymentTxHash(payment: any): string {
  return String(payment?.transaction_hash || payment?.transaction?.hash || '').trim();
}

function getStepIndex(status: string): number {
  if (status === 'completed') return 1;
  return 0;
}

function StepIndicator({ step, currentStep }: { step: number; currentStep: number }) {
  const isComplete = step < currentStep;
  const isActive = step === currentStep;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`
          w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
          transition-all duration-500 ease-out
          ${isComplete
            ? 'bg-[var(--success)] text-white'
            : isActive
              ? 'bg-[var(--info)] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]'
          }
        `}
        style={isActive ? { animation: 'pulse-soft 3.5s ease-in-out infinite' } : undefined}
      >
        {isComplete ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          step + 1
        )}
      </div>
      <span
        className={`text-[11px] font-medium tracking-wide ${
          isComplete
            ? 'text-[var(--success)]'
            : isActive
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-muted)]'
        }`}
      >
        {STEPS[step]}
      </span>
    </div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  return (
    <div className="flex-1 h-px mx-1 relative">
      <div className="absolute inset-0 bg-[var(--border-default)]" />
      <div
        className="absolute inset-0 bg-[var(--success)] origin-left transition-transform duration-700 ease-out"
        style={{ transform: isComplete ? 'scaleX(1)' : 'scaleX(0)' }}
      />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      title="Copy address"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function OrderStatusClient({ initialOrderId = '' }: { initialOrderId?: string }) {
  const USER_DEFINED_USD = 99;
  const VERIFIED_USD = 299;
  const { network: selectedNetwork } = useNetwork();
  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get('order_id') || '';
  const orderId = queryOrderId || initialOrderId;

  const [order, setOrder] = useState<OrderState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [xlmPriceUsd, setXlmPriceUsd] = useState<number | null>(null);

  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamError, setStreamError] = useState('');
  const [lastPaymentTx, setLastPaymentTx] = useState('');
  const streamCursorRef = useRef<string>('now');
  const [streamRestartKey, setStreamRestartKey] = useState(0);

  const activeNetwork = useMemo(() => resolveOrderNetwork(order?.network, selectedNetwork), [order?.network, selectedNetwork]);

  const applyOrderResponse = useCallback((data: any) => {
    const orderPayload = data?.data || data;
    setOrder(orderPayload || null);
    setError('');
    setLastCheckedAt(new Date());
  }, []);

  const fetchOrder = useCallback(async ({ reason, paymentTxHash, eventId, showLoading = false }: {
    reason: string;
    paymentTxHash?: string;
    eventId?: string;
    showLoading?: boolean;
  }) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await getApiV1Data(apiEndpoints.v1.orderById(orderId), {
        headers: { Accept: 'application/ld+json' },
        params: {
          network: activeNetwork,
          stream_reason: reason,
          payment_tx_hash: paymentTxHash,
          payment_event_id: eventId,
        },
      });
      applyOrderResponse(data);
    } catch (err) {
      setError('Failed to fetch order status.');
      console.error('Order status fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeNetwork, applyOrderResponse, orderId]);

  const notifyPaymentDetected = useCallback(async ({ paymentTxHash, eventId }: { paymentTxHash?: string; eventId?: string }) => {
    const data = await patchApiV1Data(apiEndpoints.v1.orderById(orderId), {}, {
      headers: {
        Accept: 'application/ld+json',
        'Content-Type': 'application/json',
      },
      params: {
        network: activeNetwork,
        stream_reason: 'payment_stream_event',
        payment_tx_hash: paymentTxHash,
        payment_event_id: eventId,
      },
    });
    applyOrderResponse(data);
  }, [activeNetwork, applyOrderResponse, orderId]);

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    const run = async () => {
      await fetchOrder({ reason: 'page_load', showLoading: true });
      if (!active) return;
    };

    void run();

    return () => {
      active = false;
    };
  }, [orderId, activeNetwork, fetchOrder]);

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

  const orderType = String(order?.order_type || '').toLowerCase();
  const selectedUsdTotal = orderType === 'verified' ? VERIFIED_USD : USER_DEFINED_USD;
  const selectedXlmTotal = xlmPriceUsd && xlmPriceUsd > 0 ? (selectedUsdTotal / xlmPriceUsd) : null;
  const orderStatus = String(order?.status || 'pending').toLowerCase();
  const isCompleted = orderStatus === 'completed';
  const paymentMonitorAccount = String(order?.payment_monitor_account || '').trim();
  const paymentTxHash = String(order?.payment_tx_hash || '').trim();
  const displayAccount = String(order?.accountid || order?.account || '').trim();
  const displayLabel = String(order?.label_name || order?.label || '').trim();

  useEffect(() => {
    if (!orderId || !paymentMonitorAccount || isCompleted) {
      setStreamStatus(isCompleted ? 'idle' : 'connecting');
      return;
    }

    setStreamStatus('connecting');
    setStreamError('');

    const seenEvents = new Set<string>();

    const closeStream = startAccountPaymentsStreamListener({
      accountId: paymentMonitorAccount,
      network: activeNetwork,
      cursor: streamCursorRef.current || 'now',
      onmessage: (payment: any) => {
        if (!isIncomingPaymentForAccount(payment, paymentMonitorAccount, displayAccount)) {
          return;
        }

        const eventId = String(payment?.paging_token || payment?.id || '').trim();
        if (eventId && seenEvents.has(eventId)) {
          return;
        }
        if (eventId) {
          seenEvents.add(eventId);
          streamCursorRef.current = eventId;
        }

        const streamTxHash = extractPaymentTxHash(payment);
        if (streamTxHash) {
          setLastPaymentTx(streamTxHash);
        }
        setStreamStatus('event');

        void notifyPaymentDetected({
          paymentTxHash: streamTxHash || undefined,
          eventId: eventId || undefined,
        }).catch((patchError) => {
          console.error('Failed to PATCH payment stream event:', patchError);
          return fetchOrder({
            reason: 'payment_stream_event_fallback_fetch',
            paymentTxHash: streamTxHash || undefined,
            eventId: eventId || undefined,
          });
        }).finally(() => {
          setStreamStatus('listening');
        });
      },
      onerror: () => {
        setStreamStatus('error');
        setStreamError('Stream disconnected. Reconnecting...');
      },
      reconnectTimeout: 15000,
    });

    setStreamStatus('listening');

    return () => {
      closeStream();
    };
  }, [orderId, paymentMonitorAccount, displayAccount, isCompleted, activeNetwork, notifyPaymentDetected, fetchOrder, streamRestartKey]);

  useEffect(() => {
    if (!orderId || isCompleted) {
      return;
    }

    const handleResume = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      setStreamError('');
      setStreamStatus('connecting');
      setStreamRestartKey((prev) => prev + 1);
      void fetchOrder({ reason: 'app_resumed' });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('online', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('online', handleResume);
    };
  }, [orderId, isCompleted, fetchOrder]);

  useEffect(() => {
    if (!orderId || isCompleted) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      void fetchOrder({ reason: 'poll_fallback' });
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [orderId, isCompleted, fetchOrder]);

  const currentStep = getStepIndex(orderStatus);

  const streamDot =
    streamStatus === 'listening' || streamStatus === 'event'
      ? 'bg-[var(--success)]'
      : streamStatus === 'error'
        ? 'bg-[var(--warning)]'
        : 'bg-[var(--text-muted)]';

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Order Status</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">{orderId || '-'}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[var(--info)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--error)]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-xs text-[var(--info)] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="flex items-center mb-6 px-2">
              <StepIndicator step={0} currentStep={currentStep} />
              <StepConnector isComplete={currentStep > 0} />
              <StepIndicator step={1} currentStep={currentStep} />
            </div>

            {/* Main Content Card */}
            <div
              className={`rounded-xl border p-5 transition-colors duration-500 ${
                isCompleted
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-[var(--border-default)] bg-[var(--bg-primary)]'
              }`}
            >
              {isCompleted ? (
                /* ---- DONE STATE ---- */
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--success)] mx-auto mb-4 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">All Done!</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">
                    Label <span className="font-semibold text-[var(--text-primary)]">&ldquo;{displayLabel}&rdquo;</span> has been applied to your account.
                  </p>
                  {(paymentTxHash || lastPaymentTx) && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-3 font-mono break-all">
                      TX: {paymentTxHash || lastPaymentTx}
                    </p>
                  )}
                </div>
              ) : (
                /* ---- WAITING FOR PAYMENT STATE ---- */
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Send to complete your order
                  </p>
                  <div className="mb-1">
                    <span className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
                      {selectedXlmTotal
                        ? selectedXlmTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : '---'}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-secondary)] ml-1.5">XLM</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-5">
                    ${selectedUsdTotal}.00 USD
                    {xlmPriceUsd && (
                      <span className="ml-1">(1 XLM = ${xlmPriceUsd.toFixed(4)})</span>
                    )}
                  </p>

                  {paymentMonitorAccount && (
                    <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-3">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Send to</p>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[13px] font-mono text-[var(--text-primary)] break-all leading-relaxed">
                          {paymentMonitorAccount}
                        </span>
                        <CopyButton text={paymentMonitorAccount} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stream / polling indicator */}
            {!isCompleted && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${streamDot}`}
                  style={{ animation: 'pulse-soft 3.5s ease-in-out infinite' }}
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  {streamStatus === 'listening' || streamStatus === 'event' ? 'Live' : streamStatus === 'error' ? 'Reconnecting' : 'Connecting'}
                  {lastCheckedAt && <span className="mx-0.5">&middot;</span>}
                  {lastCheckedAt && lastCheckedAt.toLocaleTimeString()}
                </span>
              </div>
            )}

            {streamError && !isCompleted && (
              <p className="text-[11px] text-[var(--warning)] text-center mt-1">{streamError}</p>
            )}
          </>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <Link
            href="/accounts/directory/update"
            className="flex-1 text-center px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            New Order
          </Link>
          <Link
            href="/accounts/directory"
            className="flex-1 text-center px-4 py-2.5 rounded-xl bg-[var(--info)] text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Directory
          </Link>
        </div>
      </div>
    </div>
  );
}
