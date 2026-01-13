'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactTransactionRow from './CompactTransactionRow';
import { Transaction, getTransactionDisplayInfo, Operation, getTransactionOperations } from '@/lib/stellar';

type FilterType = 'all' | 'transfers' | 'contracts';

interface TransactionPageClientProps {
  initialTransactions: Transaction[];
  initialPaymentTransactions?: Transaction[];
  limit?: number;
}

// How many to show per page
const PAGE_SIZE = 25;

// Merge and dedupe transactions by hash, keeping newest first
function mergeTransactions(txs1: Transaction[], txs2: Transaction[]): Transaction[] {
  const txMap = new Map<string, Transaction>();

  // Add all transactions, later ones overwrite earlier (both have displayInfo)
  [...txs1, ...txs2].forEach(tx => {
    // Use hash as the unique key to properly dedupe
    const existing = txMap.get(tx.hash);
    // Prefer transaction with displayInfo, or the newer one
    if (!existing || (tx.displayInfo && !existing.displayInfo)) {
      txMap.set(tx.hash, tx);
    }
  });

  // Sort by created_at (newest first)
  return Array.from(txMap.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function TransactionPageClient({
  initialTransactions,
  initialPaymentTransactions = [],
  limit = 25
}: TransactionPageClientProps) {
  // Merge initial transactions with payment transactions
  const mergedInitial = mergeTransactions(initialTransactions, initialPaymentTransactions);

  const [transactions, setTransactions] = useState<Transaction[]>(mergedInitial);
  const [filter, setFilter] = useState<FilterType>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const seenIdsRef = useRef<Set<string>>(new Set(mergedInitial.map(t => t.hash)));
  const animatedIdsRef = useRef<Set<string>>(new Set(mergedInitial.map(t => t.hash)));
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Note: We no longer fetch operations for each transaction to prevent API rate limiting
  // The transaction list view uses minimal data from the transaction itself
  // Full operation details are only fetched on the individual transaction detail page

  // Convert payment operations to Transaction format with displayInfo
  const convertPaymentsToTransactions = useCallback((operations: Operation[]): Transaction[] => {
    const txMap = new Map<string, Transaction>();

    for (const op of operations) {
      if (txMap.has(op.transaction_hash)) continue;

      const displayInfo = getTransactionDisplayInfo([op]);

      txMap.set(op.transaction_hash, {
        id: op.id,
        paging_token: op.paging_token,
        successful: op.transaction_successful,
        hash: op.transaction_hash,
        ledger: 0,
        created_at: op.created_at,
        source_account: op.source_account,
        source_account_sequence: '',
        fee_account: op.source_account,
        fee_charged: '0',
        max_fee: '0',
        operation_count: 1,
        envelope_xdr: '',
        result_xdr: '',
        result_meta_xdr: '',
        fee_meta_xdr: '',
        memo_type: 'none',
        signatures: [],
        displayInfo,
      });
    }

    return Array.from(txMap.values());
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      // Fetch regular transactions (required)
      const txRes = await fetch(`https://horizon.stellar.org/transactions?limit=${limit}&order=desc`);
      const txData = await txRes.json();
      const newTransactions: Transaction[] = txData._embedded.records;

      // Fetch payments separately (optional - don't fail if this errors)
      let paymentOps: Operation[] = [];
      try {
        const paymentsRes = await fetch(`https://horizon.stellar.org/payments?limit=30&order=desc`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          paymentOps = paymentsData._embedded?.records || [];
        }
      } catch {
        // Silently ignore payment fetch errors
      }

      // Convert payment operations to transactions
      const paymentTransactions = convertPaymentsToTransactions(paymentOps);

      // Combine all new transactions
      const allNewTransactions = [...newTransactions, ...paymentTransactions];
      const newHashes = allNewTransactions.filter(t => !seenIdsRef.current.has(t.hash)).map(t => t.hash);

      // Process transactions - use payment displayInfo or generate minimal displayInfo
      const transactionsWithOps = allNewTransactions.map((tx) => {
        // Payment transactions already have displayInfo
        if (tx.displayInfo) {
          return tx;
        }
        // For other transactions, generate minimal displayInfo without fetching operations
        return {
          ...tx,
          displayInfo: getTransactionDisplayInfo([]),
        };
      });

      setTransactions(prevTransactions => {
        // Merge new transactions with existing ones, keeping unique by hash
        const existingMap = new Map(prevTransactions.map(t => [t.hash, t]));

        // Add/update with new transactions (prefer ones with displayInfo)
        transactionsWithOps.forEach(tx => {
          const existing = existingMap.get(tx.hash);
          if (!existing || (tx.displayInfo && !existing.displayInfo)) {
            existingMap.set(tx.hash, tx);
          }
        });

        // Convert back to array and sort by created_at (newest first)
        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Track which are truly new (never animated before)
        const newHashes = transactionsWithOps
          .filter(t => !animatedIdsRef.current.has(t.hash))
          .map(t => t.hash);

        // Update seen hashes
        seenIdsRef.current = new Set(merged.map(t => t.hash));

        // Animate only brand new transactions after render
        if (newHashes.length > 0) {
          requestAnimationFrame(() => {
            let delay = 0;
            newHashes.forEach((hash) => {
              const el = rowRefs.current.get(hash);
              if (el && !animatedIdsRef.current.has(hash)) {
                animatedIdsRef.current.add(hash);
                gsap.fromTo(el,
                  { opacity: 0, x: -20 },
                  { opacity: 1, x: 0, duration: 0.3, delay, ease: 'power2.out' }
                );
                delay += 0.05;
              }
            });
          });
        }

        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, [limit, convertPaymentsToTransactions]);

  // Load more older transactions
  const loadMoreTransactions = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      // Get the oldest transaction we have for cursor
      const sortedTxs = [...transactions].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const cursor = oldestCursor || sortedTxs[0]?.paging_token;

      if (!cursor) {
        setIsLoadingMore(false);
        return;
      }

      // Fetch older transactions
      const res = await fetch(
        `https://horizon.stellar.org/transactions?limit=${PAGE_SIZE}&order=desc&cursor=${cursor}`
      );
      const data = await res.json();
      const olderTransactions: Transaction[] = data._embedded.records;

      if (olderTransactions.length === 0) {
        setIsLoadingMore(false);
        return;
      }

      // Update oldest cursor for next load
      const oldestTx = olderTransactions[olderTransactions.length - 1];
      setOldestCursor(oldestTx.paging_token);

      // Process older transactions with minimal displayInfo (no operation fetching)
      const txsWithOps = olderTransactions.map((tx) => {
        if (seenIdsRef.current.has(tx.hash)) {
          return null; // Skip if we already have this
        }
        return {
          ...tx,
          displayInfo: getTransactionDisplayInfo([]),
        };
      });

      const validTxs = txsWithOps.filter(tx => tx !== null) as Transaction[];

      setTransactions(prev => {
        const existingMap = new Map(prev.map(t => [t.hash, t]));
        validTxs.forEach(tx => {
          if (!existingMap.has(tx.hash)) {
            existingMap.set(tx.hash, tx);
          }
        });

        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        seenIdsRef.current = new Set(merged.map(t => t.hash));
        return merged;
      });

      // Increase visible count to show the newly loaded transactions
      setVisibleCount(prev => prev + PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, transactions, oldestCursor]);

  useEffect(() => {
    // Use the merged initial (includes both regular and payment transactions)
    // No need to fetch operations - use existing displayInfo or generate minimal one
    const txsWithOps = mergedInitial.map((tx) => {
      if (!tx.displayInfo) {
        return {
          ...tx,
          displayInfo: getTransactionDisplayInfo([]),
        };
      }
      return tx;
    });
    setTransactions(txsWithOps);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(fetchTransactions, 2000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const setRowRef = useCallback((hash: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(hash, el);
    } else {
      rowRefs.current.delete(hash);
    }
  }, []);

  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter(tx => {
    const type = tx.displayInfo?.type;
    if (filter === 'all') return true;
    // Payments = only actual payment/transfer transactions
    if (filter === 'transfers') return type === 'payment';
    // Contracts = only smart contract invocations
    if (filter === 'contracts') return type === 'contract';
    return true;
  });

  // Paginate the filtered transactions
  const visibleTransactions = filteredTransactions.slice(0, visibleCount);
  const hasMore = filteredTransactions.length > visibleCount || transactions.length >= PAGE_SIZE;

  // Effect to progressively fetch details for visible transactions labeled as 'other' / 'unknown'
  // This ensures we can properly identify Smart Contracts functions
  useEffect(() => {
    let mounted = true;

    // Check if we need to enrich any visible transactions
    const candidates = visibleTransactions.filter(tx =>
      (tx.displayInfo?.type === 'other' || !tx.displayInfo) &&
      !processedIdsRef.current.has(tx.hash)
    );

    if (candidates.length === 0) return;

    const enrichTransactions = async () => {
      // Process sequentially to be gentle on rate limits
      for (const tx of candidates) {
        if (!mounted) break;
        processedIdsRef.current.add(tx.hash);

        try {
          // Fetches operations to determine if it's a contract call and what function
          const opRes = await getTransactionOperations(tx.hash, 5);
          const ops = opRes._embedded.records;

          if (ops && ops.length > 0) {
            const info = getTransactionDisplayInfo(ops);

            // If we found a contract transaction, also fetch effects to get the received/sent amount
            if (info.type === 'contract') {
              try {
                const effectsRes = await fetch(`https://horizon.stellar.org/transactions/${tx.hash}/effects?limit=10`);
                const effectsData = await effectsRes.json();
                const effects = effectsData._embedded?.records || [];

                // Look for credit/debit effects
                const credit = effects.find((e: { type: string; amount?: string }) => e.type === 'account_credited' && e.amount);
                const debit = effects.find((e: { type: string; amount?: string }) => e.type === 'account_debited' && e.amount);

                if (credit) {
                  info.effectType = 'received';
                  info.effectAmount = credit.amount;
                  info.effectAsset = credit.asset_code || (credit.asset_type === 'native' ? 'XLM' : 'Unknown');
                } else if (debit) {
                  info.effectType = 'sent';
                  info.effectAmount = debit.amount;
                  info.effectAsset = debit.asset_code || (debit.asset_type === 'native' ? 'XLM' : 'Unknown');
                }
              } catch {
                // Ignore effects fetch errors
              }
            }

            // If we found something interesting (not 'other'), update the state
            if (info.type !== 'other') {
              setTransactions(prev => prev.map(t =>
                t.hash === tx.hash ? { ...t, displayInfo: info } : t
              ));
            }
          }

          // Small delay between requests to avoid hitting rate limits too hard but fast enough for UI
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          // Ignore errors, we just keep default display
        }
      }
    };

    enrichTransactions();

    return () => { mounted = false; };
  }, [visibleTransactions]);

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    {
      key: 'all',
      label: 'All',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      key: 'transfers',
      label: 'Payments',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'contracts',
      label: 'Contracts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Integrated Header & Filters */}
      {/* Integrated Header & Filters - Title Removed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-4">
        {/* Sleek Filter Pills */}
        <div className="flex p-0.5 bg-gray-100/80 backdrop-blur-sm rounded-xl border border-gray-200/50 self-start sm:self-auto">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${filter === key
                ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
            >
              {label}
              {filter === key && (
                <span className="ml-1.5 text-[10px] bg-gray-900 text-white px-1 py-px rounded-md opacity-100">
                  {filteredTransactions.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div ref={containerRef} className="space-y-3">
        {visibleTransactions.length > 0 ? (
          visibleTransactions.map((tx) => (
            <CompactTransactionRow
              key={tx.hash}
              ref={setRowRef(tx.hash)}
              transaction={tx}
            />
          ))
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[var(--text-tertiary)] text-sm">
              No {filter === 'transfers' ? 'payment' : 'contract'} transactions found
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Waiting for new transactions...
            </p>
          </div>
        )}

        {/* Load More Button */}
        {visibleTransactions.length > 0 && hasMore && (
          <button
            onClick={loadMoreTransactions}
            disabled={isLoadingMore}
            className="w-full py-3 mt-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Load More Transactions
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
