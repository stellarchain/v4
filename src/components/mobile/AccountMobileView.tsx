'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Transaction, Operation, Effect, shortenAddress, formatXLM, AccountLabel, getBaseUrl } from '@/lib/stellar';
import { containers, colors, coreColors, tabs, badges } from '@/lib/design-system';
import { QRCodeSVG } from 'qrcode.react';
import { useFavorites } from '@/contexts/FavoritesContext';

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

function formatBalanceDisplay(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

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

interface AccountMobileViewProps {
  account: AccountData;
  transactions: Transaction[];
  operations: Operation[];
  xlmPrice: number;
  accountLabels?: Record<string, AccountLabel>;
  currentAccountLabel?: AccountLabel | null;
}

function getAssetUrl(code: string | undefined, issuer: string | undefined): string {
  if (!code || code === 'native') return '/asset/XLM';
  if (code === 'XLM' && !issuer) return '/asset/XLM';
  return `/asset/${encodeURIComponent(code)}${issuer ? `?issuer=${encodeURIComponent(issuer)}` : ''}`;
}

export default function AccountMobileView({ account, transactions, operations: initialOperations, xlmPrice, accountLabels = {}, currentAccountLabel }: AccountMobileViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Read initial tab from URL params
  const initialTab = (searchParams.get('tab') as 'assets' | 'activity' | 'details') || 'assets';
  const [activeTab, setActiveTab] = useState<'assets' | 'activity' | 'details'>(initialTab);
  const [activityType, setActivityType] = useState<'all' | 'payments' | 'swaps' | 'contracts'>('all');
  const [showUsdValue, setShowUsdValue] = useState(false);
  const [hideSmallAssets, setHideSmallAssets] = useState(false);
  const [hidePnl, setHidePnl] = useState(false);
  const [showAssetsFilterDropdown, setShowAssetsFilterDropdown] = useState(false);
  const assetsFilterRef = useRef<HTMLDivElement>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const [currencyRates, setCurrencyRates] = useState<{ EUR: number; GBP: number }>({ EUR: 0.92, GBP: 0.79 });
  const [showActivityFilterDropdown, setShowActivityFilterDropdown] = useState(false);
  const activityFilterRef = useRef<HTMLDivElement>(null);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [favoriteLabel, setFavoriteLabel] = useState('');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const { favorites, addFavorite, removeFavorite, updateFavoriteLabel, isFavorite, getFavorite } = useFavorites();
  const isCurrentFavorite = isFavorite(account.id);
  const currentFavorite = getFavorite(account.id);

  // Update URL when tab changes
  const handleTabChange = (tab: 'assets' | 'activity' | 'details') => {
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
  const [assetPrices, setAssetPrices] = useState<Record<string, AssetPriceData>>({});
  const [opEffects, setOpEffects] = useState<Record<string, Effect[]>>({});
  const [xlmChange24h, setXlmChange24h] = useState(0);
  const [activityAssets, setActivityAssets] = useState<Array<{ code: string; issuer: string; type: string }>>([]);

  // Operations state for infinite scroll
  const [allOperations, setAllOperations] = useState<Operation[]>(initialOperations);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreToFetch, setHasMoreToFetch] = useState(initialOperations.length >= 100);
  const [lastCursor, setLastCursor] = useState<string | null>(
    initialOperations.length > 0 ? initialOperations[initialOperations.length - 1].paging_token : null
  );

  // Sync operations state when initialOperations prop changes (e.g., page revalidation, navigation)
  useEffect(() => {
    // Sort operations by date descending to ensure newest are first
    const sortedOps = [...initialOperations].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setAllOperations(sortedOps);
    setHasMoreToFetch(initialOperations.length >= 100);
    setLastCursor(
      initialOperations.length > 0 ? initialOperations[initialOperations.length - 1].paging_token : null
    );
  }, [initialOperations]);

  // Close activity filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activityFilterRef.current && !activityFilterRef.current.contains(e.target as Node)) {
        setShowActivityFilterDropdown(false);
      }
    };
    if (showActivityFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActivityFilterDropdown]);

  // Close address dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(e.target as Node)) {
        setShowAddressDropdown(false);
      }
    };
    if (showAddressDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddressDropdown]);

  // Close assets filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assetsFilterRef.current && !assetsFilterRef.current.contains(e.target as Node)) {
        setShowAssetsFilterDropdown(false);
      }
    };
    if (showAssetsFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssetsFilterDropdown]);

  // Close currency dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target as Node)) {
        setShowCurrencyDropdown(false);
      }
    };
    if (showCurrencyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCurrencyDropdown]);

  // Fetch currency conversion rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data.rates) {
          setCurrencyRates({
            EUR: data.rates.EUR || 0.92,
            GBP: data.rates.GBP || 0.79,
          });
        }
      } catch (e) {
        console.error('Failed to fetch currency rates', e);
      }
    };
    fetchRates();
  }, []);

  // Currency conversion helper
  const convertCurrency = (usdAmount: number): number => {
    if (selectedCurrency === 'USD') return usdAmount;
    return usdAmount * currencyRates[selectedCurrency];
  };

  const currencySymbol = selectedCurrency === 'USD' ? '$' : selectedCurrency === 'EUR' ? '€' : '£';

  // Refs for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activityContainerRef = useRef<HTMLDivElement>(null);

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

  // Calculate 24h PNL
  const pnlData = useMemo(() => {
    let totalPnlUSD = 0;

    // XLM PNL
    const xlmValue = xlmAmount * xlmPrice;
    const xlmPnl = xlmValue * (xlmChange24h / 100);
    totalPnlUSD += xlmPnl;

    // Other assets PNL
    otherBalances.forEach(b => {
      const key = `${b.asset_code}:${b.asset_issuer}`;
      const priceData = assetPrices[key];
      if (priceData && priceData.price > 0) {
        const value = parseFloat(b.balance) * priceData.price;
        const pnl = value * (priceData.change24h / 100);
        totalPnlUSD += pnl;
      }
    });

    const pnlPercent = totalValueUSD > 0 ? (totalPnlUSD / (totalValueUSD - totalPnlUSD)) * 100 : 0;
    return { amount: totalPnlUSD, percent: pnlPercent };
  }, [xlmAmount, xlmPrice, xlmChange24h, otherBalances, assetPrices, totalValueUSD]);

  // Fetch XLM 24h change
  useEffect(() => {
    const fetchXlmChange = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true');
        const data = await res.json();
        if (data.stellar?.usd_24h_change) {
          setXlmChange24h(data.stellar.usd_24h_change);
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
          // Get current price in XLM
          const res = await fetch(
            `${getBaseUrl()}/order_book?selling_asset_type=${b.asset_type}&selling_asset_code=${b.asset_code}&selling_asset_issuer=${b.asset_issuer}&buying_asset_type=native&limit=1`
          );
          const data = await res.json();

          if (data.bids && data.bids.length > 0) {
            const priceInXlm = parseFloat(data.bids[0].price);
            const priceUSD = priceInXlm * xlmPrice;

            // Get 24h ago price from trade aggregations (use 1h resolution for better data availability)
            const endTime = Date.now();
            const startTime = endTime - 86400000;
            const aggRes = await fetch(
              `${getBaseUrl()}/trade_aggregations?base_asset_type=${b.asset_type}&base_asset_code=${b.asset_code}&base_asset_issuer=${b.asset_issuer}&counter_asset_type=native&resolution=3600000&start_time=${startTime}&end_time=${endTime}&limit=24&order=asc`
            );
            const aggData = await aggRes.json();

            let change24h = 0;
            const records = aggData._embedded?.records || [];
            if (records.length > 0) {
              // Get the oldest record's open price as our 24h ago reference
              const oldestRecord = records[0];
              const openPriceXlm = parseFloat(oldestRecord.open);
              if (openPriceXlm > 0) {
                // Calculate change in XLM terms
                const xlmPriceChange = ((priceInXlm - openPriceXlm) / openPriceXlm) * 100;
                // Add XLM's own USD change to get total USD change
                change24h = xlmPriceChange + xlmChange24h;
              }
            } else {
              // No trade data, but still affected by XLM price change
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

  // Fetch more operations for infinite scroll
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
        setAllOperations(prev => [...prev, ...newOps]);
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

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || activeTab !== 'activity') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreToFetch && !loadingMore) {
          fetchMoreOperations();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, hasMoreToFetch, loadingMore, fetchMoreOperations]);

  // Reset scroll position when filter changes
  useEffect(() => {
    if (activityContainerRef.current) {
      activityContainerRef.current.scrollTop = 0;
    }
    // Also scroll the window to the top of the activity section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activityType]);

  // Fetch effects for operations that don't have them yet
  useEffect(() => {
    const fetchEffects = async () => {
      // Get operations that need effects fetched (limit batch size for performance)
      const opsNeedingEffects = allOperations
        .filter(op => !opEffects[op.id])
        .slice(0, 20); // Fetch effects in batches of 20

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

  // Fetch prices for activity assets that aren't in account balances
  useEffect(() => {
    const fetchActivityPrices = async () => {
      const newPrices: Record<string, AssetPriceData> = {};

      // Filter to assets we don't have prices for yet
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

    // Get all credits and debits for this account
    const credits = effects.filter(e => e.type === 'account_credited' && e.account === account.id && (e as any).amount);
    const debits = effects.filter(e => e.type === 'account_debited' && e.account === account.id && (e as any).amount);

    // Find the largest credit and debit by amount
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

    // Fallback to any account's effects if none for this account
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

    // Return the larger of credit or debit (most significant effect)
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

  // Filter operations
  // Payments: all value transfers including path payments (swaps)
  const allPaymentOps = allOperations.filter(op =>
    op.type === 'payment' || op.type === 'create_account' ||
    op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive'
  );

  // Swaps: all DEX activity (path payments + offers + contract swaps)
  const allSwapOps = allOperations.filter(op =>
    op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive' ||
    op.type === 'manage_sell_offer' || op.type === 'manage_buy_offer' ||
    op.type === 'create_passive_sell_offer' ||
    (op.type === 'invoke_host_function' && decodeContractFunctionName(op).toLowerCase() === 'swap')
  );

  // Contracts: exclude swaps (they go in Swaps tab)
  const allContractOps = allOperations.filter(op =>
    (op.type === 'invoke_host_function' && decodeContractFunctionName(op).toLowerCase() !== 'swap') ||
    op.type === 'extend_footprint_ttl' || op.type === 'restore_footprint'
  );

  const getCurrentDataSource = () => {
    if (activityType === 'payments') return allPaymentOps;
    if (activityType === 'swaps') return allSwapOps;
    if (activityType === 'contracts') return allContractOps;
    return allOperations;
  };

  const currentDataSource = getCurrentDataSource();

  const isPositivePnl = pnlData.amount >= 0;

  return (
    <div className={containers.page}>
      {/* Header */}
      <header className="pt-8 px-3 pb-2 sticky top-0 z-20 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-default)]">
        {/* Title Row with symmetric buttons */}
        <div className="flex items-center justify-between mb-2">
          {/* QR Code Button - Left */}
          <button
            onClick={() => setShowQrModal(true)}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border-default)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>

          {/* Title - Center */}
          <div className="text-center flex-1 min-w-0 px-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              {currentFavorite?.label || currentAccountLabel?.name || 'Account'}
            </h1>
          </div>

          {/* Favorite Button - Right */}
          <button
            onClick={() => {
              if (isCurrentFavorite) {
                setFavoriteLabel(currentFavorite?.label || '');
              }
              setShowFavoriteModal(true);
            }}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors border ${
              isCurrentFavorite
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-amber-500 border-[var(--border-default)]'
            }`}
          >
            <svg className="w-5 h-5" fill={isCurrentFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        </div>

        {/* Address Dropdown - Centered */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div ref={addressDropdownRef} className="relative">
            <button
              onClick={() => setShowAddressDropdown(!showAddressDropdown)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)] font-mono hover:text-[var(--text-primary)] transition-colors"
            >
              {shortenAddress(account.id, 6)}
              <svg className={`w-3.5 h-3.5 transition-transform ${showAddressDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showAddressDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-lg overflow-hidden z-50 p-3 min-w-[280px]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">Full Address</div>
                <div className="bg-[var(--bg-tertiary)] rounded-lg p-2.5 border border-[var(--border-subtle)]">
                  <p className="font-mono text-[11px] text-[var(--text-primary)] break-all leading-relaxed select-all">{account.id}</p>
                </div>
                <button
                  onClick={() => { handleCopy(); setShowAddressDropdown(false); }}
                  className="mt-2 w-full py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Address
                </button>
              </div>
            )}
          </div>
          {/* Account Badge - clickable */}
          {(() => {
            // Determine badge type - check dangerous labels FIRST before verified
            const labelName = currentAccountLabel?.name?.toLowerCase() || '';
            const isHack = labelName.includes('hack') || labelName.includes('malicious');
            const isScam = labelName.includes('scam');
            const isSpam = labelName.includes('spam');

            return (
              <button onClick={() => setShowBadgeModal(true)} className="flex-shrink-0">
                {isHack ? (
                  // Hack/Malicious badge - red
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#EF4444">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                    <path d="M12 7v6m0 2v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : isScam ? (
                  // Scam badge - red
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#EF4444">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                    <path d="M12 7v6m0 2v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : isSpam ? (
                  // Spam badge - orange
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#F97316">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                    <path d="M12 7v6m0 2v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : currentAccountLabel?.verified ? (
                  // Verified badge - blue (only if NOT dangerous)
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#1D9BF0">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                  </svg>
                ) : currentAccountLabel?.name ? (
                  // User labeled (has name but not verified, not dangerous) - gray
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#6B7280">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                    <circle cx="12" cy="10" r="3" fill="white"/>
                    <path d="M18 18.5c0-2.5-2.7-4.5-6-4.5s-6 2-6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                ) : (
                  // Unknown - gray
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#6B7280">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">?</text>
                  </svg>
                )}
              </button>
            );
          })()}
        </div>

        {/* Total Balance Section - Centered */}
        <div className="text-center mb-5">
          <div className="text-sm text-[var(--text-tertiary)] mb-1">
            Total Balance
          </div>
          <div className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            {currencySymbol}{convertCurrency(totalValueUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <span className={`text-sm font-semibold ${isPositivePnl ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {isPositivePnl ? '+' : '-'}{currencySymbol}{Math.abs(convertCurrency(pnlData.amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositivePnl ? '+' : ''}{pnlData.percent.toFixed(2)}%)
            </span>
            <span className="text-sm text-[var(--text-muted)]">24H</span>
          </div>
        </div>

        {/* Tabs - Glider Style */}
        {(() => {
          const tabs = [
            { id: 'assets', label: 'Assets' },
            { id: 'activity', label: 'Activity' },
            { id: 'details', label: 'Details' },
          ];
          const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab);
          const tabCount = tabs.length;

          return (
            <div className="relative flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl shadow-sm border border-[var(--border-subtle)]">
              {/* Glider Background */}
              <div
                className="absolute top-1 bottom-1 bg-[var(--primary-blue)]/10 rounded-lg transition-all duration-300 ease-out z-0"
                style={{
                  left: '4px',
                  width: `calc((100% - 8px) / ${tabCount})`,
                  transform: `translateX(${activeTabIndex >= 0 ? activeTabIndex * 100 : 0}%)`,
                  opacity: activeTabIndex >= 0 ? 1 : 0
                }}
              />

              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as 'assets' | 'activity' | 'details')}
                    className={`relative z-10 flex-1 py-1.5 text-[11px] rounded-lg transition-colors duration-200 text-center ${
                      isActive
                        ? 'text-[var(--primary-blue)] font-bold'
                        : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          );
        })()}
      </header>

      {/* Main Content */}
      <main className="px-3">
        {activeTab === 'assets' && (
          <div className="space-y-2 pt-2">
            {/* Filter Row */}
            <div className="flex items-center justify-between mb-1 mt-1">
              {/* Filter Dropdown */}
              <div ref={assetsFilterRef} className="relative">
                <button
                  onClick={() => setShowAssetsFilterDropdown(!showAssetsFilterDropdown)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${
                    (hideSmallAssets || hidePnl)
                      ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] border-[var(--primary-blue)]/20'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <svg className={`w-3 h-3 transition-transform ${showAssetsFilterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showAssetsFilterDropdown && (
                  <div className="absolute left-0 top-full mt-1 min-w-[140px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden z-50">
                    <button
                      onClick={() => setHidePnl(!hidePnl)}
                      className={`w-full text-left px-3 py-2.5 text-[11px] font-medium flex items-center justify-between ${
                        hidePnl ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <span>Hide PNL</span>
                      {hidePnl && (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setHideSmallAssets(!hideSmallAssets)}
                      className={`w-full text-left px-3 py-2.5 text-[11px] font-medium flex items-center justify-between ${
                        hideSmallAssets ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <span>Hide &lt;$1</span>
                      {hideSmallAssets && (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div></div>
            </div>

            {/* XLM Card */}
            {(!hideSmallAssets || (xlmAmount * xlmPrice) >= 1) && (
              <div
                className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                onClick={() => router.push('/asset/XLM')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-[var(--bg-secondary)]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">XLM</div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-[var(--text-muted)]">{currencySymbol}{convertCurrency(xlmAmount * xlmPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        {!hidePnl && (
                          <span className={`font-medium ${xlmChange24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                            {xlmChange24h >= 0 ? '+' : ''}{xlmChange24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-[var(--text-primary)]" title={formatExactNumber(xlmAmount)}>
                      {formatCompactNumber(xlmAmount)}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      @{currencySymbol}{convertCurrency(xlmPrice).toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Assets */}
            {otherBalances
              .filter((balance) => {
                if (!hideSmallAssets) return true;
                const amount = parseFloat(balance.balance);
                const key = `${balance.asset_code}:${balance.asset_issuer}`;
                const priceData = assetPrices[key];
                const valueUSD = priceData ? amount * priceData.price : 0;
                return valueUSD >= 1;
              })
              .map((balance, idx) => {
                const amount = parseFloat(balance.balance);
                const key = `${balance.asset_code}:${balance.asset_issuer}`;
                const priceData = assetPrices[key];
                const valueUSD = priceData ? amount * priceData.price : 0;
                const pnlPercent = priceData?.change24h || 0;

                const bgColors = ['bg-blue-500/10', 'bg-purple-500/10', 'bg-[var(--success)]/10', 'bg-orange-500/10', 'bg-pink-500/10', 'bg-indigo-500/10', 'bg-violet-500/10'];
                const textColors = ['text-blue-400', 'text-purple-400', 'text-[var(--success)]', 'text-orange-400', 'text-pink-400', 'text-indigo-400', 'text-violet-400'];
                const colorIdx = (balance.asset_code || '').length % bgColors.length;

                return (
                  <div
                    key={idx}
                    className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    onClick={() => router.push(getAssetUrl(balance.asset_code, balance.asset_issuer))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${bgColors[colorIdx]} flex items-center justify-center ${textColors[colorIdx]}`}>
                          <span className="font-bold text-base">{(balance.asset_code || 'LP')[0]}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">{balance.asset_code || 'LP'}</div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-[var(--text-muted)]">
                              {valueUSD > 0 ? `${currencySymbol}${convertCurrency(valueUSD).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '--'}
                            </span>
                            {!hidePnl && priceData ? (
                              <span className={`font-medium ${pnlPercent >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-[var(--text-primary)]" title={formatExactNumber(amount)}>
                          {formatCompactNumber(amount)}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {priceData ? `@${currencySymbol}${convertCurrency(priceData.price).toFixed(priceData.price >= 1 ? 2 : 6)}` : (
                            balance.asset_issuer ? (
                              <Link href={`/account/${balance.asset_issuer}`} onClick={(e) => e.stopPropagation()} className="hover:text-[var(--primary-blue)]">
                                {shortenAddress(balance.asset_issuer, 4)}
                              </Link>
                            ) : 'LP'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {activeTab === 'activity' && (
          <div ref={activityContainerRef}>
            {/* Activity Filters */}
            <div className="flex items-center justify-between mb-3 mt-3">
              {/* Filter Dropdown */}
              <div ref={activityFilterRef} className="relative">
                <button
                  onClick={() => setShowActivityFilterDropdown(!showActivityFilterDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>{activityType === 'all' ? 'All' : activityType === 'payments' ? 'Payments' : activityType === 'swaps' ? 'Swaps' : 'Contracts'}</span>
                  <svg className={`w-3 h-3 transition-transform ${showActivityFilterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showActivityFilterDropdown && (
                  <div className="absolute left-0 top-full mt-1 min-w-[120px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden z-50">
                    {(['all', 'payments', 'swaps', 'contracts'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => { setActivityType(type); setShowActivityFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-[11px] font-medium ${activityType === type ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                      >
                        {type === 'all' ? 'All' : type === 'payments' ? 'Payments' : type === 'swaps' ? 'Swaps' : 'Contracts'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Currency Dropdown */}
              <div ref={currencyDropdownRef} className="relative">
                <button
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${
                    showUsdValue
                      ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] border-[var(--primary-blue)]/20'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <span>{currencySymbol}</span>
                  <span>{selectedCurrency}</span>
                  <svg className={`w-3 h-3 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCurrencyDropdown && (
                  <div className="absolute right-0 top-full mt-1 min-w-[100px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden z-50">
                    <button
                      onClick={() => { setShowUsdValue(!showUsdValue); setShowCurrencyDropdown(false); }}
                      className={`w-full text-left px-3 py-2.5 text-[11px] font-medium flex items-center justify-between ${
                        showUsdValue ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <span>Show Value</span>
                      {showUsdValue && (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="border-t border-[var(--border-subtle)]">
                      {(['USD', 'EUR', 'GBP'] as const).map((currency) => (
                        <button
                          key={currency}
                          onClick={() => { setSelectedCurrency(currency); setShowCurrencyDropdown(false); }}
                          className={`w-full text-left px-3 py-2.5 text-[11px] font-medium flex items-center justify-between ${
                            selectedCurrency === currency ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                          }`}
                        >
                          <span>{currency === 'USD' ? '$ USD' : currency === 'EUR' ? '€ EUR' : '£ GBP'}</span>
                          {selectedCurrency === currency && (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {currentDataSource.length === 0 ? (
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] text-center py-8 text-[var(--text-muted)]">
                <p className="text-xs font-medium">No activity found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  // Group operations by date
                  const getDateKey = (dateStr: string) => {
                    const date = new Date(dateStr);
                    return date.toDateString();
                  };

                  const formatDateHeader = (dateStr: string) => {
                    const date = new Date(dateStr);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    if (date.toDateString() === today.toDateString()) {
                      return 'Today';
                    } else if (date.toDateString() === yesterday.toDateString()) {
                      return 'Yesterday';
                    } else {
                      return date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                    }
                  };

                  let lastDateKey = '';

                  return currentDataSource.map((op, index) => {
                    const currentDateKey = getDateKey(op.created_at);
                    const showDateHeader = currentDateKey !== lastDateKey;
                    lastDateKey = currentDateKey;

                    const isSwap = op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                    const isOffer = op.type === 'manage_sell_offer' || op.type === 'manage_buy_offer' || op.type === 'create_passive_sell_offer';
                    const isPayment = op.type === 'payment' || op.type === 'create_account';
                    const isContract = op.type === 'invoke_host_function' || op.type === 'extend_footprint_ttl' || op.type === 'restore_footprint';

                    const effects = opEffects[op.id];
                    const effectInfo = getAmountFromEffects(effects);

                    let typeDisplay = op.type.replace(/_/g, ' ');
                    let amount = '';
                    let asset = '';
                    let assetIssuer: string | null = null;
                    let counterpartyLink: string | null = null;

                    if (isContract) {
                      typeDisplay = decodeContractFunctionName(op);
                      if (effectInfo) {
                        amount = formatXLM(effectInfo.amount || '0');
                        asset = effectInfo.asset;
                        assetIssuer = effectInfo.asset_issuer || null;
                      }
                    } else if (isPayment) {
                      // For create_account, destination is in 'account' field; for payment it's in 'to'
                      const isCreateAccount = op.type === 'create_account';
                      const destination = isCreateAccount ? (op as any).account : op.to;
                      const sender = op.from || (op as any).funder || op.source_account;
                      const isReceive = destination === account.id;
                      // Get counterparty address and label
                      const counterpartyAddress = isReceive ? sender : destination;
                      const counterpartyLabel = counterpartyAddress ? accountLabels[counterpartyAddress]?.name : null;
                      typeDisplay = counterpartyLabel || (counterpartyAddress ? shortenAddress(counterpartyAddress, 4) : (isReceive ? 'Received' : 'Sent'));
                      counterpartyLink = counterpartyAddress || null;
                      amount = formatXLM(op.amount || (op as any).starting_balance || '0');
                      asset = op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM';
                      assetIssuer = op.asset_issuer || null;
                    } else if (isSwap) {
                      typeDisplay = 'Swap';
                      const sourceAssetType = (op as any).source_asset_type;
                      const sourceAssetCode = (op as any).source_asset_code;
                      const sourceAssetIssuer = (op as any).source_asset_issuer;
                      amount = formatXLM(op.amount || '0');
                      asset = sourceAssetType === 'native' ? 'XLM' : sourceAssetCode || '';
                      assetIssuer = sourceAssetIssuer || null;
                    } else if (isOffer) {
                      typeDisplay = op.type === 'manage_sell_offer' ? 'Sell Offer' : op.type === 'manage_buy_offer' ? 'Buy Offer' : 'Passive Offer';
                      amount = formatXLM(op.amount || '0');
                      asset = (op as any).selling_asset_type === 'native' ? 'XLM' : (op as any).selling_asset_code || '';
                      assetIssuer = (op as any).selling_asset_issuer || null;
                    } else if (effectInfo) {
                      // For other operations with effects, just get the amount/asset
                      // Keep the operation type name (already set above)
                      amount = formatXLM(effectInfo.amount || '0');
                      asset = effectInfo.asset;
                      assetIssuer = effectInfo.asset_issuer || null;
                      // Only try to show counterparty if the operation has one (to/from fields)
                      const destination = op.to || (op as any).account;
                      const sender = op.from || (op as any).funder;
                      if (destination || sender) {
                        const isReceive = effectInfo.type === 'received';
                        const counterpartyAddress = isReceive ? sender : destination;
                        if (counterpartyAddress) {
                          const counterpartyLabel = accountLabels[counterpartyAddress]?.name;
                          typeDisplay = counterpartyLabel || shortenAddress(counterpartyAddress, 4);
                          counterpartyLink = counterpartyAddress;
                        }
                      }
                      // Otherwise keep typeDisplay as the operation type name
                    }

                    const isReceive = effectInfo?.type === 'received' || op.to === account.id;
                    const isSwapOrOffer = isSwap || isOffer;
                    const isSwapDisplay = typeDisplay.toLowerCase() === 'swap';

                    const colorIdx = (isSwapOrOffer || isSwapDisplay) ? 2 : (isContract ? 3 : (isReceive ? 0 : 1));
                    const bgColors = ['bg-[var(--success)]/10', 'bg-[var(--error)]/10', 'bg-blue-500/10', 'bg-purple-500/10', 'bg-orange-500/10'];
                    const textColors = ['text-[var(--success)]', 'text-[var(--error)]', 'text-blue-400', 'text-purple-400', 'text-orange-400'];

                    const timeStr = new Date(op.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={op.id}>
                        {showDateHeader && (
                          <div className={`text-sm font-semibold text-[var(--text-primary)] ${index > 0 ? 'mt-4' : ''} mb-2 px-1`}>
                            {formatDateHeader(op.created_at)}
                          </div>
                        )}
                        <div
                          className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                          onClick={() => router.push(`/transaction/${op.transaction_hash}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${bgColors[colorIdx]} flex items-center justify-center ${textColors[colorIdx]}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {(isSwapOrOffer || isSwapDisplay) ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  ) : isReceive ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                  ) : isContract ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                  )}
                                </svg>
                              </div>
                              <div>
                                {counterpartyLink ? (
                                  <Link
                                    href={`/account/${counterpartyLink}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm font-semibold capitalize text-[var(--primary-blue)] hover:underline"
                                  >
                                    {typeDisplay}
                                  </Link>
                                ) : (
                                  <div className="text-sm font-semibold capitalize text-[var(--text-primary)]">{typeDisplay}</div>
                                )}
                                <div className="text-xs text-[var(--text-muted)] font-medium">{timeStr}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              {amount ? (
                                (() => {
                                  // Calculate USD value
                                  const numAmount = parseFloat(amount.replace(/,/g, ''));
                                  let usdValue: number | null = null;

                                  if (asset === 'XLM') {
                                    usdValue = numAmount * xlmPrice;
                                  } else if (asset === 'USDC' || asset === 'yUSDC') {
                                    usdValue = numAmount;
                                  } else {
                                    // Try to find price using full key first (code:issuer)
                                    if (assetIssuer) {
                                      const fullKey = `${asset}:${assetIssuer}`;
                                      if (assetPrices[fullKey]) {
                                        usdValue = numAmount * assetPrices[fullKey].price;
                                      }
                                    }
                                    // Fallback: try to find any matching asset code
                                    if (usdValue === null) {
                                      const priceKey = Object.keys(assetPrices).find(k => k.startsWith(`${asset}:`));
                                      if (priceKey && assetPrices[priceKey]) {
                                        usdValue = numAmount * assetPrices[priceKey].price;
                                      }
                                    }
                                  }

                                  return (
                                    <>
                                      <div className={`text-sm font-bold ${isReceive ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                                        {showUsdValue && usdValue !== null ? (
                                          <>{isReceive ? '+' : '-'}${usdValue < 0.01
                                            ? usdValue.toFixed(8).replace(/\.?0+$/, '')
                                            : usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                                        ) : (
                                          <>{isReceive ? '+' : '-'}{amount}</>
                                        )}
                                      </div>
                                      <div className="text-xs text-[var(--text-muted)] font-medium">
                                        {showUsdValue && usdValue !== null ? 'USD' : asset}
                                      </div>
                                    </>
                                  );
                                })()
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Infinite scroll sentinel and loading/status indicators */}
                <div ref={sentinelRef} className="py-4">
                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[var(--primary-blue)] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-[var(--text-tertiary)]">Loading more...</span>
                    </div>
                  )}

                  {!loadingMore && hasMoreToFetch && (
                    <button
                      onClick={fetchMoreOperations}
                      className="w-full py-3 text-xs font-semibold text-[var(--primary-blue)] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm active:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      Load more activity
                    </button>
                  )}

                  {!hasMoreToFetch && currentDataSource.length > 0 && (
                    <div className="text-center py-2">
                      <span className="text-xs font-medium text-[var(--text-muted)]">No more activity to load</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-3 pt-2">
            {/* Account Info Section */}
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold pb-2 border-b border-[var(--border-subtle)] mb-3">
                Account Info
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">Account ID</div>
                    <div className="text-sm font-mono text-[var(--text-primary)] truncate">{shortenAddress(account.id, 10)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">Sequence Number</div>
                    <div className="text-sm font-mono text-[var(--text-primary)]">{account.sequence}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">Subentries</div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{account.subentry_count}</div>
                  </div>
                </div>
                {account.home_domain && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-[var(--text-muted)] font-medium">Home Domain</div>
                      <a href={`https://${account.home_domain}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--primary-blue)] hover:underline">
                        {account.home_domain}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thresholds Section */}
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold pb-2 border-b border-[var(--border-subtle)] mb-3">
                Thresholds
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)] font-medium mb-1">Low</div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">{account.thresholds.low_threshold}</div>
                </div>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)] font-medium mb-1">Medium</div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">{account.thresholds.med_threshold}</div>
                </div>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)] font-medium mb-1">High</div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">{account.thresholds.high_threshold}</div>
                </div>
              </div>
            </div>

            {/* Signers Section */}
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold pb-2 border-b border-[var(--border-subtle)] mb-3">
                Signers ({account.signers.length})
              </div>
              <div className="space-y-2">
                {account.signers.map((signer, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/account/${signer.key}`} className="text-sm font-mono text-[var(--text-primary)] hover:text-[var(--primary-blue)] truncate block">
                        {shortenAddress(signer.key, 8)}
                      </Link>
                      <div className="text-[11px] text-[var(--text-muted)] capitalize">{signer.type.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[var(--text-primary)]">{signer.weight}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">weight</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flags Section */}
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold pb-2 border-b border-[var(--border-subtle)] mb-3">
                Account Flags
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-xl p-3 border ${account.flags.auth_required ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_required ? 'bg-amber-500' : 'bg-[var(--text-muted)]'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_required ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>Auth Required</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Requires authorization for trustlines</p>
                </div>
                <div className={`rounded-xl p-3 border ${account.flags.auth_revocable ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_revocable ? 'bg-orange-500' : 'bg-[var(--text-muted)]'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_revocable ? 'text-orange-400' : 'text-[var(--text-muted)]'}`}>Auth Revocable</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Can revoke trustlines</p>
                </div>
                <div className={`rounded-xl p-3 border ${account.flags.auth_immutable ? 'bg-[var(--error)]/10 border-[var(--error)]/20' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_immutable ? 'bg-[var(--error)]' : 'bg-[var(--text-muted)]'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_immutable ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}>Auth Immutable</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Flags cannot be changed</p>
                </div>
                <div className={`rounded-xl p-3 border ${account.flags.auth_clawback_enabled ? 'bg-purple-500/10 border-purple-500/20' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_clawback_enabled ? 'bg-purple-500' : 'bg-[var(--text-muted)]'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_clawback_enabled ? 'text-purple-400' : 'text-[var(--text-muted)]'}`}>Clawback</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Can clawback assets</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-[var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Receive</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Scan to get account address</p>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG
                  value={account.id}
                  size={200}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                />
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl p-3 mb-4 border border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Account Address</p>
              <p className="text-xs font-mono text-[var(--text-primary)] break-all">{account.id}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(account.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold text-sm flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Address
                  </>
                )}
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-3 px-4 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold text-sm border border-[var(--border-default)]"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowFavoriteModal(false)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-[var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-500" fill={isCurrentFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {isCurrentFavorite ? 'Edit Favorite' : 'Add to Favorites'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{shortenAddress(account.id, 8)}</p>
            </div>

            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2 block">
                Label (optional)
              </label>
              <input
                type="text"
                value={favoriteLabel}
                onChange={(e) => setFavoriteLabel(e.target.value)}
                placeholder="e.g. My Wallet, Exchange..."
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-blue)]"
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
                    className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      removeFavorite(account.id);
                      setFavoriteLabel('');
                      setShowFavoriteModal(false);
                    }}
                    className="py-3 px-4 rounded-xl bg-[var(--error)]/10 text-[var(--error)] font-semibold text-sm border border-[var(--error)]/20"
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
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Add Favorite
                </button>
              )}
              <button
                onClick={() => setShowFavoriteModal(false)}
                className="py-3 px-4 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold text-sm border border-[var(--border-default)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Info Modal */}
      {showBadgeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowBadgeModal(false)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-[var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Account Status</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Learn about account badges</p>
            </div>

            {/* Badge Types */}
            <div className="space-y-3 mb-5">
              {/* Verified */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="#1D9BF0">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                </svg>
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">Verified</div>
                  <div className="text-xs text-[var(--text-muted)]">Official verified account</div>
                </div>
              </div>

              {/* Hack */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="#EF4444">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                  <path d="M12 7v6m0 2v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">Hack</div>
                  <div className="text-xs text-[var(--text-muted)]">Compromised or malicious</div>
                </div>
              </div>

              {/* Spam */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="#F97316">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                  <path d="M12 7v6m0 2v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">Spam</div>
                  <div className="text-xs text-[var(--text-muted)]">Known spam account</div>
                </div>
              </div>

              {/* User Labeled */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                  <circle cx="12" cy="10" r="3" fill="white"/>
                  <path d="M18 18.5c0-2.5-2.7-4.5-6-4.5s-6 2-6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">User Labeled</div>
                  <div className="text-xs text-[var(--text-muted)]">User defined</div>
                </div>
              </div>

              {/* Unknown */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                  <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">?</text>
                </svg>
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">Unknown</div>
                  <div className="text-xs text-[var(--text-muted)]">No information available</div>
                </div>
              </div>
            </div>

            {/* Set Own Label Button */}
            <button
              onClick={() => {
                setShowBadgeModal(false);
                setShowFavoriteModal(true);
              }}
              className="w-full py-3 rounded-xl bg-[var(--primary-blue)] text-white font-semibold text-sm flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Set My Own Label
            </button>

            <button
              onClick={() => setShowBadgeModal(false)}
              className="w-full py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold text-sm border border-[var(--border-default)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
