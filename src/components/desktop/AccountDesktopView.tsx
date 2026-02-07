'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Transaction, Operation, Effect, shortenAddress, timeAgo, formatXLM, getBaseUrl } from '@/lib/stellar';
import type { AccountLabel } from '@/lib/stellar';
import AccountBadges from '@/components/AccountBadges';
import { QRCodeSVG } from 'qrcode.react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { addressRoute, assetRoute, txRoute } from '@/lib/routes';
import GliderTabs from '@/components/ui/GliderTabs';

interface Balance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface AccountData {
  id: string;
  balances: Balance[];
  subentry_count: number;
  sequence: string;
  last_modified_time: string;
  last_modified_ledger: number;
  signers: Array<{ key: string; weight: number; type: string }>;
  num_sponsoring: number;
  num_sponsored: number;
  thresholds: { low_threshold: number; med_threshold: number; high_threshold: number };
  flags: { auth_required: boolean; auth_revocable: boolean; auth_immutable: boolean; auth_clawback_enabled: boolean };
  home_domain?: string;
}

interface AssetPriceData {
  price: number;
  priceInXlm: number;
  change24h: number;
}

interface AccountDesktopViewProps {
  account: AccountData;
  transactions: Transaction[];
  operations: Operation[];
  xlmPrice: number;
  accountLabels?: Record<string, AccountLabel>;
  currentAccountLabel?: AccountLabel | null;
}

function getAssetUrl(code: string | undefined, issuer: string | undefined): string {
  if (!code || code === 'native') return assetRoute('XLM', null);
  if (code === 'XLM' && !issuer) return assetRoute('XLM', null);
  return assetRoute(code, issuer);
}

