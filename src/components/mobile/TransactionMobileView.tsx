'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate, formatXLM, extractContractAddress, detectContractFunctionType } from '@/lib/stellar';
import type { AccountLabel } from '@/lib/stellar';
import type { ContractFunctionType } from '@/lib/types/token';
import AccountBadges from '@/components/AccountBadges';
import { containers, spacing } from '@/lib/design-system';
import { decodeTransactionMeta, decodeTransactionResources, type DecodedTransactionMeta, type SorobanMetrics } from '@/lib/xdrDecoder';

interface Operation {
  id: string;
  type: string;
  source_account: string;
  transaction_successful: boolean;
  created_at: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  to?: string;
  from?: string;
  starting_balance?: string;
  [key: string]: unknown;
}

interface Effect {
  id: string;
  type: string;
  account: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface TransactionData {
  hash: string;
  source_account: string;
  source_account_sequence?: string;
  successful: boolean;
  created_at: string;
  ledger: number;
  operation_count: number;
  fee_charged: string;
  max_fee: string;
  memo?: string;
  memo_type: string;
  signatures: string[];
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr?: string;
  fee_meta_xdr?: string;
}

interface TransactionMobileViewProps {
  transaction: TransactionData;
  operations: Operation[];
  effects: Effect[];
  accountLabels?: Record<string, AccountLabel>;
}

export default function TransactionMobileView({ transaction, operations, effects, accountLabels = {} }: TransactionMobileViewProps) {
  // Determine Transaction Type first to set default tab
  const contractOp = operations.find(op => op.type === 'invoke_host_function');
  const isContractCall = !!contractOp;

  const [activeTab, setActiveTab] = useState<'operations' | 'effects' | 'details' | 'trace' | null>('operations');
  const [showRecipients, setShowRecipients] = useState(false);
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Get unique operation types for filter
  const operationTypes = useMemo(() => {
    const types = new Map<string, number>();
    operations.forEach(op => {
      const label = getOperationTypeLabel(op.type).replace(/_/g, ' ');
      types.set(label, (types.get(label) || 0) + 1);
    });
    return Array.from(types.entries()).sort((a, b) => b[1] - a[1]);
  }, [operations]);

  // Filter operations based on selected filter
  const filteredOperations = useMemo(() => {
    if (operationFilter === 'all') return operations;
    return operations.filter(op => {
      const label = getOperationTypeLabel(op.type).replace(/_/g, ' ');
      return label === operationFilter;
    });
  }, [operations, operationFilter]);

  // Buffer decoded metrics
  const envelopeMetrics = useMemo(() => {
    return decodeTransactionResources(transaction.envelope_xdr);
  }, [transaction.envelope_xdr]);

  // XDR decoded data for contract transactions
  const [decodedMeta, setDecodedMeta] = useState<DecodedTransactionMeta | null>(null);
  const [isDecodingXdr, setIsDecodingXdr] = useState(false);
  const [fetchedXdr, setFetchedXdr] = useState<string | null>(null);
  const [fetchedDiagnosticEventsXdr, setFetchedDiagnosticEventsXdr] = useState<string[] | null>(null);
  const [xdrFetchAttempted, setXdrFetchAttempted] = useState(false);
  const [decodedXdr, setDecodedXdr] = useState<string | null>(null);

  // Decode XDR when on Resources tab for contract transactions
  useEffect(() => {
    if (!isContractCall || activeTab !== 'details' || isDecodingXdr) {
      return;
    }

    const xdrToUse = fetchedXdr || transaction.result_meta_xdr;
    if (!xdrToUse || decodedXdr === xdrToUse) {
      return;
    }

    setIsDecodingXdr(true);
    setTimeout(() => {
      const decoded = decodeTransactionMeta(xdrToUse);
      setDecodedMeta(decoded);
      setDecodedXdr(xdrToUse);
      setIsDecodingXdr(false);
    }, 0);
  }, [isContractCall, activeTab, transaction.result_meta_xdr, fetchedXdr, fetchedDiagnosticEventsXdr, decodedXdr, isDecodingXdr]);

  // Fetch Soroban RPC XDR if Horizon data is missing trace details
  useEffect(() => {
    if (!isContractCall || activeTab !== 'details' || isDecodingXdr || xdrFetchAttempted || fetchedXdr) {
      return;
    }

    const hasTraceData = !!(
      decodedMeta?.success &&
      ((decodedMeta.invocationTrace?.length || 0) > 0 ||
        (decodedMeta.parsedEvents?.length || 0) > 0 ||
        (decodedMeta.stateChanges?.length || 0) > 0)
    );

    const shouldFetchRpcXdr = !transaction.result_meta_xdr || !hasTraceData || (decodedMeta && !decodedMeta.success);

    if (!shouldFetchRpcXdr) {
      return;
    }

    setXdrFetchAttempted(true);
    setIsDecodingXdr(true);

    fetch(`/api/transaction-meta?hash=${transaction.hash}`)
      .then(res => res.json())
      .then(data => {
        if (data.resultMetaXdr) {
          setFetchedXdr(data.resultMetaXdr);
          if (Array.isArray(data.diagnosticEventsXdr) && data.diagnosticEventsXdr.length > 0) {
            setFetchedDiagnosticEventsXdr(data.diagnosticEventsXdr);
          }
        }
        setIsDecodingXdr(false);
      })
      .catch(() => {
        setIsDecodingXdr(false);
      });
  }, [
    isContractCall,
    activeTab,
    isDecodingXdr,
    xdrFetchAttempted,
    fetchedXdr,
    decodedMeta,
    transaction.result_meta_xdr,
    transaction.hash,
  ]);

  // Infinite scroll state for operations and effects
  const OPS_PER_PAGE = 10;
  const EFFECTS_PER_PAGE = 10;
  const [visibleOpsCount, setVisibleOpsCount] = useState(OPS_PER_PAGE);
  const [visibleEffectsCount, setVisibleEffectsCount] = useState(EFFECTS_PER_PAGE);
  const [isLoadingOps, setIsLoadingOps] = useState(false);
  const [isLoadingEffects, setIsLoadingEffects] = useState(false);

  // Refs for infinite scroll sentinel elements
  const opsSentinelRef = useRef<HTMLDivElement>(null);
  const effectsSentinelRef = useRef<HTMLDivElement>(null);
  const opsContainerRef = useRef<HTMLDivElement>(null);
  const effectsContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Reset visible counts when switching tabs
  useEffect(() => {
    if (activeTab === 'operations') {
      // Scroll to top of operations container when tab becomes active
      opsContainerRef.current?.scrollTo({ top: 0 });
    } else if (activeTab === 'effects') {
      // Scroll to top of effects container when tab becomes active
      effectsContainerRef.current?.scrollTo({ top: 0 });
    }
  }, [activeTab]);

  // Reset visible operations count when filter changes
  useEffect(() => {
    setVisibleOpsCount(OPS_PER_PAGE);
  }, [operationFilter]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterDropdown]);

  // Load more operations
  const loadMoreOps = useCallback(() => {
    if (isLoadingOps || visibleOpsCount >= filteredOperations.length) return;

    setIsLoadingOps(true);
    // Simulate async loading for smooth UX
    setTimeout(() => {
      setVisibleOpsCount(prev => Math.min(prev + OPS_PER_PAGE, filteredOperations.length));
      setIsLoadingOps(false);
    }, 300);
  }, [isLoadingOps, visibleOpsCount, filteredOperations.length]);

  // Load more effects
  const loadMoreEffects = useCallback(() => {
    if (isLoadingEffects || visibleEffectsCount >= effects.length) return;

    setIsLoadingEffects(true);
    // Simulate async loading for smooth UX
    setTimeout(() => {
      setVisibleEffectsCount(prev => Math.min(prev + EFFECTS_PER_PAGE, effects.length));
      setIsLoadingEffects(false);
    }, 300);
  }, [isLoadingEffects, visibleEffectsCount, effects.length]);

