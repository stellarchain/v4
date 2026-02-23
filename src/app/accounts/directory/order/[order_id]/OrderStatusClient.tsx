'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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

export default function OrderStatusClient({ initialOrderId = '' }: { initialOrderId?: string }) {
  const USER_DEFINED_USD = 99;
  const VERIFIED_USD = 299;
  const { network: selectedNetwork } = useNetwork();
  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get('order_id') || '';
  const orderId = queryOrderId || initialOrderId;

  const [order, setOrder] = useState<OrderState | null>(null);
  const [responseMeta, setResponseMeta] = useState<{ message?: string; status?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [xlmPriceUsd, setXlmPriceUsd] = useState<number | null>(null);

  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamError, setStreamError] = useState('');
  const [lastPaymentEventAt, setLastPaymentEventAt] = useState<Date | null>(null);
  const [lastPaymentTx, setLastPaymentTx] = useState('');

  const activeNetwork = useMemo(() => resolveOrderNetwork(order?.network, selectedNetwork), [order?.network, selectedNetwork]);

  const applyOrderResponse = (data: any) => {
    const orderPayload = data?.data || data;
    setResponseMeta({ message: data?.message, status: data?.status });
    setOrder(orderPayload || null);
    setError('');
    setLastCheckedAt(new Date());
  };

  const fetchOrder = async ({ reason, paymentTxHash, eventId, showLoading = false }: {
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
  };

  const notifyPaymentDetected = async ({ paymentTxHash, eventId }: { paymentTxHash?: string; eventId?: string }) => {
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
  };

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
  }, [orderId, activeNetwork]);

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
      cursor: 'now',
      onmessage: (payment: any) => {
        if (!isIncomingPaymentForAccount(payment, paymentMonitorAccount, displayAccount)) {
          return;
        }

        const eventId = String(payment?.id || payment?.paging_token || '').trim();
        if (eventId && seenEvents.has(eventId)) {
          return;
        }
        if (eventId) {
          seenEvents.add(eventId);
        }

        const streamTxHash = extractPaymentTxHash(payment);
        if (streamTxHash) {
          setLastPaymentTx(streamTxHash);
        }
        setLastPaymentEventAt(new Date());
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
        setStreamError('Streaming temporarily disconnected. Reconnecting...');
      },
      reconnectTimeout: 15000,
    });

    setStreamStatus('listening');

    return () => {
      closeStream();
    };
  }, [orderId, paymentMonitorAccount, displayAccount, isCompleted, activeNetwork]);

  const streamLabel =
    streamStatus === 'event'
      ? 'Payment detected'
      : streamStatus === 'listening'
        ? 'Streaming active'
        : streamStatus === 'connecting'
          ? 'Connecting stream'
          : streamStatus === 'error'
            ? 'Reconnecting stream'
            : 'Streaming paused';

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Order Status</h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-1 font-mono break-all">{orderId || '-'}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            {streamLabel}
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--text-tertiary)]">Loading order status...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</div>
                <div className="font-semibold text-[var(--text-primary)]">{String(order?.status || 'pending')}</div>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Last Check</div>
                <div className="font-medium text-[var(--text-secondary)]">
                  {lastCheckedAt ? lastCheckedAt.toLocaleTimeString() : '-'}
                </div>
              </div>
            </div>
            <div
              className={`rounded-lg border p-3 ${
                isCompleted
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Payment Flow</div>
              {!isCompleted ? (
                <p className="text-sm text-[var(--text-primary)]">
                  Send{' '}
                  <span className="font-bold">
                    {selectedXlmTotal
                      ? `${selectedXlmTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`
                      : 'the required XLM amount'}
                  </span>{' '}
                  to the monitor account below to complete label processing.
                </p>
              ) : (
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Payment received. Label flow completed.
                </p>
              )}
              {paymentMonitorAccount && (
                <div className="mt-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Payment Monitor Account</div>
                  <div className="text-sm font-mono break-all text-[var(--text-primary)]">{paymentMonitorAccount}</div>
                </div>
              )}
              {paymentTxHash && (
                <div className="mt-2 text-xs text-[var(--text-secondary)]">
                  Payment TX: <span className="font-mono break-all">{paymentTxHash}</span>
                </div>
              )}
              {lastPaymentTx && !paymentTxHash && (
                <div className="mt-2 text-xs text-[var(--text-secondary)]">
                  Stream TX: <span className="font-mono break-all">{lastPaymentTx}</span>
                </div>
              )}
              {lastPaymentEventAt && (
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Last stream event: {lastPaymentEventAt.toLocaleTimeString()}
                </div>
              )}
              {streamError && (
                <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">{streamError}</div>
              )}
            </div>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Price</div>
              <div className="text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">User Defined:</span> ${USER_DEFINED_USD}
                <span className="mx-2 text-[var(--text-muted)]">|</span>
                <span className="font-medium text-[var(--text-primary)]">Verified:</span> ${VERIFIED_USD}
              </div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Total ({orderType || 'user_defined'}):</span>{' '}
                {selectedXlmTotal ? `${selectedXlmTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM` : 'N/A'}
                {xlmPriceUsd ? (
                  <span className="text-[var(--text-muted)]"> (1 XLM = ${xlmPriceUsd.toFixed(4)})</span>
                ) : (
                  <span className="text-[var(--text-muted)]"> (XLM price unavailable)</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Order Details</div>
              <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                <div>
                  <span className="text-[var(--text-muted)]">Order Type:</span>{' '}
                  <span className="font-medium text-[var(--text-primary)]">{orderType || '-'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Label:</span>{' '}
                  <span className="font-medium text-[var(--text-primary)]">{displayLabel || '-'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Account:</span>{' '}
                  <span className="font-mono break-all text-[var(--text-primary)]">{displayAccount || '-'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Network:</span>{' '}
                  <span className="font-medium text-[var(--text-primary)]">{String(order?.network ?? activeNetwork)}</span>
                </div>
              </div>
            </div>
            {responseMeta?.message && (
              <div className="text-sm text-[var(--text-tertiary)]">
                {responseMeta.message} {responseMeta.status ? `(HTTP ${responseMeta.status})` : ''}
              </div>
            )}

            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Raw Response</div>
              <pre className="text-xs text-[var(--text-secondary)] overflow-auto max-h-[360px]">
                {JSON.stringify(order, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Link
            href="/accounts/directory/update"
            className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            New Label Order
          </Link>
          <Link
            href="/accounts/directory"
            className="px-4 py-2 rounded-lg bg-[var(--info)] text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Account Directory
          </Link>
        </div>
      </div>
    </div>
  );
}
