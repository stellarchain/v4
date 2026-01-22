'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate, formatXLM, extractContractAddress, detectContractFunctionType } from '@/lib/stellar';
import type { ContractFunctionType } from '@/lib/types/token';
import { containers, spacing } from '@/lib/design-system';

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
}

export default function TransactionMobileView({ transaction, operations, effects }: TransactionMobileViewProps) {
  // Determine Transaction Type first to set default tab
  const contractOp = operations.find(op => op.type === 'invoke_host_function');
  const isContractCall = !!contractOp;

  const [activeTab, setActiveTab] = useState<'operations' | 'effects' | 'details' | 'raw' | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Pagination state for operations and effects
  const [opsPage, setOpsPage] = useState(1);
  const [effectsPage, setEffectsPage] = useState(1);
  const OPS_PER_PAGE = 10;
  const EFFECTS_PER_PAGE = 10;
  const router = useRouter();

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
      // Try to get actual amounts from effects first (more accurate than operation amounts)
      // Use includes() to match various effect types (account_debited, contract_debited, etc.)
      const debitEffect = effects.find(e => e.type.includes('debited'));
      const creditEffect = effects.find(e => e.type.includes('credited'));

      // Source = Sold (prefer effect amount if available)
      const soldAmount = debitEffect?.amount || (swapOp as any).source_amount || '0';
      const soldAsset = debitEffect
        ? (debitEffect.asset_type === 'native' ? 'XLM' : (debitEffect.asset_code || 'XLM'))
        : ((swapOp as any).source_asset_type === 'native' ? 'XLM' : ((swapOp as any).source_asset_code || 'XLM'));

      // Dest = Bought (prefer effect amount if available)
      const boughtAmount = creditEffect?.amount || swapOp.amount || '0';
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
  // Check for effects that look like transfers (credited/debited) to show "Value"
  // Check for effects that look like transfers (credited/debited) to show "Value"
  if (isContractCall) {
    const accounts = Array.from(new Set(effects.map(e => e.account)));
    let validDebit = undefined;
    let validCredit = undefined;

    // 1. Swap Search (Same Account)
    for (const account of accounts) {
      const d = effects.find(e => e.account === account && e.type.includes('debited'));
      const c = effects.find(e => e.account === account && e.type.includes('credited'));
      if (d && c) {
        validDebit = d;
        validCredit = c;
        break;
      }
    }

    // 2. General Flow Search (if no swap found)
    if (!validDebit && !validCredit) {
      validDebit = effects.find(e => e.type.includes('debited'));
      validCredit = effects.find(e => e.type.includes('credited'));
    }

    if (validDebit && validCredit) {
      contractEffectType = 'both';
      contractReceivedAmount = validCredit.amount || '0';
      contractReceivedAsset = validCredit.asset_type === 'native' ? 'XLM' : (validCredit.asset_code || 'XLM');
      contractSentAmount = validDebit.amount || '0';
      contractSentAsset = validDebit.asset_type === 'native' ? 'XLM' : (validDebit.asset_code || 'XLM');
    } else if (validCredit) {
      contractEffectAmount = validCredit.amount || '0';
      contractEffectAsset = validCredit.asset_type === 'native' ? 'XLM' : (validCredit.asset_code || 'XLM');
      contractEffectType = 'received';
    } else if (validDebit) {
      contractEffectAmount = validDebit.amount || '0';
      contractEffectAsset = validDebit.asset_type === 'native' ? 'XLM' : (validDebit.asset_code || 'XLM');
      contractEffectType = 'sent';
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
    <div className="min-h-screen bg-slate-100 text-slate-700 pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: primaryColor }}>
            {isContractCall ? (contractFunctionName || 'Contract') : typeLabel}
          </h1>
        </div>
        <div className="flex-1 max-w-[180px] ml-auto">
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-3 py-2 bg-slate-200 border-none rounded-full text-sm text-slate-700 placeholder-slate-500 focus:ring-2 focus:bg-white transition-all"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 max-w-lg mx-auto w-full">
        {/* Meta Data Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDate(transaction.created_at)}</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            transaction.successful
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-red-50 text-red-600 border-red-100'
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
            className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-mono text-[11px] tracking-wide hover:bg-slate-300 transition-colors"
          >
            #{transaction.hash.slice(0, 4)}...{transaction.hash.slice(-3)}
            {copied && <span className="text-emerald-500 ml-1">✓</span>}
          </button>
        </div>

        {isContractCall ? (
          <>

            <div className={`${containers.cardCompact} p-4 mb-5`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-widest">Transaction Type</div>
                  <div className="text-base font-bold text-slate-900 mt-1">{contractFunctionName || 'Smart Contract'}</div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <div className="inline-flex items-center bg-violet-50 text-violet-600 border border-violet-100 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                      Smart Contract
                    </div>
                    {contractFunctionType !== 'unknown' && (
                      <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide border ${
                        contractFunctionType === 'transfer' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        contractFunctionType === 'swap' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        contractFunctionType === 'mint' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        contractFunctionType === 'burn' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        contractFunctionType === 'approve' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                        contractFunctionType === 'deposit' ? 'bg-green-50 text-green-600 border-green-100' :
                        contractFunctionType === 'withdraw' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        {contractFunctionType}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-widest">Account</div>
                  <Link href={`/account/${transaction.source_account}`} className="text-xs font-semibold hover:opacity-80 block mt-1" style={{ color: primaryColor }}>
                    {shortenAddress(transaction.source_account, 4)}
                  </Link>
                </div>
              </div>

              {/* Contract Address */}
              {contractAddress && (
                <div className="mt-3 pt-3 border-t border-slate-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-widest">Contract</span>
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
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden transition-all duration-300">
                {contractEffectType === 'both' ? (
                  <div className="relative z-10">
                    <div className="space-y-4">
                      {/* Sent Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Sent</div>
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {formatTokenAmount(contractSentAmount)} <span className="text-[11px] font-normal text-slate-500">{contractSentAsset}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Connector */}
                      <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-slate-100 -z-10"></div>

                      {/* Received Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Received</div>
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {formatTokenAmount(contractReceivedAmount)} <span className="text-[11px] font-normal text-slate-500">{contractReceivedAsset}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show expand button if there are more than 2 transfer effects */}
                    {contractTransferEffects.length > 2 && (
                      <div className="mt-4 pt-3 border-t border-slate-200/50">
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors py-1"
                        >
                          <span>{isExpanded ? 'Hide' : 'Show'} all {contractTransferEffects.length} effects</span>
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded Effects List */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                            {contractTransferEffects.map((effect, idx) => {
                              const isCredit = effect.type.includes('credited');
                              const isDebit = effect.type.includes('debited');
                              const effectAsset = effect.asset_type === 'native' ? 'XLM' : (effect.asset_code || 'XLM');
                              return (
                                <div key={effect.id || idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {isCredit ? (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                                        ) : (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7" />
                                        )}
                                      </svg>
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase ${isCredit ? 'text-emerald-600' : isDebit ? 'text-orange-600' : 'text-slate-500'}`}>
                                      {isCredit ? 'Received' : isDebit ? 'Sent' : effect.type.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-mono text-xs font-bold ${isCredit ? 'text-emerald-600' : isDebit ? 'text-red-500' : 'text-slate-700'}`}>
                                      {isCredit ? '+' : isDebit ? '-' : ''}{formatTokenAmount(effect.amount)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 ml-1">{effectAsset}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`flex items-center text-[11px] font-bold uppercase tracking-wide mb-1 ${contractHeaderIsCredit ? 'text-emerald-600' : 'text-slate-500'
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
                        <div className="text-xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2">
                          {formatTokenAmount(contractHeaderAmount)}
                          <span className="text-sm font-semibold text-slate-500">{contractHeaderAsset}</span>
                        </div>

                        {contractHeaderAccount && (
                          <div className="text-[11px] text-slate-400 mt-1 font-mono">
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
                          className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-500 hover:text-slate-700 transition-all ml-4"
                        >
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Expanded List */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
                        {contractTransferEffects
                          .filter(e => contractHeaderIsCredit ? e.type.includes('credited') : e.type.includes('debited'))
                          .slice(1)
                          .map((effect, idx) => (
                            <div key={effect.id || idx} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{formatTokenAmount(effect.amount)}</span>
                                <span className="text-xs text-slate-500 font-medium">{effect.asset_type === 'native' ? 'XLM' : (effect.asset_code || 'XLM')}</span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {effect.account && (
                                  <>
                                    <span className="opacity-50 mr-1">from</span>
                                    <Link href={`/account/${effect.account}`} className="hover:underline">
                                      {shortenAddress(effect.account, 4)}
                                    </Link>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200/50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px] font-medium">Network Fee</span>
                  <span className="font-mono text-[11px] font-bold text-slate-700">{feeXLM} XLM</span>
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
                  <div className="w-6 h-6 rounded-full bg-sky-50 flex items-center justify-center" style={{ color: primaryColor }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-900">DEX Limit Order</span>
                </div>

                {/* Vertical Trade Flow */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3 space-y-2.5">
                  {/* SELLING ROW */}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Selling</div>
                    <div className="text-right" title={offerDetails?.amount || '0'}>
                      <span className="text-sm font-bold text-slate-900">
                        {offerDetails?.amount ? formatCompactNumber(offerDetails.amount) : '0'}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">{offerDetails?.selling}</span>
                    </div>
                  </div>

                  {/* EXCHANGE RATE ROW */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider shrink-0">Rate</div>
                    <div
                      className="bg-slate-100 border border-slate-200 rounded-full px-2 py-1 text-[11px] font-mono text-slate-700 truncate"
                      title={`1 ${offerDetails?.selling} ≈ ${offerDetails?.price} ${offerDetails?.buying}`}
                    >
                      1 {offerDetails?.selling} ≈ {formatCompactNumber(offerDetails?.price || '0')} {offerDetails?.buying}
                    </div>
                  </div>

                  {/* BUYING ROW */}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Buying</div>
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
                      <span className="text-xs text-slate-500 ml-1">{offerDetails?.buying}</span>
                    </div>
                  </div>
                </div>

                {/* Order By */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Order by</span>
                  <Link href={`/account/${transaction.source_account}`} className="font-semibold hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                    {shortenAddress(transaction.source_account, 4)}
                  </Link>
                </div>
              </div>
            ) : isAccountOperation ? (
              /* Account Operation Card (no transfer) */
              <div className={`${containers.cardCompact} p-4 mb-4`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Account Operation</div>
                    <div className="text-sm font-bold text-slate-900 capitalize">
                      {operations[0]?.type.replace(/_/g, ' ') || 'Operation'}
                    </div>
                  </div>
                </div>

                {/* Operation Details */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Account</span>
                    <Link href={`/account/${transaction.source_account}`} className="text-xs font-semibold hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                      {shortenAddress(transaction.source_account, 4)}
                    </Link>
                  </div>

                  {/* Show asset info for trustline operations */}
                  {operations[0]?.type === 'change_trust' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Asset</span>
                      <span className="text-xs font-semibold" style={{ color: primaryColor }}>
                        {(operations[0] as any).asset_code || 'Unknown'}
                        {(operations[0] as any).asset_issuer && (
                          <span className="text-slate-400 ml-1">({shortenAddress((operations[0] as any).asset_issuer, 4)})</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Show effect summary */}
                  {effects.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Effect</span>
                      <span className="text-xs font-semibold capitalize" style={{ color: primaryColor }}>
                        {effects[0]?.type.replace(/_/g, ' ') || 'None'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Visual Flow for transfer transactions - Deep Ocean Design */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
                {/* FROM Section */}
                <div className="p-5 pb-8 relative bg-gradient-to-br from-slate-50 to-white">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
                        <svg className="w-6 h-6 -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-0.5">{fromLabel}</p>
                        {isSwap ? (
                          <p className="text-lg font-bold font-mono tracking-tight" style={{ color: primaryColor }}>
                            {formatTokenAmount(swapSold?.amount)} <span className="text-sm font-medium text-slate-400">{swapSold?.code}</span>
                          </p>
                        ) : (
                          <Link href={`/account/${transaction.source_account}`} className="text-lg font-bold font-mono tracking-tight hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
                            {shortenAddress(transaction.source_account, 4)}
                          </Link>
                        )}
                      </div>
                    </div>
                    {!isSwap && fromCardAmount > 0 && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-500">-{fromCardAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        <p className="text-[11px] font-bold text-slate-400">{fromCardAsset}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                <div className="relative h-0 z-10">
                  <div className="absolute inset-x-0 -top-3 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-x-6 top-1 border-t-2 border-dashed border-slate-200 -z-10"></div>
                </div>

                {/* TO Section */}
                <div className="p-5 pt-8 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                        <svg className="w-6 h-6 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-0.5">{toLabel}</p>
                      {isSwap ? (
                        <p className="text-lg font-bold font-mono tracking-tight" style={{ color: primaryColor }}>
                          {formatTokenAmount(swapBought?.amount)} <span className="text-sm font-medium text-slate-400">{swapBought?.code}</span>
                        </p>
                      ) : isMultiSend ? (
                        <button
                          onClick={() => setShowRecipients(!showRecipients)}
                          className="text-lg font-bold font-mono tracking-tight flex items-center gap-1" style={{ color: primaryColor }}
                        >
                          {uniqueRecipientCount} Recipients
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showRecipients ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      ) : (
                        <Link href={`/account/${destination}`} className="text-lg font-bold font-mono tracking-tight hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
                          {shortenAddress(destination, 4)}
                        </Link>
                      )}
                    </div>
                  </div>
                  {!isSwap && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-500">+{(isMultiSend ? displayAmount : toCardAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-[11px] font-bold text-slate-400">{isMultiSend ? displayAsset : toCardAsset}</p>
                    </div>
                  )}
                </div>
              </div>

                {/* Recipients List (expandable) */}
                {isMultiSend && showRecipients && (
                  <div className="border-t border-slate-100">
                    <div className="max-h-[40vh] overflow-y-auto bg-slate-50/50">
                      {Object.entries(
                        paymentOps.reduce((acc, op) => {
                          const to = op.to || (op as any).into || 'unknown';
                          if (!acc[to]) acc[to] = [];
                          acc[to].push(op);
                          return acc;
                        }, {} as Record<string, Operation[]>)
                      ).map(([to, ops], idx) => (
                        <div key={to} className="flex items-center justify-between px-5 py-3 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500">
                              {idx + 1}
                            </span>
                            <Link href={`/account/${to}`} className="text-xs font-semibold hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(to, 4)}
                            </Link>
                          </div>
                          <div className="text-right">
                            {ops.map((op, opIdx) => (
                              <div key={op.id || opIdx} className="text-xs font-bold text-slate-700">
                                {op.amount ? parseFloat(op.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                                <span className="text-slate-400 font-medium ml-1">{op.asset_type === 'native' ? 'XLM' : op.asset_code}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Network Fee */}
                <div className="flex justify-between items-center px-5 py-3 bg-sky-50/50 border-t border-slate-100">
                  <span className="text-slate-500 font-medium text-sm">Network Fee</span>
                  <span className="font-mono font-medium text-sm" style={{ color: primaryColor }}>{feeXLM} XLM</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tabs Navigation */}
        <div className="mt-8 mb-4 border-b border-slate-200">
          <nav className="flex gap-6 overflow-x-auto">
            {[
              { id: 'operations', label: 'Operations', count: transaction.operation_count },
              { id: 'effects', label: 'Effects', count: effects.length > 0 ? effects.length : undefined },
              { id: 'details', label: 'Details' },
              { id: 'raw', label: 'Raw Data' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id as any)}
                className={`whitespace-nowrap pb-3 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#0F4C81] text-[#0F4C81]'
                    : 'border-transparent text-slate-500 hover:text-[#0F4C81]'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`py-0.5 px-2 rounded-full text-xs ${activeTab === tab.id
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-slate-100 text-slate-500'
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">

          {/* OPERATIONS TAB */}
          {activeTab === 'operations' && (
            <div className="space-y-3">
              {operations.slice((opsPage - 1) * OPS_PER_PAGE, opsPage * OPS_PER_PAGE).map((op, idx) => {
                const opNum = (opsPage - 1) * OPS_PER_PAGE + idx + 1;
                const isPathPayment = op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                const isPaymentOp = op.type === 'payment';
                const isCreateAccount = op.type === 'create_account';
                const isOffer = ['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type);
                const isContract = op.type === 'invoke_host_function';

                // Determine icon and colors
                let iconBg = 'bg-slate-100';
                let iconColor = 'text-slate-500';
                let iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />;

                if (isPathPayment) {
                  iconBg = 'bg-blue-50';
                  iconColor = 'text-blue-500';
                  iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />;
                } else if (isPaymentOp || isCreateAccount) {
                  iconBg = 'bg-emerald-50';
                  iconColor = 'text-emerald-500';
                  iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
                } else if (isOffer) {
                  iconBg = 'bg-purple-50';
                  iconColor = 'text-purple-500';
                  iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
                } else if (isContract) {
                  iconBg = 'bg-orange-50';
                  iconColor = 'text-orange-500';
                  iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />;
                }

                // Get operation description
                let opTitle = getOperationTypeLabel(op.type).replace(/_/g, ' ');
                let opDescription = '';

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
                  <div key={op.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-4">
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
                        <p className="text-[11px] text-slate-500 mt-0.5">{opDescription}</p>
                      </div>
                    </div>

                    {/* Operation Details */}
                    <div className="space-y-2 bg-slate-50 rounded-xl p-3">
                      {/* From/To for payments */}
                      {(isPaymentOp || isCreateAccount) && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium text-xs">From</span>
                            <Link href={`/account/${op.from || op.source_account}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(op.from || op.source_account, 6)}
                            </Link>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium text-xs">To</span>
                            <Link href={`/account/${op.to || (op as any).account}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(op.to || (op as any).account, 6)}
                            </Link>
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200">
                            <span className="text-slate-400 font-medium text-xs">Amount</span>
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
                            <span className="text-slate-400 font-medium text-xs">From</span>
                            <Link href={`/account/${op.from || op.source_account}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(op.from || op.source_account, 6)}
                            </Link>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium text-xs">To</span>
                            <Link href={`/account/${op.to}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                              {shortenAddress(op.to || '', 6)}
                            </Link>
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200">
                            <span className="text-red-500 font-medium text-xs">Sent</span>
                            <span className="font-bold text-sm text-red-500">
                              -{formatCompactNumber(op.amount || (op as any).source_amount)} {(op as any).source_asset_type === 'native' ? 'XLM' : (op as any).source_asset_code || ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-500 font-medium text-xs">Received</span>
                            <span className="font-bold text-sm text-emerald-500">
                              +{formatCompactNumber((op as any).destination_amount || op.amount)} {op.asset_type === 'native' ? 'XLM' : op.asset_code || ''}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Offer details */}
                      {isOffer && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium text-xs">Selling</span>
                            <span className="font-bold text-sm" style={{ color: primaryColor }}>
                              {formatCompactNumber(op.amount || '0')} {(op as any).selling_asset_type === 'native' ? 'XLM' : (op as any).selling_asset_code || ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium text-xs">Buying</span>
                            <span className="font-bold text-sm" style={{ color: primaryColor }}>
                              {(op as any).buying_asset_type === 'native' ? 'XLM' : (op as any).buying_asset_code || ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200">
                            <span className="text-slate-400 font-medium text-xs">Price</span>
                            <span className="font-bold text-sm" style={{ color: primaryColor }}>{(op as any).price}</span>
                          </div>
                        </>
                      )}

                      {/* Contract details */}
                      {isContract && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium text-xs">Contract</span>
                          <Link href={`/contract/${extractContractAddress(op as any) || ''}`} className="font-mono text-xs hover:opacity-80" style={{ color: primaryColor }}>
                            {extractContractAddress(op as any) ? shortenAddress(extractContractAddress(op as any) || '', 6) : 'Unknown'}
                          </Link>
                        </div>
                      )}

                      {/* Fallback for other operations */}
                      {!isPaymentOp && !isCreateAccount && !isPathPayment && !isOffer && !isContract && op.amount && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium text-xs">Amount</span>
                          <span className="font-bold text-sm" style={{ color: primaryColor }}>
                            {formatCompactNumber(op.amount)} {op.asset_type === 'native' ? 'XLM' : op.asset_code || ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Operations Pagination */}
              {operations.length > OPS_PER_PAGE && (
                <div className="flex items-center justify-center gap-1 mt-4 pt-3">
                  <button
                    onClick={() => setOpsPage(p => Math.max(1, p - 1))}
                    disabled={opsPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {Array.from({ length: Math.ceil(operations.length / OPS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setOpsPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        opsPage === page
                          ? 'text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                      style={opsPage === page ? { backgroundColor: primaryColor } : {}}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setOpsPage(p => Math.min(Math.ceil(operations.length / OPS_PER_PAGE), p + 1))}
                    disabled={opsPage >= Math.ceil(operations.length / OPS_PER_PAGE)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EFFECTS TAB */}
          {activeTab === 'effects' && (
            <div className="space-y-3">
              {effects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No effects found for this transaction.
                </div>
              ) : (
                <>
                  {(() => {
                    // Paginate effects
                    const paginatedEffects = effects.slice((effectsPage - 1) * EFFECTS_PER_PAGE, effectsPage * EFFECTS_PER_PAGE);
                    const groupedEffects = paginatedEffects.reduce((acc, ef) => {
                      const key = ef.account || 'unknown';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(ef);
                      return acc;
                    }, {} as Record<string, Effect[]>);

                    return Object.entries(groupedEffects).map(([account, accountEffects]: [string, Effect[]]) => (
                      <div key={account} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                          {account === 'unknown' ? (
                            <span className="text-xs text-slate-400">Unknown account</span>
                          ) : (
                            <Link href={`/account/${account}`} className="text-xs font-bold hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                              {shortenAddress(account, 4)}
                            </Link>
                          )}
                          <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: primaryColor }}>
                            {accountEffects.length} effects
                          </span>
                        </div>
                        <div className="space-y-2 bg-slate-50 rounded-xl p-3">
                          {accountEffects.map((ef) => {
                            const isCredit = ef.type.includes('credited');
                            const isDebit = ef.type.includes('debited');
                            const effectLabel = isCredit ? 'Received' : isDebit ? 'Sent' : ef.type.replace(/_/g, ' ');
                            const effectAsset = ef.asset_type === 'native' ? 'XLM' : ef.asset_code;
                            return (
                              <div key={ef.id} className="flex items-center justify-between">
                                <div className={`text-[11px] uppercase font-bold tracking-wide ${isCredit ? 'text-emerald-500' : isDebit ? 'text-red-500' : 'text-slate-400'}`}>
                                  {effectLabel}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`font-mono text-sm font-bold ${isCredit ? 'text-emerald-500' : isDebit ? 'text-red-500' : 'text-slate-700'}`}>
                                    {ef.amount ? (
                                      <>{isCredit ? '+' : isDebit ? '-' : ''}{formatTokenAmount(ef.amount)}</>
                                    ) : (
                                      '--'
                                    )}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
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

                  {/* Effects Pagination */}
                  {effects.length > EFFECTS_PER_PAGE && (
                    <div className="flex items-center justify-center gap-1 mt-4 pt-3">
                      <button
                        onClick={() => setEffectsPage(p => Math.max(1, p - 1))}
                        disabled={effectsPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {Array.from({ length: Math.ceil(effects.length / EFFECTS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setEffectsPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                            effectsPage === page
                              ? 'text-white shadow-sm'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                          style={effectsPage === page ? { backgroundColor: primaryColor } : {}}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setEffectsPage(p => Math.min(Math.ceil(effects.length / EFFECTS_PER_PAGE), p + 1))}
                        disabled={effectsPage >= Math.ceil(effects.length / EFFECTS_PER_PAGE)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {[
                  { label: 'Fee Charged', value: `${feeXLM} XLM` },
                  { label: 'Max Fee', value: `${(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM` },
                  { label: 'Memo', value: transaction.memo ? `${transaction.memo} (${transaction.memo_type})` : 'None' },
                  { label: 'Fee Account', value: transaction.source_account, isLink: true },
                  { label: 'Sequence', value: transaction.source_account_sequence },
                  { label: 'Ledger', value: transaction.ledger.toString(), linkUrl: `/ledger/${transaction.ledger}` },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                    {item.isLink ? (
                      <Link href={`/account/${item.value}`} className="text-xs font-bold hover:opacity-80" style={{ color: primaryColor }}>
                        {shortenAddress(item.value!, 4)}
                      </Link>
                    ) : item.linkUrl ? (
                      <Link href={item.linkUrl} className="text-xs font-bold hover:opacity-80" style={{ color: primaryColor }}>
                        {item.value}
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-slate-700 text-right">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Signatures */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-bold mb-3" style={{ color: primaryColor }}>Signatures</h3>
                <div className="space-y-2">
                  {transaction.signatures.map((sig, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[11px] font-mono text-slate-600 break-all">{sig}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RAW DATA TAB */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: primaryColor }}>Envelope XDR</div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transaction.envelope_xdr);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="font-mono text-[11px] text-slate-600 break-all leading-relaxed">{transaction.envelope_xdr}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: primaryColor }}>Result XDR</div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transaction.result_xdr);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="font-mono text-[11px] text-slate-600 break-all leading-relaxed">{transaction.result_xdr}</p>
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