  // Intersection Observer for operations infinite scroll
  useEffect(() => {
    if (activeTab !== 'operations') return;

    const sentinel = opsSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleOpsCount < filteredOperations.length) {
          loadMoreOps();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [activeTab, visibleOpsCount, filteredOperations.length, loadMoreOps]);

  // Intersection Observer for effects infinite scroll
  useEffect(() => {
    if (activeTab !== 'effects') return;

    const sentinel = effectsSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleEffectsCount < effects.length) {
          loadMoreEffects();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [activeTab, visibleEffectsCount, effects.length, loadMoreEffects]);

  // Continue with other transaction type checks
  const isSwap = operations.some(op =>
    op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive'
  );

  const offerOp = operations.find(op =>
    ['manage_buy_offer', 'manage_sell_offer', 'create_passive_sell_offer'].includes(op.type)
  );
  const isOffer = !!offerOp;

  const paymentOps = operations.filter(op => op.type === 'payment' || op.type === 'create_account');
  const isMultiSend = paymentOps.length > 1;

  // Check if this is an account operation (no transfer of value)
  const accountOperationTypes = [
    'change_trust', 'set_options', 'manage_data', 'bump_sequence',
    'allow_trust', 'set_trustline_flags', 'liquidity_pool_deposit',
    'liquidity_pool_withdraw', 'begin_sponsoring_future_reserves',
    'end_sponsoring_future_reserves', 'revoke_sponsorship', 'clawback',
    'clawback_claimable_balance', 'create_claimable_balance', 'claim_claimable_balance'
  ];
  const isAccountOperation = operations.length > 0 &&
    operations.every(op => accountOperationTypes.includes(op.type)) &&
    !isSwap && !isOffer && !isMultiSend;

  // Find primary transfer info (fallback for legacy logic)
  const transferOps = operations.filter(op =>
    ['payment', 'create_account', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(op.type)
  );

  const primaryOp = transferOps[0] || operations[0];

  // Determine To/Destination (Default logic)
  let destination = transaction.source_account;

  if (primaryOp) {
    if (primaryOp.to) destination = primaryOp.to;
    else if ((primaryOp as any).into) destination = (primaryOp as any).into;
    else if (primaryOp.type === 'create_account') destination = (primaryOp as any).account;
    else if (primaryOp.type === 'invoke_host_function') destination = 'Smart Contract';
  }

  // Amounts (Default)
  const amount = primaryOp?.amount || (primaryOp as any).starting_balance || '0';
  const assetCode = primaryOp?.asset_type === 'native' ? 'XLM' : (primaryOp?.asset_code || 'XLM');

  // Derive Display Data based on Type
  let typeLabel = 'Transaction';
  let fromLabel = 'From Account';
  let toLabel = 'To Destination';

  // Set type label for account operations
  if (isAccountOperation && operations[0]) {
    const opType = operations[0].type;
    const opTypeLabels: Record<string, string> = {
      'change_trust': 'Trustline Change',
      'set_options': 'Account Settings',
      'manage_data': 'Data Entry',
      'bump_sequence': 'Sequence Bump',
      'allow_trust': 'Trust Authorization',
      'set_trustline_flags': 'Trustline Flags',
      'liquidity_pool_deposit': 'LP Deposit',
      'liquidity_pool_withdraw': 'LP Withdraw',
      'begin_sponsoring_future_reserves': 'Begin Sponsorship',
      'end_sponsoring_future_reserves': 'End Sponsorship',
      'revoke_sponsorship': 'Revoke Sponsorship',
      'clawback': 'Clawback',
      'clawback_claimable_balance': 'Clawback Balance',
      'create_claimable_balance': 'Create Claimable Balance',
      'claim_claimable_balance': 'Claim Balance',
    };
    typeLabel = opTypeLabels[opType] || opType.replace(/_/g, ' ');
  }

  // Swap Data
  let swapSold: { amount: string, code: string } | null = null;
  let swapBought: { amount: string, code: string } | null = null;

  if (isSwap) {
    typeLabel = 'Swap Transaction';
    const swapOp = operations.find(op => op.type.includes('path_payment'));
    if (swapOp) {
      // Effects show the ACTUAL amounts that were exchanged (the truth)
      // Operation fields show request params: amount = desired receive, source_amount = max willing to spend
      // Find the user's debit (sent) and credit (received) effects
      const userAccount = transaction.source_account;
      const debitEffect = effects.find(e =>
        e.type === 'account_debited' && e.account === userAccount
      );
      const creditEffect = effects.find(e =>
        e.type === 'account_credited' && e.account === userAccount
      );

      // Use effects for actual amounts, fallback to operation fields
      const soldAmount = debitEffect?.amount || (swapOp as any).source_amount || swapOp.amount || '0';
      const soldAsset = debitEffect
        ? (debitEffect.asset_type === 'native' ? 'XLM' : (debitEffect.asset_code || 'XLM'))
        : ((swapOp as any).source_asset_type === 'native' ? 'XLM' : ((swapOp as any).source_asset_code || 'XLM'));

      const boughtAmount = creditEffect?.amount || (swapOp as any).destination_amount || swapOp.amount || '0';
      const boughtAsset = creditEffect
        ? (creditEffect.asset_type === 'native' ? 'XLM' : (creditEffect.asset_code || 'XLM'))
        : (swapOp.asset_type === 'native' ? 'XLM' : (swapOp.asset_code || 'XLM'));

      swapSold = { amount: soldAmount, code: soldAsset };
      swapBought = { amount: boughtAmount, code: boughtAsset };

      fromLabel = 'Sold';
      toLabel = 'Bought';
    }
  }

  // Offer Data
  let offerDetails: { selling: string, buying: string, price: string, amount: string } | null = null;

  if (isOffer && offerOp) {
    typeLabel = 'Manage Offer';
    const sellingCode = (offerOp as any).selling_asset_type === 'native' ? 'XLM' : ((offerOp as any).selling_asset_code || 'XLM');
    const buyingCode = (offerOp as any).buying_asset_type === 'native' ? 'XLM' : ((offerOp as any).buying_asset_code || 'XLM');

    offerDetails = {
      selling: sellingCode,
      buying: buyingCode,
      price: (offerOp as any).price || '0',
      amount: (offerOp as any).amount || '0'
    };

    fromLabel = 'Selling';
    toLabel = 'Buying';
  }

  // Multi Send Data
  let multiSendCount = 0;
  let multiSendSum = 0;
  let multiSendAsset = '';

  // Compute unique recipients
  const uniqueRecipients = new Set(paymentOps.map(op => op.to || (op as any).into || 'unknown'));
  const uniqueRecipientCount = uniqueRecipients.size;

  if (isMultiSend) {
    typeLabel = paymentOps.length > 10 ? 'Bulk Send' : 'Multi Send';
    toLabel = 'Recipients';
    multiSendCount = uniqueRecipientCount;

    // Sum
    multiSendSum = paymentOps.reduce((sum, op) => sum + parseFloat(op.amount || '0'), 0);

    // Check asset consistency
    const firstOp = paymentOps[0];
    const firstAsset = firstOp.asset_type === 'native' ? 'XLM' : (firstOp.asset_code || 'XLM');
    const allSame = paymentOps.every(op => {
      const opAsset = op.asset_type === 'native' ? 'XLM' : (op.asset_code || 'XLM');
      return opAsset === firstAsset;
    });

    multiSendAsset = allSame ? firstAsset : 'Mixed';
  } else if (transaction.operation_count > 1 && !isSwap && !isOffer && operations[0].type === 'payment') {
    // Sometimes just multiple ops not classified as MultiSend by logic above if mixed, but user wants it?
    // Keeping simple logic for now.
  }

  // Smart Contract Data (already declared at top, just update variables)
  let contractFunctionName = 'Contract Call';
  let contractEffectAmount = '0';
  let contractEffectAsset = '';
  // New variables for dual effect display
  let contractReceivedAmount = '0';
  let contractReceivedAsset = 'XLM';
  let contractSentAmount = '0';
  let contractSentAsset = 'XLM';
  let contractEffectType: 'received' | 'sent' | 'both' | null = null;
  // Check for effects that look like transfers (credited/debited) to show "Value"
  // For swaps, calculate NET change per asset to handle internal DEX accounting
  if (isContractCall) {
    const userAccount = transaction.source_account;

    // Calculate NET changes per asset for the user's account
    // This handles DEX swaps where there are multiple credits/debits of the same asset
    const assetChanges = new Map<string, number>();

    const userEffects = effects.filter(e =>
      e.account === userAccount && (e.type.includes('debited') || e.type.includes('credited'))
    );

    for (const e of userEffects) {
      const assetKey = e.asset_type === 'native' ? 'XLM' : (e.asset_code || 'XLM');
      const amount = parseFloat(e.amount || '0');
      const change = e.type.includes('credited') ? amount : -amount;
      assetChanges.set(assetKey, (assetChanges.get(assetKey) || 0) + change);
    }

    // Find assets with net changes (sold = negative, bought = positive)
    let soldAmount = '';
    let soldAsset = '';
    let boughtAmount = '';
    let boughtAsset = '';
    let foundSold = false;
    let foundBought = false;

    for (const [asset, netChange] of assetChanges.entries()) {
      // Only consider significant changes (ignore dust/rounding)
      if (Math.abs(netChange) < 0.0000001) continue;

      if (netChange < 0 && !foundSold) {
        soldAmount = Math.abs(netChange).toString();
        soldAsset = asset;
        foundSold = true;
      } else if (netChange > 0 && !foundBought) {
        boughtAmount = netChange.toString();
        boughtAsset = asset;
        foundBought = true;
      }
    }

    if (foundSold && foundBought) {
      // True swap: user gave one asset and received another
      contractEffectType = 'both';
      contractSentAmount = soldAmount;
      contractSentAsset = soldAsset;
      contractReceivedAmount = boughtAmount;
      contractReceivedAsset = boughtAsset;
    } else if (foundBought && !foundSold) {
      // Only received (mint, claim, etc.)
      contractEffectType = 'received';
      contractEffectAmount = boughtAmount;
      contractEffectAsset = boughtAsset;
    } else if (foundSold && !foundBought) {
      // Only sent (burn, deposit, etc.)
      contractEffectType = 'sent';
      contractEffectAmount = soldAmount;
      contractEffectAsset = soldAsset;
    } else {
      // Fallback: look for a credit/debit pair with DIFFERENT assets (true swap indicator)
      const debits = effects.filter(e => e.type.includes('debited'));
      const credits = effects.filter(e => e.type.includes('credited'));

      // Find a swap pair with different assets
      let foundSwapPair = false;
      for (const debit of debits) {
        const debitAsset = debit.asset_type === 'native' ? 'XLM' : (debit.asset_code || 'XLM');
        for (const credit of credits) {
          const creditAsset = credit.asset_type === 'native' ? 'XLM' : (credit.asset_code || 'XLM');
          if (debitAsset !== creditAsset) {
            // Found a swap pair with different assets!
            contractEffectType = 'both';
            contractSentAmount = debit.amount || '0';
            contractSentAsset = debitAsset;
            contractReceivedAmount = credit.amount || '0';
            contractReceivedAsset = creditAsset;
            foundSwapPair = true;
            break;
          }
        }
        if (foundSwapPair) break;
      }

      // If no swap pair found, fallback to single effect display
      if (!foundSwapPair) {
        const validCredit = credits[0];
        const validDebit = debits[0];

        if (validCredit) {
          contractEffectAmount = validCredit.amount || '0';
          contractEffectAsset = validCredit.asset_type === 'native' ? 'XLM' : (validCredit.asset_code || 'XLM');
          contractEffectType = 'received';
        } else if (validDebit) {
          contractEffectAmount = validDebit.amount || '0';
          contractEffectAsset = validDebit.asset_type === 'native' ? 'XLM' : (validDebit.asset_code || 'XLM');
          contractEffectType = 'sent';
        }
      }
    }
  }

  // Display Amount Helper
  // Display Amount Helper
  const getDisplayAmount = () => {
    if (isMultiSend) return multiSendSum;
    if (isContractCall && parseFloat(contractEffectAmount) > 0) return parseFloat(contractEffectAmount);

    // Check if amount is valid
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) return parsedAmount;

    // Fallback: Check for effects if amount is 0/invalid (common in complex ops or merges)
    const creditEffect = effects.find(e => e.type.includes('credited') || e.type.includes('debited'));
    if (creditEffect && creditEffect.amount) {
      return parseFloat(creditEffect.amount);
    }

    return 0;
  }

  const getDisplayAsset = () => {
    if (isMultiSend) return multiSendAsset;
    if (isContractCall && parseFloat(contractEffectAmount) > 0) return contractEffectAsset;

    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) return assetCode;

    // Fallback based on effect
    const creditEffect = effects.find(e => e.type.includes('credited') || e.type.includes('debited'));
    if (creditEffect) {
      return creditEffect.asset_type === 'native' ? 'XLM' : (creditEffect.asset_code || 'XLM');
    }

    return assetCode;
  };

  const displayAmount = getDisplayAmount();
  const displayAsset = getDisplayAsset();

  // Dedicated effect extraction for From/To cards
  const sentEffect = effects.find(e => e.type.includes('debited'));
  const receivedEffect = effects.find(e => e.type.includes('credited'));

  const sentAmountFromEffect = sentEffect?.amount ? parseFloat(sentEffect.amount) : 0;
  const sentAssetFromEffect = sentEffect ? (sentEffect.asset_type === 'native' ? 'XLM' : (sentEffect.asset_code || 'XLM')) : 'XLM';

  const receivedAmountFromEffect = receivedEffect?.amount ? parseFloat(receivedEffect.amount) : 0;
  const receivedAssetFromEffect = receivedEffect ? (receivedEffect.asset_type === 'native' ? 'XLM' : (receivedEffect.asset_code || 'XLM')) : 'XLM';

  // Use effect amounts if displayAmount is 0
  const fromCardAmount = displayAmount > 0 ? displayAmount : sentAmountFromEffect;
  const fromCardAsset = displayAmount > 0 ? displayAsset : sentAssetFromEffect;
  const toCardAmount = displayAmount > 0 ? displayAmount : receivedAmountFromEffect;
  const toCardAsset = displayAmount > 0 ? displayAsset : receivedAssetFromEffect;

  const formatTokenAmount = (value?: string, digits = 7) => {
    if (!value) return '0';
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
  };

  // Compact number formatter for DEX cards - max 4 decimals, K/M for large numbers
  const formatCompactNumber = (value: string) => {
    if (!value) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 10000) return (num / 1000).toFixed(1) + 'K';
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    // For small decimals, show up to 4 significant digits
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const contractTransferEffects = effects.filter(ef =>
    ef.type.includes('credited') || ef.type.includes('debited')
  );
  const contractHeaderEffect = contractTransferEffects.find(ef => ef.type.includes('credited'))
    || contractTransferEffects.find(ef => ef.type.includes('debited'));
  const contractHeaderIsCredit = contractHeaderEffect?.type.includes('credited') || false;
  const contractHeaderAmount = contractHeaderEffect?.amount || '0';
  const contractHeaderAsset = contractHeaderEffect?.asset_type === 'native'
    ? 'XLM'
    : (contractHeaderEffect?.asset_code || 'XLM');
  const contractHeaderLabel = contractHeaderEffect?.type.includes('credited')
    ? 'Received'
    : contractHeaderEffect?.type.includes('debited')
      ? 'Sent'
      : 'Value';
  const contractHeaderAccount = contractHeaderEffect?.account || '';
  const contractEffects = contractTransferEffects.length > 0 ? contractTransferEffects : effects;
  const contractEffectsByAccount = contractEffects.reduce((acc, ef) => {
    const key = ef.account || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ef);
    return acc;
  }, {} as Record<string, Effect[]>);