function formatCompactNumber(value: number): string {
  if (value === 0) return '0';
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(2) + 'T';
  if (absValue >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
  if (absValue >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
  if (absValue >= 10_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatExactNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

const getOperationCategory = (type: string): { label: string; color: string; bgColor: string } => {
  if (type === 'payment' || type === 'create_account') return { label: 'Payment', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800' };
  if (type === 'path_payment_strict_send' || type === 'path_payment_strict_receive') return { label: 'Swap', color: 'text-violet-700 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/40 border-violet-100 dark:border-violet-800' };
  if (type === 'invoke_host_function') return { label: 'Contract', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/40 border-amber-100 dark:border-amber-800' };
  if (type.includes('offer')) return { label: 'DEX', color: 'text-indigo-700 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800' };
  if (type === 'change_trust' || type === 'set_trustline_flags') return { label: 'Trustline', color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/40 border-sky-100 dark:border-sky-800' };
  if (type === 'set_options' || type === 'account_merge') return { label: 'Account', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]' };
  return { label: 'Action', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]' };
};

export default function AccountDesktopView({ account, transactions, operations: initialOperations, xlmPrice, accountLabels = {}, currentAccountLabel }: AccountDesktopViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [favoriteLabel, setFavoriteLabel] = useState('');
  const [showTokensDropdown, setShowTokensDropdown] = useState(false);
  const tokensDropdownRef = useRef<HTMLDivElement>(null);
  const { favorites, addFavorite, removeFavorite, updateFavoriteLabel, isFavorite, getFavorite } = useFavorites();
  const isCurrentFavorite = isFavorite(account.id);
  const currentFavorite = getFavorite(account.id);

  // Read initial tab from URL params
  const initialTab = (searchParams.get('tab') as 'assets' | 'transactions' | 'operations' | 'details') || 'assets';
  const [activeTab, setActiveTab] = useState<'assets' | 'transactions' | 'operations' | 'details'>(initialTab);

  const [assetPrices, setAssetPrices] = useState<Record<string, AssetPriceData>>({});
  const [opEffects, setOpEffects] = useState<Record<string, Effect[]>>({});
  const [xlmChange24h, setXlmChange24h] = useState(0);
  const [activityAssets, setActivityAssets] = useState<Array<{ code: string; issuer: string; type: string }>>([]);

  // Operations state for pagination
  const [allOperations, setAllOperations] = useState<Operation[]>(initialOperations);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreToFetch, setHasMoreToFetch] = useState(initialOperations.length >= 100);
  const [lastCursor, setLastCursor] = useState<string | null>(
    initialOperations.length > 0 ? initialOperations[initialOperations.length - 1].paging_token : null
  );

  // Transactions state for infinite scroll
  const TX_PAGE_SIZE = 50;
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(() => {
    return [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });
  const [loadingMoreTx, setLoadingMoreTx] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(transactions.length >= TX_PAGE_SIZE);
  const [lastTxCursor, setLastTxCursor] = useState<string | null>(
    transactions.length > 0 ? transactions[transactions.length - 1].paging_token : null
  );
  const txLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const opsLoadMoreRef = useRef<HTMLDivElement | null>(null);

  // Update URL when tab changes
  const handleTabChange = (tab: 'assets' | 'transactions' | 'operations' | 'details') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'assets') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  // Sync operations state when initialOperations prop changes
  useEffect(() => {
    const sortedOps = [...initialOperations].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setAllOperations(sortedOps);
    setHasMoreToFetch(initialOperations.length >= 100);
    setLastCursor(
      initialOperations.length > 0 ? initialOperations[initialOperations.length - 1].paging_token : null
    );
  }, [initialOperations]);

  useEffect(() => {
    const sortedTxs = [...transactions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setAllTransactions(sortedTxs);
    setHasMoreTransactions(transactions.length >= TX_PAGE_SIZE);
    setLastTxCursor(transactions.length > 0 ? transactions[transactions.length - 1].paging_token : null);
  }, [TX_PAGE_SIZE, transactions]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tokensDropdownRef.current && !tokensDropdownRef.current.contains(e.target as Node)) {
        setShowTokensDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Balances
  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  const otherBalancesUnsorted = account.balances.filter(b => b.asset_type !== 'native');
  const xlmAmount = parseFloat(xlmBalance?.balance || '0');

  // Sort other balances by USD value (highest first)
  const otherBalances = useMemo(() => {
    return [...otherBalancesUnsorted].sort((a, b) => {
      const keyA = `${a.asset_code}:${a.asset_issuer}`;
      const keyB = `${b.asset_code}:${b.asset_issuer}`;
      const priceA = assetPrices[keyA];
      const priceB = assetPrices[keyB];
      const valueA = priceA ? parseFloat(a.balance) * priceA.price : 0;
      const valueB = priceB ? parseFloat(b.balance) * priceB.price : 0;
      return valueB - valueA;
    });
  }, [otherBalancesUnsorted, assetPrices]);

  // Calculate total balance in XLM
  const totalBalanceXLM = useMemo(() => {
    let total = xlmAmount;
    otherBalances.forEach(b => {
      const key = `${b.asset_code}:${b.asset_issuer}`;
      const priceData = assetPrices[key];
      if (priceData && priceData.priceInXlm > 0) {
        total += parseFloat(b.balance) * priceData.priceInXlm;
      }
    });
    return total;
  }, [xlmAmount, otherBalances, assetPrices]);

  // Calculate total USD value
  const totalValueUSD = totalBalanceXLM * xlmPrice;

  // Calculate tokens total value
  const tokensValueUSD = useMemo(() => {
    let total = 0;
    otherBalances.forEach(b => {
      const key = `${b.asset_code}:${b.asset_issuer}`;
      const priceData = assetPrices[key];
      if (priceData) {
        total += parseFloat(b.balance) * priceData.price;
      }
    });
    return total;
  }, [otherBalances, assetPrices]);

  // Fetch XLM 24h change
  useEffect(() => {
    const fetchXlmChange = async () => {
      try {
        const res = await fetch('/api/coingecko/xlm', { cache: 'force-cache' });
        const data = await res.json();
        if (typeof data?.usd_24h_change === 'number') {
          setXlmChange24h(data.usd_24h_change);
        }
      } catch {
        // Ignore
      }
    };
    fetchXlmChange();
  }, []);

  // Fetch asset prices with 24h change
  useEffect(() => {
    const fetchPrices = async () => {
      const newPrices: Record<string, AssetPriceData> = {};

      await Promise.all(account.balances.filter(b => b.asset_type !== 'native').map(async (b) => {
        if (!b.asset_code || !b.asset_issuer) return;
        const key = `${b.asset_code}:${b.asset_issuer}`;

        if (b.asset_code === 'USDC' || b.asset_code === 'yUSDC') {
          newPrices[key] = { price: 1.0, priceInXlm: 1 / xlmPrice, change24h: 0 };
          return;
        }

        try {
          const res = await fetch(
            `${getBaseUrl()}/order_book?selling_asset_type=${b.asset_type}&selling_asset_code=${b.asset_code}&selling_asset_issuer=${b.asset_issuer}&buying_asset_type=native&limit=1`
          );
          const data = await res.json();

          if (data.bids && data.bids.length > 0) {
            const priceInXlm = parseFloat(data.bids[0].price);
            const priceUSD = priceInXlm * xlmPrice;

            const endTime = Date.now();
            const startTime = endTime - 86400000;
            const aggRes = await fetch(
              `${getBaseUrl()}/trade_aggregations?base_asset_type=${b.asset_type}&base_asset_code=${b.asset_code}&base_asset_issuer=${b.asset_issuer}&counter_asset_type=native&resolution=3600000&start_time=${startTime}&end_time=${endTime}&limit=24&order=asc`
            );
            const aggData = await aggRes.json();

            let change24h = 0;
            const records = aggData._embedded?.records || [];
            if (records.length > 0) {
              const oldestRecord = records[0];
              const openPriceXlm = parseFloat(oldestRecord.open);
              if (openPriceXlm > 0) {
                const xlmPriceChange = ((priceInXlm - openPriceXlm) / openPriceXlm) * 100;
                change24h = xlmPriceChange + xlmChange24h;
              }
            } else {
              change24h = xlmChange24h;
            }

            newPrices[key] = { price: priceUSD, priceInXlm, change24h };
          }
        } catch {
          // Ignore
        }
      }));

      setAssetPrices(prev => ({ ...prev, ...newPrices }));
    };

    fetchPrices();
  }, [account.balances, xlmPrice, xlmChange24h]);

  // Fetch more operations for load more
  const fetchMoreOperations = useCallback(async () => {
    if (!hasMoreToFetch || loadingMore || !lastCursor) return;

    setLoadingMore(true);
    try {
      const res = await fetch(
        `${getBaseUrl()}/accounts/${account.id}/operations?limit=100&order=desc&cursor=${lastCursor}`
      );
      const data = await res.json();
      const newOps = data._embedded?.records || [];

      if (newOps.length > 0) {
        setAllOperations(prev => {
          const existing = new Set(prev.map(op => op.id));
          const uniqueNew = newOps.filter((op: Operation) => !existing.has(op.id));
          return [...prev, ...uniqueNew];
        });
        setLastCursor(newOps[newOps.length - 1].paging_token);
        setHasMoreToFetch(newOps.length >= 100);
      } else {
        setHasMoreToFetch(false);
      }
    } catch (error) {
      console.error('Failed to load more operations:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [account.id, hasMoreToFetch, lastCursor, loadingMore]);

  const fetchMoreTransactions = useCallback(async () => {
    if (!hasMoreTransactions || loadingMoreTx || !lastTxCursor) return;

    setLoadingMoreTx(true);
    try {
      const res = await fetch(
        `${getBaseUrl()}/accounts/${account.id}/transactions?limit=${TX_PAGE_SIZE}&order=desc&cursor=${lastTxCursor}`
      );
      const data = await res.json();
      const newTxs: Transaction[] = data?._embedded?.records || [];

      if (newTxs.length > 0) {
        setAllTransactions(prev => {
          const existing = new Set(prev.map(t => t.hash));
          const uniqueNew = newTxs.filter(t => !existing.has(t.hash));
          return [...prev, ...uniqueNew];
        });
        setLastTxCursor(newTxs[newTxs.length - 1].paging_token);
        setHasMoreTransactions(newTxs.length >= TX_PAGE_SIZE);
      } else {
        setHasMoreTransactions(false);
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setLoadingMoreTx(false);
    }
  }, [TX_PAGE_SIZE, account.id, hasMoreTransactions, lastTxCursor, loadingMoreTx]);

  useEffect(() => {
    if (activeTab !== 'transactions') return;
    if (!hasMoreTransactions || loadingMoreTx) return;
    const el = txLoadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) fetchMoreTransactions();
      },
      { root: null, rootMargin: '400px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, fetchMoreTransactions, hasMoreTransactions, loadingMoreTx]);

  useEffect(() => {
    if (activeTab !== 'operations') return;
    if (!hasMoreToFetch || loadingMore) return;
    const el = opsLoadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) fetchMoreOperations();
      },
      { root: null, rootMargin: '400px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, fetchMoreOperations, hasMoreToFetch, loadingMore]);

  // Fetch effects for operations
  useEffect(() => {
    const fetchEffects = async () => {
      const opsNeedingEffects = allOperations
        .filter(op => !opEffects[op.id])
        .slice(0, 30);

      if (opsNeedingEffects.length === 0) return;

      const newEffects: Record<string, Effect[]> = {};
      await Promise.all(opsNeedingEffects.map(async (op) => {
        try {
          const res = await fetch(`${getBaseUrl()}/operations/${op.id}/effects`);
          const data = await res.json();
          if (data._embedded?.records) {
            newEffects[op.id] = data._embedded.records;
          }
        } catch { /* ignore */ }
      }));

      if (Object.keys(newEffects).length > 0) {
        setOpEffects(prev => ({ ...prev, ...newEffects }));
      }
    };

    fetchEffects();
  }, [allOperations, opEffects]);

  // Extract unique assets from activity effects for price fetching
  useEffect(() => {
    const assets = new Map<string, { code: string; issuer: string; type: string }>();

    Object.values(opEffects).forEach(effects => {
      effects.forEach(effect => {
        const e = effect as any;
        if (e.asset_code && e.asset_issuer && e.asset_type !== 'native') {
          const key = `${e.asset_code}:${e.asset_issuer}`;
          if (!assets.has(key)) {
            assets.set(key, {
              code: e.asset_code,
              issuer: e.asset_issuer,
              type: e.asset_type || 'credit_alphanum4',
            });
          }
        }
      });
    });

    setActivityAssets(Array.from(assets.values()));
  }, [opEffects]);

  // Fetch prices for activity assets
  useEffect(() => {
    const fetchActivityPrices = async () => {
      const newPrices: Record<string, AssetPriceData> = {};

      const assetsToFetch = activityAssets.filter(a => {
        const key = `${a.code}:${a.issuer}`;
        return !assetPrices[key];
      });

      if (assetsToFetch.length === 0) return;

      await Promise.all(assetsToFetch.map(async (asset) => {
        const key = `${asset.code}:${asset.issuer}`;

        if (asset.code === 'USDC' || asset.code === 'yUSDC') {
          newPrices[key] = { price: 1.0, priceInXlm: 1 / xlmPrice, change24h: 0 };
          return;
        }

        try {
          const res = await fetch(
            `${getBaseUrl()}/order_book?selling_asset_type=${asset.type}&selling_asset_code=${asset.code}&selling_asset_issuer=${asset.issuer}&buying_asset_type=native&limit=1`
          );
          const data = await res.json();

          if (data.bids && data.bids.length > 0) {
            const priceInXlm = parseFloat(data.bids[0].price);
            const priceUSD = priceInXlm * xlmPrice;
            newPrices[key] = { price: priceUSD, priceInXlm, change24h: 0 };
          }
        } catch { /* ignore */ }
      }));

      if (Object.keys(newPrices).length > 0) {
        setAssetPrices(prev => ({ ...prev, ...newPrices }));
      }
    };

    if (activityAssets.length > 0 && xlmPrice > 0) {
      fetchActivityPrices();
    }
  }, [activityAssets, xlmPrice, assetPrices]);

  const handleCopy = () => {
    navigator.clipboard.writeText(account.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const decodeContractFunctionName = (op: Operation): string => {
    try {
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';
      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';
      const decoded = atob(symParam.value);
      const cleaned = decoded.replace(/[^\x20-\x7E]/g, '').replace(/^[^a-zA-Z]+/, '');
      return cleaned || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  const getAmountFromEffects = (effects: Effect[] | undefined) => {
    if (!effects || effects.length === 0) return null;

    const credits = effects.filter(e => e.type === 'account_credited' && e.account === account.id && (e as any).amount);
    const debits = effects.filter(e => e.type === 'account_debited' && e.account === account.id && (e as any).amount);

    let largestCredit = credits.reduce((max, e) => {
      const amount = parseFloat((e as any).amount) || 0;
      const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
      return amount > maxAmount ? e : max;
    }, null as Effect | null);

    let largestDebit = debits.reduce((max, e) => {
      const amount = parseFloat((e as any).amount) || 0;
      const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
      return amount > maxAmount ? e : max;
    }, null as Effect | null);

    if (!largestCredit && !largestDebit) {
      const anyCredits = effects.filter(e => e.type === 'account_credited' && (e as any).amount);
      const anyDebits = effects.filter(e => e.type === 'account_debited' && (e as any).amount);

      largestCredit = anyCredits.reduce((max, e) => {
        const amount = parseFloat((e as any).amount) || 0;
        const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
        return amount > maxAmount ? e : max;
      }, null as Effect | null);

      largestDebit = anyDebits.reduce((max, e) => {
        const amount = parseFloat((e as any).amount) || 0;
        const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
        return amount > maxAmount ? e : max;
      }, null as Effect | null);
    }

    const creditAmount = largestCredit ? parseFloat((largestCredit as any).amount) || 0 : 0;
    const debitAmount = largestDebit ? parseFloat((largestDebit as any).amount) || 0 : 0;

    if (creditAmount >= debitAmount && largestCredit) {
      return {
        type: 'received' as const,
        amount: (largestCredit as any).amount,
        asset: (largestCredit as any).asset_code || ((largestCredit as any).asset_type === 'native' ? 'XLM' : 'Unknown'),
        asset_issuer: (largestCredit as any).asset_issuer || null,
        asset_type: (largestCredit as any).asset_type || 'native',
      };
    }

    if (largestDebit) {
      return {
        type: 'sent' as const,
        amount: (largestDebit as any).amount,
        asset: (largestDebit as any).asset_code || ((largestDebit as any).asset_type === 'native' ? 'XLM' : 'Unknown'),
        asset_issuer: (largestDebit as any).asset_issuer || null,
        asset_type: (largestDebit as any).asset_type || 'native',
      };
    }

    return null;
  };

  // Get first and last operation times
  const firstOpTime = allOperations.length > 0 ? allOperations[allOperations.length - 1]?.created_at : null;
  const latestOpTime = allOperations.length > 0 ? allOperations[0]?.created_at : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-tertiary)]">Address</span>
            <span className="font-mono text-sm font-medium text-[var(--text-primary)]">{account.id}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              title="Copy address"
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              title="Show QR Code"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => {
              if (isCurrentFavorite) {
                setFavoriteLabel(currentFavorite?.label || '');
              }
              setShowFavoriteModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${isCurrentFavorite
              ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] hover:text-amber-600'
              }`}
          >
            <svg className="w-4 h-4" aria-hidden="true" fill={isCurrentFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {isCurrentFavorite ? 'Favorited' : 'Add to Favorites'}
          </button>
        </div>

        {/* Overview Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Card 1 - Overview */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] shadow-sm p-4">
            <h3 className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-3 pb-2 border-b border-[var(--border-subtle)]">Overview</h3>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">XLM Balance</div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCompactNumber(xlmAmount)} XLM</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">XLM Value</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  ${(xlmAmount * xlmPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs text-[var(--text-muted)] ml-1">(@ ${xlmPrice.toFixed(4)}/XLM)</span>
                </div>
              </div>

              <div ref={tokensDropdownRef} className="relative">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Token Holdings</div>
                <button
                  onClick={() => setShowTokensDropdown(!showTokensDropdown)}
                  className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-sky-600 transition-colors"
                >
                  <span>${tokensValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-xs text-[var(--text-muted)]">({otherBalances.length} tokens)</span>
                  <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${showTokensDropdown ? 'rotate-180' : ''}`} aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTokensDropdown && otherBalances.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {otherBalances.slice(0, 10).map((b, idx) => {
                      const key = `${b.asset_code}:${b.asset_issuer}`;
                      const priceData = assetPrices[key];
                      const value = priceData ? parseFloat(b.balance) * priceData.price : 0;
                      return (
                        <Link
                          key={idx}
                          href={getAssetUrl(b.asset_code, b.asset_issuer)}
                          className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-tertiary)] text-sm border-b border-[var(--border-subtle)] last:border-b-0"
                        >
                          <span className="font-medium text-[var(--text-primary)]">{b.asset_code || 'LP'}</span>
                          <span className="text-[var(--text-tertiary)]">${value.toFixed(2)}</span>
                        </Link>
                      );
                    })}
                    {otherBalances.length > 10 && (
                      <div className="px-3 py-2 text-xs text-[var(--text-muted)] text-center">
                        +{otherBalances.length - 10} more tokens
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2 - More Info */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] shadow-sm p-4">
            <h3 className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-3 pb-2 border-b border-[var(--border-subtle)]">More Info</h3>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Account Label</div>
                {currentAccountLabel?.name || currentFavorite?.label ? (
                  <div className="flex items-center gap-2">
                    {currentAccountLabel?.verified && (
                      <svg className="w-4 h-4 text-sky-500" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm font-medium text-[var(--text-primary)]">{currentFavorite?.label || currentAccountLabel?.name}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowFavoriteModal(true)}
                    className="text-sm text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    + Add Label
                  </button>
                )}
              </div>

              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Transactions</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {latestOpTime && <span>Latest: <span className="text-[var(--text-tertiary)]">{timeAgo(latestOpTime)}</span></span>}
                  {firstOpTime && latestOpTime !== firstOpTime && (
                    <span className="ml-3">First: <span className="text-[var(--text-tertiary)]">{timeAgo(firstOpTime)}</span></span>
                  )}
                </div>
              </div>

              {account.home_domain && (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Home Domain</div>
                  <a
                    href={`https://${account.home_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {account.home_domain}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Card 3 - Account Details */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] shadow-sm p-4">
            <h3 className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-3 pb-2 border-b border-[var(--border-subtle)]">Account Details</h3>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Sequence Number</div>
                <div className="text-sm font-mono text-[var(--text-secondary)]">{account.sequence}</div>
              </div>

              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Sub-entries</div>
                <div className="text-sm text-[var(--text-secondary)]">{account.subentry_count}</div>
              </div>

              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Signers</div>
                <div className="text-sm text-[var(--text-secondary)]">{account.signers.length}</div>
              </div>
            </div>
          </div>
        </div>

	        {/* Tabs Row */}
	        <div className="mb-4">
	          <GliderTabs
	            size="md"
	            className="border-[var(--border-default)]"
	            tabs={[
	              { id: 'assets', label: 'Assets' },
	              { id: 'transactions', label: 'Transactions' },
	              { id: 'operations', label: 'Operations' },
	              { id: 'details', label: 'Details' },
	            ] as const}
	            activeId={activeTab}
	            onChange={(id) => handleTabChange(id)}
	          />
	        </div>

          {/* Tab Content */}
          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
            <div className="p-0">
            {/* Transactions Tab - Placeholder */}
            {activeTab === 'transactions' && (
              <div>
                <div className="px-4 py-4 text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  Showing {allTransactions.length.toLocaleString()} latest transactions
                </div>
                <table className="w-full sc-table">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Txn Hash</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Ledger</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Age</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Source</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Operations</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {allTransactions.map((tx) => (
                      <tr key={tx.hash} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/transaction/${tx.hash}`} className="font-mono text-[13px] text-sky-600 hover:text-sky-700 hover:underline">
                            {shortenAddress(tx.hash, 8)}
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <Link href={`/ledger/${tx.ledger}`} className="text-[13px] text-sky-600 hover:underline">
                            {tx.ledger.toLocaleString()}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-[13px] text-[var(--text-tertiary)]">{timeAgo(tx.created_at)}</td>
                        <td className="py-3 px-3">
                          <Link href={`/account/${tx.source_account}`} className="font-mono text-[13px] text-[var(--text-secondary)] hover:text-sky-600 flex items-center gap-2">
                            <AccountBadges address={tx.source_account} labels={accountLabels} size="sm" />
                            {shortenAddress(tx.source_account, 6)}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-[13px] text-[var(--text-secondary)] text-right">{tx.operation_count}</td>
                        <td className="py-3 px-4 text-[13px] text-[var(--text-tertiary)] text-right font-mono">{(parseInt(tx.fee_charged) / 10000000).toFixed(7)} XLM</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {loadingMoreTx ? 'Loading more...' : hasMoreTransactions ? 'Scroll to load more...' : allTransactions.length > 0 ? 'End of results' : ''}
                    </div>
                    {hasMoreTransactions && (
                      <button
                        type="button"
                        onClick={fetchMoreTransactions}
                        disabled={loadingMoreTx}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-600 hover:bg-sky-50 disabled:opacity-50"
                      >
                        {loadingMoreTx ? 'Loading...' : 'Load More'}
                      </button>
                    )}
                  </div>
                  <div ref={txLoadMoreRef} className="h-1" />
                </div>
              </div>
            )}

            {/* Operations Tab */}
            {activeTab === 'operations' && (
              <div>
                <div className="px-4 py-4 text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  Showing {allOperations.length.toLocaleString()} latest operations
                </div>
                <table className="w-full sc-table">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Operation Hash</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Type</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Ledger</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Age</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">From</th>
                      <th className="py-3 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center w-8"></th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">To</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {allOperations.map((op) => {
                      const effects = opEffects[op.id];
                      const effectInfo = getAmountFromEffects(effects);
                      const category = getOperationCategory(op.type);
                      const isContract = op.type === 'invoke_host_function';

                      let displayLabel = category.label;
                      if (isContract) {
                        const fname = decodeContractFunctionName(op);
                        if (fname !== 'Contract Call') displayLabel = fname;
                      }

                      // Determine from/to addresses
                      let fromAddress = op.source_account;
                      let toAddress: string | null = null;

                      if (op.from) fromAddress = op.from;
                      if (op.to) toAddress = op.to;
                      else if ((op as any).into) toAddress = (op as any).into;

                      const isIncoming = effectInfo?.type === 'received';
                      const isOutgoing = effectInfo?.type === 'sent';

                      return (
                        <tr
                          key={op.id}
                          className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                          onClick={() => router.push(`/transaction/${op.transaction_hash}`)}
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/transaction/${op.transaction_hash}`}
                              className="font-mono text-sm text-sky-600 hover:text-sky-700 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {shortenAddress(op.transaction_hash, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.bgColor} ${category.color} border`}>
                              {displayLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/ledger/${(op as any).ledger || ''}`}
                              className="text-sm text-sky-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(op as any).ledger?.toLocaleString() || '-'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-tertiary)] whitespace-nowrap">
                            {timeAgo(op.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/account/${fromAddress}`}
                              className="font-mono text-sm text-[var(--text-secondary)] hover:text-sky-600 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AccountBadges address={fromAddress} labels={accountLabels} size="sm" />
                              {fromAddress === account.id ? (
                                <span className="text-[var(--text-muted)]">Self</span>
                              ) : (
                                shortenAddress(fromAddress, 6)
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            {effectInfo && (
                              <span className={`inline-flex items-center justify-center w-10 py-0.5 rounded text-[10px] font-bold uppercase ${isIncoming
                                ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                }`}>
                                {isIncoming ? 'IN' : 'OUT'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {toAddress ? (
                              <Link
                                href={`/account/${toAddress}`}
                                className="font-mono text-sm text-[var(--text-secondary)] hover:text-sky-600 flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AccountBadges address={toAddress} labels={accountLabels} size="sm" />
                                {toAddress === account.id ? (
                                  <span className="text-[var(--text-muted)]">Self</span>
                                ) : (
                                  shortenAddress(toAddress, 6)
                                )}
                              </Link>
                            ) : (
                              <span className="text-sm text-[var(--text-muted)]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {effectInfo ? (
                              <span className={`text-sm font-medium ${isIncoming ? 'text-emerald-600' : 'text-[var(--text-secondary)]'
                                }`}>
                                {isIncoming ? '+' : '-'}{formatCompactNumber(parseFloat(effectInfo.amount))} {effectInfo.asset}
                              </span>
                            ) : (
                              <span className="text-sm text-[var(--text-muted)]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {loadingMore ? 'Loading more...' : hasMoreToFetch ? 'Scroll to load more...' : allOperations.length > 0 ? 'End of results' : ''}
                    </div>
                    {hasMoreToFetch && (
                      <button
                        type="button"
                        onClick={fetchMoreOperations}
                        disabled={loadingMore}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-600 hover:bg-sky-50 disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading...' : 'Load More'}
                      </button>
                    )}
                  </div>
                  <div ref={opsLoadMoreRef} className="h-1" />
                </div>
              </div>
            )}

            {/* Assets Tab */}
            {activeTab === 'assets' && (
              <div>
                <table className="w-full sc-table">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left">Asset</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Balance</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Value</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Price</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">24H %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {/* XLM Row */}
                    <tr
                      className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      onClick={() => router.push('/asset/XLM')}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-sm text-[var(--text-primary)]">XLM</div>
                            <div className="text-xs text-[var(--text-muted)]">Stellar Lumens</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-mono text-sm text-[var(--text-primary)]" title={formatExactNumber(xlmAmount)}>
                          {formatCompactNumber(xlmAmount)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          ${(xlmAmount * xlmPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm text-[var(--text-secondary)]">${xlmPrice.toFixed(4)}</div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-medium ${xlmChange24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {xlmChange24h >= 0 ? '+' : ''}{xlmChange24h.toFixed(2)}%
                        </span>
                      </td>
                    </tr>

                    {/* Other Assets */}
                    {otherBalances.map((balance, idx) => {
                      const amount = parseFloat(balance.balance);
                      const key = `${balance.asset_code}:${balance.asset_issuer}`;
                      const priceData = assetPrices[key];
                      const valueUSD = priceData ? amount * priceData.price : 0;
                      const pnlPercent = priceData?.change24h || 0;

                      const bgColors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500', 'bg-violet-500'];
                      const colorIdx = (balance.asset_code || '').length % bgColors.length;

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                          onClick={() => router.push(getAssetUrl(balance.asset_code, balance.asset_issuer))}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${bgColors[colorIdx]} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                                {(balance.asset_code || 'LP')[0]}
                              </div>
                              <div>
                                <div className="font-medium text-sm text-[var(--text-primary)]">{balance.asset_code || 'LP'}</div>
                                <div className="text-xs text-[var(--text-muted)] capitalize">{balance.asset_type.replace(/_/g, ' ')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="font-mono text-sm text-[var(--text-primary)]" title={formatExactNumber(amount)}>
                              {formatCompactNumber(amount)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {valueUSD > 0 ? `$${valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-sm text-[var(--text-secondary)]">
                              {priceData ? `$${priceData.price.toFixed(priceData.price >= 1 ? 4 : 6)}` : '--'}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {priceData ? (
                              <span className={`text-sm font-medium ${pnlPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-sm text-[var(--text-muted)]">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Thresholds */}
                  <div>
                    <h3 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-3">Thresholds</h3>
                    <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
                      <div className="flex justify-between px-4 py-4">
                        <span className="text-sm text-[var(--text-secondary)]">Low Threshold</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{account.thresholds.low_threshold}</span>
                      </div>
                      <div className="flex justify-between px-4 py-4">
                        <span className="text-sm text-[var(--text-secondary)]">Medium Threshold</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{account.thresholds.med_threshold}</span>
                      </div>
                      <div className="flex justify-between px-4 py-4">
                        <span className="text-sm text-[var(--text-secondary)]">High Threshold</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{account.thresholds.high_threshold}</span>
                      </div>
                    </div>
                  </div>

                  {/* Flags */}
                  <div>
                      <h3 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-3">Flags</h3>
                      <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
                      {Object.entries(account.flags).map(([flag, enabled]) => (
                        <div key={flag} className="flex justify-between px-4 py-4">
                          <span className="text-sm text-[var(--text-secondary)] capitalize">{flag.replace('auth_', '').replace(/_/g, ' ')}</span>
                          <span className={`text-sm font-medium ${enabled ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                            {enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Signers */}
                  <div className="md:col-span-2">
                    <h3 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-3">Signers ({account.signers.length})</h3>
                    <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                      <table className="w-full sc-table">
                        <thead>
                          <tr className="text-left text-xs text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-default)]">
                            <th className="px-4 py-2 font-medium">Key</th>
                            <th className="px-4 py-2 font-medium">Type</th>
                            <th className="px-4 py-2 font-medium text-right">Weight</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                          {account.signers.map((signer, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3">
                                <Link
                                  href={`/account/${signer.key}`}
                                  className="font-mono text-sm text-sky-600 hover:underline"
                                >
                                  {shortenAddress(signer.key, 12)}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-sm text-[var(--text-secondary)] capitalize">{signer.type.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)] text-right">{signer.weight}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sponsorship */}
                  <div className="md:col-span-2">
                    <h3 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-3">Sponsorship Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)] p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600">{account.num_sponsoring}</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">Sponsoring</div>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)] p-4 text-center">
                        <div className="text-2xl font-bold text-violet-600">{account.num_sponsored}</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">Sponsored</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] rounded-lg p-4 mx-4 max-w-sm w-full shadow-2xl border border-[var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Account QR Code</h3>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">Scan to get address</p>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border border-[var(--border-default)]">
                <QRCodeSVG
                  value={account.id}
                  size={180}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 mb-4 border border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-muted)] mb-1 font-medium uppercase">Address</p>
              <p className="text-xs font-mono text-[var(--text-secondary)] break-all">{account.id}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(account.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 py-2.5 rounded-lg bg-sky-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-sky-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-2.5 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium text-sm hover:bg-[var(--bg-primary)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorite Modal */}
      {showFavoriteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowFavoriteModal(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] rounded-lg p-4 mx-4 max-w-sm w-full shadow-2xl border border-[var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-500" aria-hidden="true" fill={isCurrentFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {isCurrentFavorite ? 'Edit Favorite' : 'Add to Favorites'}
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">{shortenAddress(account.id, 8)}</p>
            </div>

            <div className="mb-4">
              <label className="text-xs text-[var(--text-tertiary)] font-medium mb-2 block">
                Label (optional)
              </label>
              <input
                type="text"
                value={favoriteLabel}
                onChange={(e) => setFavoriteLabel(e.target.value)}
                placeholder="e.g. My Wallet, Exchange..."
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex gap-2">
              {isCurrentFavorite ? (
                <>
                  <button
                    onClick={() => {
                      updateFavoriteLabel(account.id, favoriteLabel);
                      setShowFavoriteModal(false);
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      removeFavorite(account.id);
                      setFavoriteLabel('');
                      setShowFavoriteModal(false);
                    }}
                    className="py-2.5 px-4 rounded-lg bg-rose-50 text-rose-700 font-medium text-sm border border-rose-100 hover:bg-rose-100 transition-colors"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    addFavorite(account.id, favoriteLabel || undefined);
                    setFavoriteLabel('');
                    setShowFavoriteModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                >
                  <svg className="w-4 h-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Add Favorite
                </button>
              )}
              <button
                onClick={() => setShowFavoriteModal(false)}
                className="py-2.5 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium text-sm hover:bg-[var(--bg-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