  // Helper to decode contract function name
  const decodeContractFunctionName = (op: Operation): string => {
    try {
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';

      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';

      const decoded = atob(symParam.value);
      // Remove all non-printable characters and keep only valid function name characters
      const functionName = decoded
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII
        .replace(/^[^a-zA-Z_]+/, '') // Remove leading non-letter characters
        .trim();
      return functionName || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  // Extract contract address and function type for contract calls
  let contractAddress: string | null = null;
  let contractFunctionType: ContractFunctionType = 'unknown';

  if (isContractCall && contractOp) {
    contractFunctionName = decodeContractFunctionName(contractOp);
    typeLabel = contractFunctionName === 'Contract Call' ? 'Smart Contract Call' : `${contractFunctionName} (Contract)`;
    contractAddress = extractContractAddress(contractOp as any);
    contractFunctionType = detectContractFunctionType(contractFunctionName);
  }
  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const upperQuery = query.toUpperCase();
    if (query.length === 56 && upperQuery.startsWith('C')) {
      window.location.href = `/contract/${upperQuery}`;
    } else if (query.length === 56 && upperQuery.startsWith('G')) {
      window.location.href = `/account/${upperQuery}`;
    } else if (query.length === 64) {
      window.location.href = `/transaction/${query.toLowerCase()}`;
    } else if (/^\d+$/.test(query)) {
      window.location.href = `/ledger/${query}`;
    } else {
      window.location.href = `/account/${query}`;
    }
    setSearchQuery('');
    setShowSearch(false);
  };

  const feeXLM = (parseInt(transaction.fee_charged) / 10000000).toFixed(7);

  // Primary color for this design
  const primaryColor = '#0F4C81';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-secondary)] pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-[var(--bg-secondary)] shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight capitalize" style={{ color: primaryColor }}>
            {isContractCall ? (contractFunctionName || 'Contract') : typeLabel}
          </h1>
        </div>
        <div className="flex-1 max-w-[180px] ml-auto">
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-3 py-2 bg-[var(--bg-tertiary)] border-none rounded-full text-sm text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:bg-[var(--bg-secondary)] transition-all"
            />
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 max-w-lg mx-auto w-full">
        {/* Meta Data Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-medium text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDate(transaction.created_at)}</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${transaction.successful
            ? 'bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]/30'
            : 'bg-[var(--error-muted)] text-[var(--error)] border-[var(--error)]/30'
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {transaction.successful
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              }
            </svg>
            {transaction.successful ? 'Successful' : 'Failed'}
          </span>
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-mono text-[11px] tracking-wide hover:bg-[var(--bg-hover)] transition-colors"
          >
            #{transaction.hash.slice(0, 4)}...{transaction.hash.slice(-3)}
            {copied && <span className="text-[var(--success)] ml-1">✓</span>}
          </button>
        </div>

        {isContractCall ? (
          <>

            <div className={`${containers.cardCompact} p-4 mb-5`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Transaction Type</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-1 capitalize">
                    {contractFunctionType === 'swap' ? 'Swap' : (contractFunctionName || 'Smart Contract')}
                  </div>
                  {contractEffectType === 'both' && contractSentAsset !== contractReceivedAsset && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {contractSentAsset} → {contractReceivedAsset}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Account</div>
                  <div className="flex items-center justify-end mt-1">
                    <Link href={`/account/${transaction.source_account}`} className="text-xs font-semibold font-mono hover:opacity-80" style={{ color: primaryColor }}>
                      {shortenAddress(transaction.source_account, 4)}
                    </Link>
                    <AccountBadges address={transaction.source_account} labels={accountLabels} />
                  </div>
                </div>
              </div>

              {/* Contract Address */}
              {contractAddress && (
                <div className="mt-3 pt-3 border-t border-[var(--border-default)]/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Contract</span>
                    <Link
                      href={`/contract/${contractAddress}`}
                      className="text-xs font-mono font-semibold hover:opacity-80 transition-colors flex items-center gap-1"
                      style={{ color: primaryColor }}
                    >
                      {shortenAddress(contractAddress, 6)}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}

              {/* Smart Contract Summary Card */}
              <div className="mt-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl p-4 relative overflow-hidden transition-all duration-300">
                {/* Decorative glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-blue)]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                {contractEffectType === 'both' ? (
                  <div className="relative z-10">
                    <div className="space-y-4">
                      {/* Sent Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--error)]/10 text-[var(--error)] flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-[var(--error)] tracking-wider">Sent</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-[var(--error)]">
                            -{formatTokenAmount(contractSentAmount)}
                          </div>
                          <div className="text-[11px] font-medium text-[var(--text-muted)]">{contractSentAsset}</div>
                        </div>
                      </div>

                      {/* Connector Arrow */}
                      <div className="flex justify-center -my-1">
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center justify-center">
                          <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Received Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-[var(--success)] tracking-wider">Received</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-[var(--success)]">
                            +{formatTokenAmount(contractReceivedAmount)}
                          </div>
                          <div className="text-[11px] font-medium text-[var(--text-muted)]">{contractReceivedAsset}</div>
                        </div>
                      </div>
                    </div>

                    {/* For swaps with different assets, don't show raw effects - they're confusing internal operations */}
                    {/* Users can see raw effects in the Effects tab if needed */}
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`flex items-center text-[11px] font-bold uppercase tracking-wide mb-1 ${contractHeaderIsCredit ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'
                          }`}>
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {contractHeaderIsCredit ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7" />
                            )}
                          </svg>
                          {contractHeaderLabel}
                        </div>

                        {/* Primary Value */}
                        <div className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-baseline gap-2">
                          {formatTokenAmount(contractHeaderAmount)}
                          <span className="text-sm font-semibold text-[var(--text-tertiary)]">{contractHeaderAsset}</span>
                        </div>

                        {contractHeaderAccount && (
                          <div className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                            <span className="opacity-75">{contractHeaderIsCredit ? 'from ' : 'to '}</span>
                            <Link href={`/account/${contractHeaderAccount}`} className="hover:opacity-80 transition-colors font-medium" style={{ color: primaryColor }}>
                              {shortenAddress(contractHeaderAccount, 4)}
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Only show expand button if there are multiple items of same type */}
                      {contractTransferEffects.filter(e => contractHeaderIsCredit ? e.type.includes('credited') : e.type.includes('debited')).length > 1 && (
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all ml-4"
                        >
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Expanded List */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-default)]/50 space-y-4">
                        {contractTransferEffects
                          .filter(e => contractHeaderIsCredit ? e.type.includes('credited') : e.type.includes('debited'))
                          .slice(1)
                          .map((effect, idx) => (
                            <div key={effect.id || idx}>
                              <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight flex items-baseline gap-2">
                                {formatTokenAmount(effect.amount)}
                                <span className="text-sm font-semibold text-[var(--text-tertiary)]">{effect.asset_type === 'native' ? 'XLM' : (effect.asset_code || 'XLM')}</span>
                              </div>
                              {effect.account && (
                                <div className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                                  <span className="opacity-75">{contractHeaderIsCredit ? 'from ' : 'to '}</span>
                                  <Link href={`/account/${effect.account}`} className="hover:opacity-80 transition-colors font-medium" style={{ color: primaryColor }}>
                                    {shortenAddress(effect.account, 4)}
                                  </Link>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border-default)]/50">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)] text-[11px] font-medium">Network Fee</span>
                  <span className="font-mono text-[11px] font-bold text-[var(--text-secondary)]">{feeXLM} XLM</span>
                </div>
              </div>
            </div>


          </>
        ) : (
          <>
            {/* DEX Limit Order Card for Offers */}
            {isOffer ? (
              <div className={`${containers.cardCompact} p-3 mb-3`}>
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--info-muted)] flex items-center justify-center" style={{ color: primaryColor }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">DEX Limit Order</span>
                </div>

                {/* Vertical Trade Flow */}
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3 mb-3 space-y-2.5">
                  {/* SELLING ROW */}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Selling</div>
                    <div className="text-right" title={offerDetails?.amount || '0'}>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {offerDetails?.amount ? formatCompactNumber(offerDetails.amount) : '0'}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] ml-1">{offerDetails?.selling}</span>
                    </div>
                  </div>

                  {/* EXCHANGE RATE ROW */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider shrink-0">Rate</div>
                    <div
                      className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-full px-2 py-1 text-[11px] font-mono text-[var(--text-secondary)] truncate"
                      title={`1 ${offerDetails?.selling} ≈ ${offerDetails?.price} ${offerDetails?.buying}`}
                    >
                      1 {offerDetails?.selling} ≈ {formatCompactNumber(offerDetails?.price || '0')} {offerDetails?.buying}
                    </div>
                  </div>

                  {/* BUYING ROW */}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Buying</div>
                    <div
                      className="text-right"
                      title={offerDetails?.amount && offerDetails?.price
                        ? (parseFloat(offerDetails.amount) * parseFloat(offerDetails.price)).toString()
                        : '0'
                      }
                    >
                      <span className="text-sm font-bold" style={{ color: primaryColor }}>
                        {offerDetails?.amount && offerDetails?.price
                          ? formatCompactNumber((parseFloat(offerDetails.amount) * parseFloat(offerDetails.price)).toString())
                          : '0'
                        }
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] ml-1">{offerDetails?.buying}</span>
                    </div>
                  </div>
                </div>

                {/* Order By */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-muted)]">Order by</span>
                  <span className="flex items-center">
                    <Link href={`/account/${transaction.source_account}`} className="font-semibold font-mono hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                      {shortenAddress(transaction.source_account, 4)}
                    </Link>
                    <AccountBadges address={transaction.source_account} labels={accountLabels} />
                  </span>
                </div>
              </div>
            ) : isAccountOperation ? (
              /* Account Operation Card (no transfer) */
              <div className={`${containers.cardCompact} p-4 mb-4`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Account Operation</div>
                    <div className="text-sm font-bold text-[var(--text-primary)] capitalize">
                      {operations[0]?.type.replace(/_/g, ' ') || 'Operation'}
                    </div>
                  </div>
                </div>

                {/* Operation Details */}
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Account</span>
                    <span className="flex items-center">
                      <Link href={`/account/${transaction.source_account}`} className="text-xs font-semibold font-mono hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                        {shortenAddress(transaction.source_account, 4)}
                      </Link>
                      <AccountBadges address={transaction.source_account} labels={accountLabels} />
                    </span>
                  </div>

                  {/* Show asset info for trustline operations */}
                  {operations[0]?.type === 'change_trust' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Asset</span>
                      <span className="text-xs font-semibold" style={{ color: primaryColor }}>
                        {(operations[0] as any).asset_code || 'Unknown'}
                        {(operations[0] as any).asset_issuer && (
                          <span className="text-[var(--text-muted)] ml-1">({shortenAddress((operations[0] as any).asset_issuer, 4)})</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Show effect summary */}
                  {effects.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Effect</span>
                      <span className="text-xs font-semibold capitalize" style={{ color: primaryColor }}>
                        {effects[0]?.type.replace(/_/g, ' ') || 'None'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Visual Flow for transfer transactions - Deep Ocean Design */
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden mb-4 relative">
                {/* Decorative glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-blue)]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                {/* Header for Swap Transactions - matches contract card style */}
                {isSwap && (
                  <div className="p-4 pb-0">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Transaction Type</div>
                        <div className="text-base font-bold text-[var(--text-primary)] mt-1">Swap</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Account</div>
                        <div className="flex items-center justify-end mt-1">
                          <Link href={`/account/${transaction.source_account}`} className="text-xs font-semibold font-mono hover:opacity-80" style={{ color: primaryColor }}>
                            {shortenAddress(transaction.source_account, 4)}
                          </Link>
                          <AccountBadges address={transaction.source_account} labels={accountLabels} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* FROM Section */}
                <div className={`p-4 pb-6 relative ${isSwap ? 'pt-0' : 'bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--success-muted)] flex items-center justify-center text-[var(--success)] shadow-sm">
                        <svg className="w-5 h-5 -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase mb-0.5">{fromLabel}</p>
                        {isSwap ? (
                          <p className="text-base font-bold font-mono tracking-tight" style={{ color: primaryColor }}>
                            {formatTokenAmount(swapSold?.amount)} <span className="text-xs font-medium text-[var(--text-muted)]">{swapSold?.code}</span>
                          </p>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Link href={`/account/${transaction.source_account}`} className={`text-base font-bold tracking-tight hover:opacity-80 transition-opacity ${accountLabels[transaction.source_account]?.name ? '' : 'font-mono'}`} style={{ color: primaryColor }}>
                              {accountLabels[transaction.source_account]?.name || shortenAddress(transaction.source_account, 4)}
                            </Link>
                            {accountLabels[transaction.source_account]?.verified && (
                              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#1D9BF0">
                                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                              </svg>
                            )}
                            {accountLabels[transaction.source_account]?.name && !accountLabels[transaction.source_account]?.verified && (
                              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                                <circle cx="12" cy="10" r="3" fill="white"/>
                                <path d="M18 18.5c0-2.5-2.7-4.5-6-4.5s-6 2-6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isSwap && fromCardAmount > 0 && (
                      <div className="text-right">
                        <p className="text-base font-bold text-[var(--error)]">-{fromCardAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] font-bold text-[var(--text-muted)]">{fromCardAsset}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                <div className="relative h-0 z-10">
                  <div className="absolute inset-x-0 -top-2.5 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] shadow-md border border-[var(--border-subtle)] flex items-center justify-center">
                      <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-x-6 top-0.5 border-t-2 border-dashed border-[var(--border-default)] -z-10"></div>
                </div>

                {/* TO Section */}
                <div className="p-4 pt-6 bg-[var(--bg-secondary)]">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--info-muted)] flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                        <svg className="w-5 h-5 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase mb-0.5">{toLabel}</p>
                        {isSwap ? (
                          <p className="text-base font-bold font-mono tracking-tight" style={{ color: primaryColor }}>
                            {formatTokenAmount(swapBought?.amount)} <span className="text-xs font-medium text-[var(--text-muted)]">{swapBought?.code}</span>
                          </p>
                        ) : isMultiSend ? (
                          <button
                            onClick={() => setShowRecipients(!showRecipients)}
                            className="text-base font-bold font-mono tracking-tight flex items-center gap-1" style={{ color: primaryColor }}
                          >
                            {uniqueRecipientCount} Recipients
                            <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${showRecipients ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        ) : (
                          <span className="flex items-center">
                            <Link href={`/account/${destination}`} className="text-base font-bold font-mono tracking-tight hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
                              {shortenAddress(destination, 4)}
                            </Link>
                            <AccountBadges address={destination} labels={accountLabels} />
                          </span>
                        )}
                      </div>
                    </div>
                    {!isSwap && (
                      <div className="text-right">
                        <p className="text-base font-bold text-[var(--success)]">+{(isMultiSend ? displayAmount : toCardAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] font-bold text-[var(--text-muted)]">{isMultiSend ? displayAsset : toCardAsset}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipients List (expandable) */}
                {isMultiSend && showRecipients && (
                  <div className="border-t border-[var(--border-subtle)]">
                    <div className="max-h-[40vh] overflow-y-auto bg-[var(--bg-tertiary)]/50">
                      {Object.entries(
                        paymentOps.reduce((acc, op) => {
                          const to = op.to || (op as any).into || 'unknown';
                          if (!acc[to]) acc[to] = [];
                          acc[to].push(op);
                          return acc;
                        }, {} as Record<string, Operation[]>)
                      ).map(([to, ops], idx) => (
                        <div key={to} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[9px] font-bold text-[var(--text-tertiary)]">
                              {idx + 1}
                            </span>
                            <span className="flex items-center gap-1">
                              <Link href={`/account/${to}`} className={`text-[11px] font-semibold hover:opacity-80 ${accountLabels[to]?.name ? '' : 'font-mono'}`} style={{ color: primaryColor }}>
                                {accountLabels[to]?.name || shortenAddress(to, 4)}
                              </Link>
                              {accountLabels[to]?.verified && (
                                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="#1D9BF0">
                                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                                </svg>
                              )}
                              {accountLabels[to]?.name && !accountLabels[to]?.verified && (
                                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                                  <circle cx="12" cy="10" r="3" fill="white"/>
                                  <path d="M18 18.5c0-2.5-2.7-4.5-6-4.5s-6 2-6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                                </svg>
                              )}
                            </span>
                          </div>
                          <div className="text-right">
                            {ops.map((op, opIdx) => (
                              <div key={op.id || opIdx} className="text-[11px] font-bold text-[var(--text-secondary)]">
                                {op.amount ? parseFloat(op.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                                <span className="text-[var(--text-muted)] font-medium ml-1">{op.asset_type === 'native' ? 'XLM' : op.asset_code}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Network Fee */}
                <div className="flex justify-between items-center px-4 py-2.5 bg-[var(--info-muted)]/50 border-t border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)] font-medium text-xs">Network Fee</span>
                  <span className="font-mono font-medium text-xs" style={{ color: primaryColor }}>{feeXLM} XLM</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tabs Navigation - Glider Style */}
        <div className="mt-3 mb-1">
          {(() => {
            const tabs = [
              { id: 'operations', label: 'Operations', count: operationFilter === 'all' ? transaction.operation_count : filteredOperations.length },
              { id: 'effects', label: 'Effects', count: effects.length > 0 ? effects.length : undefined },
              ...(isContractCall ? [{ id: 'trace', label: 'Trace' }] : []),
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
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative z-10 flex-1 py-1.5 text-[11px] rounded-lg transition-colors duration-200 text-center flex items-center justify-center gap-1 ${isActive
                          ? 'text-[var(--primary-blue)] font-bold'
                          : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)]'
                        }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className="text-[10px] px-1.5 h-[18px] rounded-full flex items-center justify-center bg-[var(--primary-blue)] text-white font-bold min-w-[18px]">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Operations Filter - Only show when there's more than 1 operation and on Operations tab */}
        {activeTab === 'operations' && operations.length > 1 && (
          <div className="flex items-center justify-between mb-1 mt-1">
            <div ref={filterRef} className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>{operationFilter === 'all' ? `All (${operations.length})` : `${operationFilter} (${filteredOperations.length})`}</span>
                <svg className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showFilterDropdown && (
                <div className="absolute left-0 top-full mt-1 min-w-[140px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => { setOperationFilter('all'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-medium ${operationFilter === 'all' ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                  >
                    All ({operations.length})
                  </button>
                  {operationTypes.map(([type, count]) => (
                    <button
                      key={type}
                      onClick={() => { setOperationFilter(type); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-[11px] font-medium ${operationFilter === type ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                      {type} ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-[200px] pt-1">

          {/* OPERATIONS TAB */}
          {activeTab === 'operations' && (
            <div ref={opsContainerRef}>
              <div className="space-y-3">
                {filteredOperations.slice(0, visibleOpsCount).map((op, idx) => {
                  const opNum = operations.indexOf(op) + 1;
                  const isPathPayment = op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                  const isPaymentOp = op.type === 'payment';
                  const isCreateAccount = op.type === 'create_account';
                  const isOffer = ['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type);
                  const isContract = op.type === 'invoke_host_function';

                  // Determine icon and colors
                  let iconBg = 'bg-[var(--bg-tertiary)]';
                  let iconColor = 'text-[var(--text-tertiary)]';
                  let iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />;

                  if (isPathPayment) {
                    iconBg = 'bg-[var(--info)]/10';
                    iconColor = 'text-[var(--info)]';
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />;
                  } else if (isPaymentOp || isCreateAccount) {
                    iconBg = 'bg-[var(--success)]/10';
                    iconColor = 'text-[var(--success)]';
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
                  } else if (isOffer) {
                    iconBg = 'bg-[var(--accent)]/10';
                    iconColor = 'text-[var(--accent)]';
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
                  } else if (isContract) {
                    iconBg = 'bg-[var(--warning)]/10';
                    iconColor = 'text-[var(--warning)]';
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />;
                  }

                  // Get operation description
                  let opTitle = getOperationTypeLabel(op.type).replace(/_/g, ' ');
                  let opDescription = '';

                  // For path payments, get actual amounts from effects (not operation request params)
                  let pathPaymentSent = { amount: '0', asset: '' };
                  let pathPaymentReceived = { amount: '0', asset: '' };
                  if (isPathPayment) {
                    const userAccount = op.source_account || transaction.source_account;
                    const debitEffect = effects.find(e =>
                      e.type === 'account_debited' && e.account === userAccount
                    );
                    const creditEffect = effects.find(e =>
                      e.type === 'account_credited' && e.account === userAccount
                    );
                    pathPaymentSent = {
                      amount: debitEffect?.amount || (op as any).source_amount || op.amount || '0',
                      asset: debitEffect
                        ? (debitEffect.asset_type === 'native' ? 'XLM' : (debitEffect.asset_code || ''))
                        : ((op as any).source_asset_type === 'native' ? 'XLM' : ((op as any).source_asset_code || ''))
                    };
                    pathPaymentReceived = {
                      amount: creditEffect?.amount || (op as any).destination_amount || op.amount || '0',
                      asset: creditEffect
                        ? (creditEffect.asset_type === 'native' ? 'XLM' : (creditEffect.asset_code || ''))
                        : (op.asset_type === 'native' ? 'XLM' : (op.asset_code || ''))
                    };
                  }

                  if (isPathPayment) {
                    opTitle = 'Swap';
                    const sourceAsset = (op as any).source_asset_type === 'native' ? 'XLM' : (op as any).source_asset_code || '';
                    const destAsset = op.asset_type === 'native' ? 'XLM' : op.asset_code || '';
                    opDescription = `Swapped ${sourceAsset} for ${destAsset}`;
                  } else if (isPaymentOp) {
                    opTitle = 'Payment';
                    const asset = op.asset_type === 'native' ? 'XLM' : op.asset_code || '';
                    opDescription = `Sent ${asset} to recipient`;
                  } else if (isCreateAccount) {
                    opTitle = 'Create Account';
                    opDescription = 'Created new account with starting balance';
                  } else if (isOffer) {
                    const sellAsset = (op as any).selling_asset_type === 'native' ? 'XLM' : (op as any).selling_asset_code || '';
                    const buyAsset = (op as any).buying_asset_type === 'native' ? 'XLM' : (op as any).buying_asset_code || '';
                    opTitle = op.type === 'manage_sell_offer' ? 'Sell Order' : op.type === 'manage_buy_offer' ? 'Buy Order' : 'Passive Order';
                    opDescription = `Trading ${sellAsset} for ${buyAsset}`;
                  } else if (isContract) {
                    opTitle = decodeContractFunctionName(op);
                    opDescription = 'Smart contract invocation';
                  }

                  return (
                    <div key={op.id} className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden p-4">
                      {/* Operation Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {iconPath}
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: primaryColor }}>OP {opNum}</span>
                            <span className="text-sm font-bold capitalize" style={{ color: primaryColor }}>{opTitle}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{opDescription}</p>
                        </div>
                      </div>

                      {/* Operation Details */}
                      <div className="space-y-2 bg-[var(--bg-tertiary)] rounded-xl p-3">
                        {/* From/To for payments */}
                        {(isPaymentOp || isCreateAccount) && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">From</span>
                              <span className="flex items-center">
                                <AccountBadges address={op.from || op.source_account} labels={accountLabels} />
                                <Link href={`/account/${op.from || op.source_account}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                                  {shortenAddress(op.from || op.source_account, 6)}
                                </Link>
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">To</span>
                              <span className="flex items-center">
                                <AccountBadges address={op.to || (op as any).account} labels={accountLabels} />
                                <Link href={`/account/${op.to || (op as any).account}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                                  {shortenAddress(op.to || (op as any).account, 6)}
                                </Link>
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-default)]">
                              <span className="text-[var(--text-muted)] font-medium text-xs">Amount</span>
                              <span className="font-bold text-sm" style={{ color: primaryColor }}>
                                {formatCompactNumber(op.amount || (op as any).starting_balance)} {op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM'}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Swap details */}
                        {isPathPayment && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">From</span>
                              <span className="flex items-center">
                                <AccountBadges address={op.from || op.source_account} labels={accountLabels} />
                                <Link href={`/account/${op.from || op.source_account}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                                  {shortenAddress(op.from || op.source_account, 6)}
                                </Link>
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">To</span>
                              <span className="flex items-center">
                                {op.to && <AccountBadges address={op.to} labels={accountLabels} />}
                                <Link href={`/account/${op.to}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                                  {shortenAddress(op.to || '', 6)}
                                </Link>
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-default)]">
                              <span className="text-[var(--error)] font-medium text-xs">Sent</span>
                              <span className="font-bold text-sm text-[var(--error)]">
                                -{formatCompactNumber(pathPaymentSent.amount)} {pathPaymentSent.asset}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--success)] font-medium text-xs">Received</span>
                              <span className="font-bold text-sm text-[var(--success)]">
                                +{formatCompactNumber(pathPaymentReceived.amount)} {pathPaymentReceived.asset}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Offer details */}
                        {isOffer && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">Selling</span>
                              <span className="font-bold text-sm" style={{ color: primaryColor }}>
                                {formatCompactNumber(op.amount || '0')} {(op as any).selling_asset_type === 'native' ? 'XLM' : (op as any).selling_asset_code || ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">Buying</span>
                              <span className="font-bold text-sm" style={{ color: primaryColor }}>
                                {(op as any).buying_asset_type === 'native' ? 'XLM' : (op as any).buying_asset_code || ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-default)]">
                              <span className="text-[var(--text-muted)] font-medium text-xs">Price</span>
                              <span className="font-bold text-sm" style={{ color: primaryColor }}>{(op as any).price}</span>
                            </div>
                          </>
                        )}

                        {/* Contract details */}
                        {isContract && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">Contract</span>
                              <Link href={`/contract/${extractContractAddress(op as any) || ''}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                                {extractContractAddress(op as any) ? shortenAddress(extractContractAddress(op as any) || '', 6) : 'Unknown'}
                              </Link>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)] font-medium text-xs">Function</span>
                              <span className="font-bold text-sm capitalize" style={{ color: primaryColor }}>
                                {contractFunctionName || 'Unknown'}
                              </span>
                            </div>
                            {/* Show contract effects summary */}
                            {effects.filter(e => e.account === transaction.source_account && (e.type === 'account_credited' || e.type === 'account_debited')).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-[var(--border-default)] space-y-1">
                                {effects
                                  .filter(e => e.account === transaction.source_account && e.type === 'account_debited')
                                  .slice(0, 2)
                                  .map((e, i) => (
                                    <div key={`debit-${i}`} className="flex items-center justify-between">
                                      <span className="text-[var(--error)] font-medium text-xs">Sent</span>
                                      <span className="font-bold text-sm text-[var(--error)]">
                                        -{parseFloat(e.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 7 })} {e.asset_type === 'native' ? 'XLM' : e.asset_code || ''}
                                      </span>
                                    </div>
                                  ))}
                                {effects
                                  .filter(e => e.account === transaction.source_account && e.type === 'account_credited')
                                  .slice(0, 2)
                                  .map((e, i) => (
                                    <div key={`credit-${i}`} className="flex items-center justify-between">
                                      <span className="text-[var(--success)] font-medium text-xs">Received</span>
                                      <span className="font-bold text-sm text-[var(--success)]">
                                        +{parseFloat(e.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 7 })} {e.asset_type === 'native' ? 'XLM' : e.asset_code || ''}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Fallback for other operations */}
                        {!isPaymentOp && !isCreateAccount && !isPathPayment && !isOffer && !isContract && op.amount && (
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)] font-medium text-xs">Amount</span>
                            <span className="font-bold text-sm" style={{ color: primaryColor }}>
                              {formatCompactNumber(op.amount)} {op.asset_type === 'native' ? 'XLM' : op.asset_code || ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Infinite scroll sentinel and loading state */}
              {filteredOperations.length > OPS_PER_PAGE && (
                <div className="mt-4 pt-3">
                  {/* Loading spinner */}
                  {isLoadingOps && (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-[var(--border-default)] border-t-[var(--info)] rounded-full animate-spin"></div>
                    </div>
                  )}

                  {/* Show status or load more button */}
                  {visibleOpsCount >= filteredOperations.length ? (
                    <div className="text-center py-4 text-[var(--text-muted)] text-sm font-medium">
                      No more operations
                    </div>
                  ) : (
                    <>
                      {/* Sentinel element for intersection observer */}
                      <div ref={opsSentinelRef} className="h-1" />

                      {/* Fallback load more button */}
                      {!isLoadingOps && (
                        <button
                          onClick={loadMoreOps}
                          className="w-full py-3 text-sm font-semibold rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                          style={{ color: primaryColor }}
                        >
                          Load more ({filteredOperations.length - visibleOpsCount} remaining)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EFFECTS TAB */}
          {activeTab === 'effects' && (
            <div className="space-y-3" ref={effectsContainerRef}>
              {effects.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                  No effects found for this transaction.
                </div>
              ) : (
                <>
                  {(() => {
                    // Show effects up to visibleEffectsCount
                    const visibleEffects = effects.slice(0, visibleEffectsCount);
                    const groupedEffects = visibleEffects.reduce((acc, ef) => {
                      const key = ef.account || 'unknown';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(ef);
                      return acc;
                    }, {} as Record<string, Effect[]>);

                    return Object.entries(groupedEffects).map(([account, accountEffects]: [string, Effect[]]) => (
                      <div key={account} className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)]">
                          {account === 'unknown' ? (
                            <span className="text-xs text-[var(--text-muted)]">Unknown account</span>
                          ) : (
                            <span className="flex items-center">
                              <Link href={`/account/${account}`} className="text-xs font-bold font-mono hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                                {shortenAddress(account, 4)}
                              </Link>
                              <AccountBadges address={account} labels={accountLabels} />
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: primaryColor }}>
                            {accountEffects.length} effects
                          </span>
                        </div>
                        <div className="space-y-2 bg-[var(--bg-tertiary)] rounded-xl p-3">
                          {accountEffects.map((ef) => {
                            const isCredit = ef.type.includes('credited');
                            const isDebit = ef.type.includes('debited');
                            const effectLabel = isCredit ? 'Received' : isDebit ? 'Sent' : ef.type.replace(/_/g, ' ');
                            const effectAsset = ef.asset_type === 'native' ? 'XLM' : ef.asset_code;
                            return (
                              <div key={ef.id} className="flex items-center justify-between">
                                <div className={`text-[11px] uppercase font-bold tracking-wide ${isCredit ? 'text-[var(--success)]' : isDebit ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}>
                                  {effectLabel}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`font-mono text-sm font-bold ${isCredit ? 'text-[var(--success)]' : isDebit ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}>
                                    {ef.amount ? (
                                      <>{isCredit ? '+' : isDebit ? '-' : ''}{formatTokenAmount(ef.amount)}</>
                                    ) : (
                                      '--'
                                    )}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] font-medium">
                                    {ef.amount && effectAsset}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* Infinite scroll sentinel and loading state */}
                  {effects.length > EFFECTS_PER_PAGE && (
                    <div className="mt-4 pt-3">
                      {/* Loading spinner */}
                      {isLoadingEffects && (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-[var(--border-default)] border-t-[var(--info)] rounded-full animate-spin"></div>
                        </div>
                      )}

                      {/* Show status or load more button */}
                      {visibleEffectsCount >= effects.length ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-sm font-medium">
                          No more effects
                        </div>
                      ) : (
                        <>
                          {/* Sentinel element for intersection observer */}
                          <div ref={effectsSentinelRef} className="h-1" />

                          {/* Fallback load more button */}
                          {!isLoadingEffects && (
                            <button
                              onClick={loadMoreEffects}
                              className="w-full py-3 text-sm font-semibold rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                              style={{ color: primaryColor }}
                            >
                              Load more ({effects.length - visibleEffectsCount} remaining)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              {/* Contract Resources (for contract transactions only) */}
              {isContractCall && (
                <>
                  {/* Contract Execution */}
                  <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Contract Execution</h3>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {[
                        { label: 'Contract Address', value: contractAddress || 'N/A', isContract: true },
                        { label: 'Function Called', value: contractFunctionName || 'Unknown' },
                        { label: 'Function Type', value: contractFunctionType !== 'unknown' ? contractFunctionType : 'N/A' },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center px-4 py-3">
                          <span className="text-xs text-[var(--text-tertiary)] font-medium">{item.label}</span>
                          {item.isContract && contractAddress ? (
                            <Link href={`/contract/${contractAddress}`} className="text-xs font-mono font-bold hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(contractAddress, 6)}
                            </Link>
                          ) : (
                            <span className="text-xs font-mono font-bold text-[var(--text-secondary)] capitalize">{item.value}</span>
                          )}
                        </div>
                      ))}
                      {/* Signatures in Contract Execution */}
                      {transaction.signatures.length > 0 && transaction.signatures.map((sig, idx) => (
                        <div key={idx} className="flex justify-between items-center px-4 py-3">
                          <span className="text-xs text-[var(--text-tertiary)] font-medium">Signature {transaction.signatures.length > 1 ? `${idx + 1}` : ''}</span>
                          <button
                            onClick={(e) => {
                              navigator.clipboard.writeText(sig);
                              const btn = e.currentTarget;
                              const original = btn.textContent;
                              btn.textContent = 'Copied!';
                              btn.classList.add('text-[var(--success)]');
                              setTimeout(() => {
                                btn.textContent = original;
                                btn.classList.remove('text-[var(--success)]');
                              }, 1500);
                            }}
                            className="text-xs font-mono font-bold text-[var(--text-secondary)] hover:opacity-70 transition-all cursor-pointer"
                            title="Click to copy"
                          >
                            {sig.slice(0, 8)}...{sig.slice(-6)}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transaction Resources & Metrics */}
                  <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Transaction Resources</h3>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)]">
                      {/* Transaction Overview */}
                      <div className="p-4">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Ledger', value: transaction.ledger.toLocaleString() },
                            { label: 'Ops', value: transaction.operation_count.toString() },
                            { label: 'Effects', value: effects.length.toString() },
                            { label: 'Sigs', value: transaction.signatures.length.toString() },
                          ].map((item, i) => (
                            <div key={i} className="bg-[var(--bg-tertiary)] rounded-lg p-2 border border-[var(--border-subtle)] text-center">
                              <div className="text-[9px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">{item.label}</div>
                              <div className="text-xs font-bold text-[var(--text-secondary)] font-mono mt-0.5">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fees */}
                      <div className="p-4">
                        <div className="text-[10px] uppercase text-[var(--text-tertiary)] font-bold tracking-wider mb-3">Fees</div>
                        <div className="space-y-2">
                          {[
                            { label: 'Fee Charged', value: `${(parseInt(transaction.fee_charged) / 10000000).toFixed(7)} XLM` },
                            { label: 'Max Fee', value: `${(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM` },
                            { label: 'Base Fee', value: `${(100 / 10000000).toFixed(7)} XLM` },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-[var(--text-tertiary)]">{item.label}</span>
                              <span className="font-mono font-semibold text-[var(--text-secondary)]">{item.value}</span>
                            </div>
                          ))}
                          {/* Detailed fee breakdown */}
                          {decodedMeta && decodedMeta.success && decodedMeta.metrics && (
                            (decodedMeta.metrics.totalRefundableResourceFeeCharged || decodedMeta.metrics.totalNonRefundableResourceFeeCharged || decodedMeta.metrics.rentFeeCharged) && (
                              <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] space-y-2">
                                {decodedMeta.metrics.totalRefundableResourceFeeCharged && parseInt(decodedMeta.metrics.totalRefundableResourceFeeCharged) > 0 && (
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-muted)]">└ Refundable</span>
                                    <span className="font-mono text-[var(--text-secondary)]">{(parseInt(decodedMeta.metrics.totalRefundableResourceFeeCharged) / 10000000).toFixed(7)} XLM</span>
                                  </div>
                                )}
                                {decodedMeta.metrics.totalNonRefundableResourceFeeCharged && parseInt(decodedMeta.metrics.totalNonRefundableResourceFeeCharged) > 0 && (
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-muted)]">└ Non-Refundable</span>
                                    <span className="font-mono text-[var(--text-secondary)]">{(parseInt(decodedMeta.metrics.totalNonRefundableResourceFeeCharged) / 10000000).toFixed(7)} XLM</span>
                                  </div>
                                )}
                                {decodedMeta.metrics.rentFeeCharged && parseInt(decodedMeta.metrics.rentFeeCharged) > 0 && (
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-muted)]">└ Rent</span>
                                    <span className="font-mono text-[var(--text-secondary)]">{(parseInt(decodedMeta.metrics.rentFeeCharged) / 10000000).toFixed(7)} XLM</span>
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Contract Resources */}
                      {(envelopeMetrics || (decodedMeta && decodedMeta.success)) && (
                        <div className="p-4">
                          <div className="text-[10px] uppercase text-[var(--text-tertiary)] font-bold tracking-wider mb-3">Contract Resources</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-2.5 border border-[var(--border-subtle)]">
                              <div className="text-[9px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">Instructions</div>
                              <div className="text-xs font-bold font-mono text-[var(--text-secondary)] mt-0.5">
                                {envelopeMetrics?.cpuInsns ? parseInt(envelopeMetrics.cpuInsns).toLocaleString() :
                                  decodedMeta?.metrics?.cpuInsns ? parseInt(decodedMeta.metrics.cpuInsns).toLocaleString() : '—'}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-2.5 border border-[var(--border-subtle)]">
                              <div className="text-[9px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">Read Bytes</div>
                              <div className="text-xs font-bold font-mono text-[var(--text-secondary)] mt-0.5">
                                {envelopeMetrics?.readBytes ? parseInt(envelopeMetrics.readBytes).toLocaleString() :
                                  decodedMeta?.metrics?.txByteRead ? decodedMeta.metrics.txByteRead.toLocaleString() : '—'}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-2.5 border border-[var(--border-subtle)]">
                              <div className="text-[9px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">Write Bytes</div>
                              <div className="text-xs font-bold font-mono text-[var(--text-secondary)] mt-0.5">
                                {envelopeMetrics?.writeBytes ? parseInt(envelopeMetrics.writeBytes).toLocaleString() :
                                  decodedMeta?.metrics?.txByteWrite ? decodedMeta.metrics.txByteWrite.toLocaleString() : '—'}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-2.5 border border-[var(--border-subtle)]">
                              <div className="text-[9px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">Ledger Entries</div>
                              <div className="text-xs font-bold font-mono text-[var(--text-secondary)] mt-0.5">
                                {envelopeMetrics ? (
                                  <>{envelopeMetrics.readEntries || 0}R / {envelopeMetrics.writeEntries || 0}W</>
                                ) : decodedMeta?.stateChanges ? (
                                  <>{decodedMeta.stateChanges.filter(c => c.type === 'updated' || c.type === 'removed').length}R / {decodedMeta.stateChanges.length}W</>
                                ) : '—'}
                              </div>
                            </div>
                          </div>
                          {decodedMeta && decodedMeta.success && decodedMeta.events && decodedMeta.events.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                              <span className="text-[var(--text-tertiary)]">Events Emitted</span>
                              <span className="font-mono font-semibold text-[var(--text-secondary)]">{decodedMeta.events.length}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Transaction Data */}
                      <div className="p-4">
                        <div className="text-[10px] uppercase text-[var(--text-tertiary)] font-bold tracking-wider mb-3">Transaction Data</div>
                        <div className="space-y-2">
                          {[
                            { label: 'Envelope XDR', value: Math.ceil(transaction.envelope_xdr.length * 3 / 4) },
                            { label: 'Result XDR', value: Math.ceil(transaction.result_xdr.length * 3 / 4) },
                            ...(transaction.result_meta_xdr ? [{ label: 'Result Meta', value: Math.ceil(transaction.result_meta_xdr.length * 3 / 4) }] : []),
                            ...(transaction.fee_meta_xdr ? [{ label: 'Fee Meta', value: Math.ceil(transaction.fee_meta_xdr.length * 3 / 4) }] : []),
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-[var(--text-tertiary)]">{item.label}</span>
                              <span className="font-mono font-semibold text-[var(--text-secondary)]">{item.value.toLocaleString()} bytes</span>
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] flex justify-between items-center text-xs">
                            <span className="text-[var(--text-secondary)] font-medium">Total Size</span>
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                              {(
                                Math.ceil(transaction.envelope_xdr.length * 3 / 4) +
                                Math.ceil(transaction.result_xdr.length * 3 / 4) +
                                (transaction.result_meta_xdr ? Math.ceil(transaction.result_meta_xdr.length * 3 / 4) : 0) +
                                (transaction.fee_meta_xdr ? Math.ceil(transaction.fee_meta_xdr.length * 3 / 4) : 0)
                              ).toLocaleString()} bytes
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
                {[
                  { label: 'Transaction Size', value: `${Math.ceil(transaction.envelope_xdr.length * 3 / 4).toLocaleString()} bytes` },
                  { label: 'Fee Charged', value: `${feeXLM} XLM` },
                  { label: 'Max Fee', value: `${(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM` },
                  { label: 'Memo', value: transaction.memo ? `${transaction.memo} (${transaction.memo_type})` : 'None' },
                  { label: 'Source Account', value: transaction.source_account, isLink: true },
                  { label: 'Sequence', value: transaction.source_account_sequence },
                  { label: 'Ledger', value: transaction.ledger.toString(), linkUrl: `/ledger/${transaction.ledger}` },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
                    <span className="text-xs text-[var(--text-tertiary)] font-medium">{item.label}</span>
                    {item.isLink ? (
                      <Link href={`/account/${item.value}`} className="text-xs font-bold font-mono hover:opacity-80" style={{ color: primaryColor }}>
                        {shortenAddress(item.value!, 4)}
                      </Link>
                    ) : item.linkUrl ? (
                      <Link href={item.linkUrl} className="text-xs font-bold hover:opacity-80" style={{ color: primaryColor }}>
                        {item.value}
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-[var(--text-secondary)] text-right">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Signatures */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                <h3 className="text-sm font-bold mb-3" style={{ color: primaryColor }}>Signatures</h3>
                <div className="space-y-2">
                  {transaction.signatures.map((sig, idx) => (
                    <div key={idx} className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-subtle)]">
                      <p className="text-[11px] font-mono text-[var(--text-secondary)] break-all">{sig}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw XDR Data */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold" style={{ color: primaryColor }}>Envelope XDR</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transaction.envelope_xdr);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)] max-h-32 overflow-y-auto">
                  <p className="font-mono text-[10px] text-[var(--text-secondary)] break-all leading-relaxed">{transaction.envelope_xdr}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold" style={{ color: primaryColor }}>Result XDR</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transaction.result_xdr);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)] max-h-32 overflow-y-auto">
                  <p className="font-mono text-[10px] text-[var(--text-secondary)] break-all leading-relaxed">{transaction.result_xdr}</p>
                </div>
              </div>
            </div>
          )}

          {/* TRACE TAB (Contract transactions only) */}
          {activeTab === 'trace' && isContractCall && (
            <div className="space-y-4">
              {/* Invocation Trace */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
                <div className="px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Invocation Trace</h3>
                </div>
                <div className="p-4">
                  {/* Loading state */}
                  {isDecodingXdr && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--accent)] border-t-transparent"></div>
                      <span className="ml-2 text-xs text-[var(--text-tertiary)]">Decoding XDR...</span>
                    </div>
                  )}

                  {/* Decoded invocation trace */}
                  {!isDecodingXdr && decodedMeta && decodedMeta.success && (
                    <>
                      {/* Return Value */}
                      {decodedMeta.returnValue && (
                        <div className="mb-4 p-3 bg-[var(--success-muted)] rounded-xl border border-[var(--success)]/30">
                          <div className="text-[10px] uppercase text-[var(--success)] font-semibold tracking-wider mb-1">Return Value</div>
                          <div className="font-mono text-xs text-[var(--success)] break-all">
                            <span className="text-[var(--success)]">{decodedMeta.returnValue.type}:</span> {decodedMeta.returnValue.display}
                          </div>
                        </div>
                      )}

                      {/* Main invocation */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[var(--text-tertiary)] mb-1 flex items-center flex-wrap">
                            <Link href={`/account/${transaction.source_account}`} className="font-mono hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(transaction.source_account, 4)}
                            </Link>
                            <AccountBadges address={transaction.source_account} labels={accountLabels} />
                            <span className="mx-1">invoked</span>
                            <Link href={`/contract/${contractAddress}`} className="font-mono hover:opacity-80" style={{ color: primaryColor }}>
                              {contractAddress ? shortenAddress(contractAddress, 4) : 'contract'}
                            </Link>
                          </div>
                          <div className="bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 font-mono text-xs">
                            <span className="text-[var(--accent)] font-semibold">{contractFunctionName || 'call'}</span>
                            <span className="text-[var(--text-tertiary)]">(</span>
                            <span className="text-[var(--text-muted)]">...</span>
                            <span className="text-[var(--text-tertiary)]">)</span>
                          </div>
                        </div>
                      </div>

                      {/* Decoded invocation trace items */}
                      {decodedMeta.invocationTrace.length > 0 && (
                        <div className="space-y-2">
                          {decodedMeta.invocationTrace.slice(0, isTraceExpanded ? undefined : 15).map((call, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 border-l-2 border-[var(--border-default)] pl-4"
                              style={{ marginLeft: `${Math.min(call.depth, 4) * 16}px` }}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${call.type === 'fn_call' ? 'bg-[var(--primary-blue)]/20' :
                                call.type === 'fn_return' ? 'bg-[var(--success)]/20' : 'bg-[var(--warning)]/20'
                                }`}>
                                {call.type === 'fn_call' ? (
                                  <svg className="w-2.5 h-2.5 text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                ) : call.type === 'fn_return' ? (
                                  <svg className="w-2.5 h-2.5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                  </svg>
                                ) : (
                                  <svg className="w-2.5 h-2.5 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-[var(--text-tertiary)]">
                                  {call.type === 'fn_call' && (
                                    <>
                                      <span className="text-[var(--primary-blue)] font-semibold">call</span>
                                      {call.contractId && (
                                        <>
                                          <span className="mx-1">to</span>
                                          <Link href={`/contract/${call.contractId}`} className="font-mono hover:opacity-80" style={{ color: primaryColor }}>
                                            {shortenAddress(call.contractId, 4)}
                                          </Link>
                                        </>
                                      )}
                                      {call.functionName && (
                                        <span className="font-mono text-[var(--accent)] ml-1">.{call.functionName}()</span>
                                      )}
                                    </>
                                  )}
                                  {call.type === 'fn_return' && (
                                    <>
                                      <span className="text-[var(--success)] font-semibold">return</span>
                                      {call.functionName && (
                                        <span className="font-mono text-[var(--text-tertiary)] ml-1">{call.functionName}</span>
                                      )}
                                      {call.returnValue && (
                                        <span className="font-mono text-[var(--success)] ml-1">= {call.returnValue.display}</span>
                                      )}
                                    </>
                                  )}
                                  {call.type === 'event' && (
                                    <>
                                      <span className="text-[var(--warning)] font-semibold">event</span>
                                      {call.args && call.args.length > 0 && (
                                        <span className="font-mono text-[var(--text-secondary)] font-bold ml-1">{call.args[0].display}</span>
                                      )}
                                      {call.contractId && (
                                        <>
                                          <span className="mx-1">from</span>
                                          <Link href={`/contract/${call.contractId}`} className="font-mono hover:opacity-80" style={{ color: primaryColor }}>
                                            {shortenAddress(call.contractId, 4)}
                                          </Link>
                                        </>
                                      )}

                                      {/* Event Details (Topics & Data) */}
                                      <div className="mt-1 bg-[var(--bg-tertiary)] rounded-lg p-2 text-[11px] font-mono text-[var(--text-secondary)] border border-[var(--border-default)]">
                                        {/* Topics */}
                                        {call.args && call.args.length > 1 && (
                                          <div className="flex flex-col gap-1.5 mb-2">
                                            {call.args.slice(1).map((arg, argIdx) => (
                                              <div key={argIdx} className="flex flex-col">
                                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-0.5">Topic {argIdx + 1}</span>
                                                <span className="bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-subtle)] text-[var(--warning)] break-all leading-relaxed shadow-sm">
                                                  {arg.display}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Data / Amount */}
                                        {call.returnValue && (
                                          <div className="pt-2 border-t border-[var(--border-subtle)]">
                                            <div className="flex flex-col">
                                              {/* Special handling for 'mint' events where data is often amount */}
                                              {call.args && call.args.length > 0 && call.args[0].display === 'mint' ? (
                                                <>
                                                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-0.5">Amount (Minted)</span>
                                                  <span className="font-bold text-[var(--warning)] text-xs">
                                                    {formatTokenAmount((parseFloat(call.returnValue.display) / 10000000).toString())}
                                                  </span>
                                                </>
                                              ) : (
                                                <>
                                                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-0.5">Data</span>
                                                  <span className="text-[var(--text-secondary)] break-all leading-relaxed whitespace-pre-wrap">
                                                    {call.returnValue.display}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                                {/* Show args for function calls */}
                                {call.type === 'fn_call' && call.args && call.args.length > 0 && (
                                  <div className="mt-1 bg-[var(--bg-tertiary)] rounded px-2 py-1 text-[10px] font-mono text-[var(--text-secondary)] space-y-0.5">
                                    {call.args.slice(0, 4).map((arg, argIdx) => (
                                      <div key={argIdx} className="truncate">
                                        <span className="text-[var(--text-muted)]">arg{argIdx}:</span> <span className="text-[var(--primary-blue)]">{arg.display}</span>
                                      </div>
                                    ))}
                                    {call.args.length > 4 && (
                                      <div className="text-[var(--text-muted)]">+{call.args.length - 4} more args</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {decodedMeta.invocationTrace.length > 15 && (
                            <button
                              onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                              className="w-full flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors py-2 mt-2"
                            >
                              {isTraceExpanded ? (
                                <>
                                  <span>Show less</span>
                                  <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>+{decodedMeta.invocationTrace.length - 15} more trace items</span>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Contract Events with Enhanced Categorization */}
                      {decodedMeta.parsedEvents && decodedMeta.parsedEvents.length > 0 && (
                        <div className="mt-4">
                          <div className="text-[10px] uppercase text-[var(--text-tertiary)] font-semibold tracking-wider mb-2">Contract Events ({decodedMeta.parsedEvents.length})</div>
                          <div className="space-y-2">
                            {decodedMeta.parsedEvents.slice(0, 10).map((event, idx) => {
                              // Category-based colors - theme-aware
                              const categoryColors = {
                                transfer: { bg: 'bg-[var(--success)]/10', border: 'border-[var(--success)]/30', text: 'text-[var(--success)]', icon: 'text-[var(--success)]' },
                                approval: { bg: 'bg-[var(--info)]/10', border: 'border-[var(--info)]/30', text: 'text-[var(--info)]', icon: 'text-[var(--info)]' },
                                mint: { bg: 'bg-[var(--accent)]/10', border: 'border-[var(--accent)]/30', text: 'text-[var(--accent)]', icon: 'text-[var(--accent)]' },
                                burn: { bg: 'bg-[var(--error)]/10', border: 'border-[var(--error)]/30', text: 'text-[var(--error)]', icon: 'text-[var(--error)]' },
                                trade: { bg: 'bg-[var(--warning)]/10', border: 'border-[var(--warning)]/30', text: 'text-[var(--warning)]', icon: 'text-[var(--warning)]' },
                                liquidity: { bg: 'bg-[var(--info)]/10', border: 'border-[var(--info)]/30', text: 'text-[var(--info)]', icon: 'text-[var(--info)]' },
                                state: { bg: 'bg-[var(--bg-tertiary)]', border: 'border-[var(--border-default)]', text: 'text-[var(--text-secondary)]', icon: 'text-[var(--text-tertiary)]' },
                                other: { bg: 'bg-[var(--bg-tertiary)]', border: 'border-[var(--border-default)]', text: 'text-[var(--text-secondary)]', icon: 'text-[var(--text-tertiary)]' },
                              };
                              const colors = categoryColors[event.category || 'other'];

                              return (
                                <div key={idx} className={`${colors.bg} rounded-lg px-3 py-2 border ${colors.border}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] uppercase ${colors.text} font-semibold`}>
                                      {event.eventName || event.type}
                                    </span>
                                    {event.category && event.category !== 'other' && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-secondary)]/50 rounded text-[var(--text-tertiary)]">
                                        {event.category}
                                      </span>
                                    )}
                                    {event.contractId && (
                                      <Link href={`/contract/${event.contractId}`} className="text-[10px] font-mono hover:opacity-80 ml-auto" style={{ color: primaryColor }}>
                                        {shortenAddress(event.contractId, 4)}
                                      </Link>
                                    )}
                                  </div>
                                  {/* Decoded params for known event types */}
                                  {event.decodedParams && Object.keys(event.decodedParams).length > 0 && (
                                    <div className="space-y-0.5 mt-1">
                                      {Object.entries(event.decodedParams).map(([key, val]) => (
                                        <div key={key} className={`text-[10px] font-mono ${colors.text}`}>
                                          <span className="text-[var(--text-tertiary)]">{key}:</span>{' '}
                                          <span className={colors.icon}>{val.display}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Fallback to raw topics/data if no decoded params */}
                                  {(!event.decodedParams || Object.keys(event.decodedParams).length === 0) && (
                                    <>
                                      {event.topics.length > 1 && (
                                        <div className={`text-[10px] font-mono ${colors.text}`}>
                                          {event.topics.slice(1).map((t, i) => (
                                            <span key={i} className="mr-2">{t.display}</span>
                                          ))}
                                        </div>
                                      )}
                                      {event.data && (
                                        <div className={`text-[10px] font-mono ${colors.icon} truncate`}>
                                          {event.data.display}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            {decodedMeta.parsedEvents.length > 10 && (
                              <div className="text-xs text-[var(--text-muted)] text-center">
                                +{decodedMeta.parsedEvents.length - 10} more events
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* State Changes */}
                      {decodedMeta.stateChanges && decodedMeta.stateChanges.length > 0 && (
                        <div className="mt-4">
                          <div className="text-[10px] uppercase text-[var(--text-tertiary)] font-semibold tracking-wider mb-2">State Changes ({decodedMeta.stateChanges.length})</div>
                          <div className="space-y-2">
                            {decodedMeta.stateChanges.slice(0, 8).map((change, idx) => {
                              const changeColors = {
                                created: { bg: 'bg-[var(--success)]/10', border: 'border-[var(--success)]/30', badge: 'bg-[var(--success)]/20 text-[var(--success)]' },
                                updated: { bg: 'bg-[var(--info)]/10', border: 'border-[var(--info)]/30', badge: 'bg-[var(--info)]/20 text-[var(--info)]' },
                                removed: { bg: 'bg-[var(--error)]/10', border: 'border-[var(--error)]/30', badge: 'bg-[var(--error)]/20 text-[var(--error)]' },
                              };
                              const colors = changeColors[change.type];

                              return (
                                <div key={idx} className={`${colors.bg} rounded-lg px-3 py-2 border ${colors.border}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold ${colors.badge}`}>
                                      {change.type}
                                    </span>
                                    {change.durability && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-secondary)]/50 rounded text-[var(--text-tertiary)]">
                                        {change.durability}
                                      </span>
                                    )}
                                    {change.contractId && (
                                      <Link href={`/contract/${change.contractId}`} className="text-[10px] font-mono hover:opacity-80 ml-auto" style={{ color: primaryColor }}>
                                        {shortenAddress(change.contractId, 4)}
                                      </Link>
                                    )}
                                  </div>
                                  {change.key && (
                                    <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-1">
                                      <span className="text-[var(--text-muted)]">key:</span> {change.key.display}
                                    </div>
                                  )}
                                  {change.type === 'updated' && change.valueBefore && change.valueAfter && (
                                    <div className="space-y-1 text-[10px] font-mono">
                                      <div className="text-[var(--error)]">
                                        <span className="text-[var(--text-muted)]">before:</span> {change.valueBefore.display}
                                      </div>
                                      <div className="text-[var(--success)]">
                                        <span className="text-[var(--text-muted)]">after:</span> {change.valueAfter.display}
                                      </div>
                                    </div>
                                  )}
                                  {change.type === 'created' && change.valueAfter && (
                                    <div className="text-[10px] font-mono text-[var(--success)]">
                                      <span className="text-[var(--text-muted)]">value:</span> {change.valueAfter.display}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {decodedMeta.stateChanges.length > 8 && (
                              <div className="text-xs text-[var(--text-muted)] text-center">
                                +{decodedMeta.stateChanges.length - 8} more state changes
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* No trace data available */}
                      {decodedMeta.invocationTrace.length === 0 && decodedMeta.parsedEvents.length === 0 && decodedMeta.stateChanges.length === 0 && (
                        <div className="mt-3 p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
                          <p className="text-xs text-[var(--text-tertiary)]">No detailed invocation trace available for this transaction.</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fallback when XDR not available or decoding failed */}
                  {!isDecodingXdr && (!decodedMeta || !decodedMeta.success) && (
                    <>
                      {/* Main invocation */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[var(--text-tertiary)] mb-1 flex items-center flex-wrap">
                            <Link href={`/account/${transaction.source_account}`} className="font-mono hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(transaction.source_account, 4)}
                            </Link>
                            <AccountBadges address={transaction.source_account} labels={accountLabels} />
                            <span className="mx-1">invoked</span>
                            <Link href={`/contract/${contractAddress}`} className="font-mono hover:opacity-80" style={{ color: primaryColor }}>
                              {contractAddress ? shortenAddress(contractAddress, 4) : 'contract'}
                            </Link>
                          </div>
                          <div className="bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 font-mono text-xs">
                            <span className="text-[var(--accent)] font-semibold">{contractFunctionName || 'call'}</span>
                            <span className="text-[var(--text-tertiary)]">(</span>
                            <span className="text-[var(--text-muted)]">...</span>
                            <span className="text-[var(--text-tertiary)]">)</span>
                          </div>
                        </div>
                      </div>

                      {/* Effects as trace items */}
                      {effects.slice(0, 6).map((effect, idx) => (
                        <div key={idx} className="flex items-start gap-3 mb-2 ml-4 border-l-2 border-[var(--border-default)] pl-4">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${effect.type.includes('credited') ? 'bg-[var(--success)]/20' :
                            effect.type.includes('debited') ? 'bg-[var(--error)]/20' : 'bg-[var(--bg-tertiary)]'
                            }`}>
                            <svg className={`w-2.5 h-2.5 ${effect.type.includes('credited') ? 'text-[var(--success)]' :
                              effect.type.includes('debited') ? 'text-[var(--error)]' : 'text-[var(--text-tertiary)]'
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {effect.type.includes('credited') ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              ) : effect.type.includes('debited') ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              )}
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-[var(--text-tertiary)]">
                              {effect.amount && (
                                <span className={`font-mono font-bold ${effect.type.includes('credited') ? 'text-[var(--success)]' : effect.type.includes('debited') ? 'text-[var(--error)]' : ''}`}>
                                  {effect.type.includes('credited') ? '+' : effect.type.includes('debited') ? '-' : ''}
                                  {parseFloat(effect.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })} {effect.asset_type === 'native' ? 'XLM' : effect.asset_code || ''}
                                </span>
                              )}
                              <span className="mx-1">{effect.type.includes('credited') ? 'credited to' : effect.type.includes('debited') ? 'debited from' : effect.type.replace(/_/g, ' ')}</span>
                              <Link href={`/account/${effect.account}`} className="font-mono hover:opacity-80" style={{ color: primaryColor }}>
                                {shortenAddress(effect.account, 4)}
                              </Link>
                              <AccountBadges address={effect.account} labels={accountLabels} />
                            </div>
                          </div>
                        </div>
                      ))}

                      {effects.length > 6 && (
                        <div className="text-xs text-[var(--text-muted)] text-center mt-2">
                          +{effects.length - 6} more effects
                        </div>
                      )}

                      {/* Error message if decoding failed */}
                      {decodedMeta && !decodedMeta.success && decodedMeta.error && (
                        <div className="mt-4 p-3 bg-[var(--error-muted)] rounded-xl border border-[var(--error)]/30">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-[var(--error)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-xs text-[var(--error)] font-medium">XDR decoding error</p>
                              <p className="text-[11px] text-[var(--error)] mt-1">{decodedMeta.error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Note when no XDR available after fetch attempt */}
                      {xdrFetchAttempted && !transaction.result_meta_xdr && !fetchedXdr && (
                        <div className="mt-4 p-3 bg-[var(--warning)]/10 rounded-xl border border-[var(--warning)]/30">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <p className="text-xs text-[var(--warning)] font-medium">Invocation trace not available</p>
                              <p className="text-[11px] text-[var(--warning)] mt-1">This transaction may be too old or the Soroban RPC data has expired.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Global CSS for no-scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
