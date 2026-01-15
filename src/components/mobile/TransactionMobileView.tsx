'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate, formatXLM } from '@/lib/stellar';

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

  if (isMultiSend) {
    typeLabel = paymentOps.length > 10 ? 'Bulk Send' : 'Multi Send';
    toLabel = 'Recipients';
    multiSendCount = paymentOps.length;

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

  if (isContractCall && contractOp) {
    contractFunctionName = decodeContractFunctionName(contractOp);
    typeLabel = contractFunctionName === 'Contract Call' ? 'Smart Contract Call' : `${contractFunctionName} (Contract)`;
  }
  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const feeXLM = (parseInt(transaction.fee_charged) / 10000000).toFixed(7);

  return (
    <div className="bg-[#F8FAFC] text-slate-800 min-h-screen flex flex-col font-sans pb-24">

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-2 pb-8 max-w-lg mx-auto w-full">
        {isContractCall ? (
          <>
            <div className="flex items-center justify-between mb-4 mt-1">
              <Link
                href="/transactions"
                className="flex items-center text-slate-400 hover:text-slate-700 transition-colors text-xs font-semibold uppercase tracking-wide"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>

              <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${transaction.successful
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                <svg className="w-3.5 h-3.5 mr-1" fill={transaction.successful ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  {transaction.successful
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  }
                </svg>
                {transaction.successful ? 'Successful' : 'Failed'}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Transaction Type</div>
                  <div className="text-base font-bold text-slate-900 mt-1">{contractFunctionName || 'Smart Contract'}</div>
                  <div className="inline-flex items-center bg-violet-50 text-violet-600 border border-violet-100 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide mt-2">
                    Smart Contract
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Account</div>
                  <Link href={`/account/${transaction.source_account}`} className="text-xs font-semibold text-slate-700 hover:text-indigo-600 block mt-1">
                    {shortenAddress(transaction.source_account, 4)}
                  </Link>
                </div>
              </div>

              {/* Smart Contract Summary Card */}
              <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all duration-300">
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
                            <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Sent</div>
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {formatTokenAmount(contractSentAmount)} <span className="text-[10px] font-normal text-slate-500">{contractSentAsset}</span>
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
                            <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Received</div>
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {formatTokenAmount(contractReceivedAmount)} <span className="text-[10px] font-normal text-slate-500">{contractReceivedAsset}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show expand button if there are more than 2 transfer effects */}
                    {contractTransferEffects.length > 2 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
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
                                <div key={effect.id || idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50">
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
                                    <span className={`text-[9px] font-bold uppercase ${isCredit ? 'text-emerald-600' : isDebit ? 'text-orange-600' : 'text-slate-500'}`}>
                                      {isCredit ? 'Received' : isDebit ? 'Sent' : effect.type.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-mono text-xs font-bold ${isCredit ? 'text-emerald-600' : isDebit ? 'text-red-500' : 'text-slate-700'}`}>
                                      {isCredit ? '+' : isDebit ? '-' : ''}{formatTokenAmount(effect.amount)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 ml-1">{effectAsset}</span>
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
                        <div className={`flex items-center text-[10px] font-bold uppercase tracking-wide mb-1 ${contractHeaderIsCredit ? 'text-emerald-600' : 'text-slate-500'
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
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            <span className="opacity-75">{contractHeaderIsCredit ? 'from ' : 'to '}</span>
                            <Link href={`/account/${contractHeaderAccount}`} className="hover:text-indigo-600 transition-colors border-b border-transparent hover:border-indigo-600/30 font-medium">
                              {shortenAddress(contractHeaderAccount, 4)}
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Only show expand button if there are multiple items of same type */}
                      {contractTransferEffects.filter(e => contractHeaderIsCredit ? e.type.includes('credited') : e.type.includes('debited')).length > 1 && (
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all ml-4"
                        >
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Expanded List */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        {contractTransferEffects
                          .filter(e => contractHeaderIsCredit ? e.type.includes('credited') : e.type.includes('debited'))
                          .slice(1)
                          .map((effect, idx) => (
                            <div key={effect.id || idx} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{formatTokenAmount(effect.amount)}</span>
                                <span className="text-xs text-slate-500 font-medium">{effect.asset_type === 'native' ? 'XLM' : (effect.asset_code || 'XLM')}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
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

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] font-medium">Network Fee</span>
                  <span className="font-mono text-[10px] font-bold text-slate-700">{feeXLM} XLM</span>
                </div>
              </div>
            </div>


          </>
        ) : (
          <>
            {/* Compact Header */}
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/transactions"
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 hover:scale-105 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h2 className="text-lg font-bold text-slate-900">{typeLabel}</h2>
              </div>

              {/* Meta Data Row - Aligned Left */}
              <div className="flex flex-wrap items-center text-[10px] text-slate-500 gap-x-3 gap-y-2 pl-1">
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDate(transaction.created_at)}
                </div>

                <div className={`flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${transaction.successful
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                  <svg className="w-2.5 h-2.5 mr-1" fill={transaction.successful ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    {transaction.successful
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  {transaction.successful ? 'Successful' : 'Failed'}
                </div>

                <button
                  onClick={handleCopy}
                  className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider hover:border-slate-300 transition-colors flex items-center gap-1 shadow-sm"
                >
                  #{transaction.hash.slice(0, 4)}...{transaction.hash.slice(-3)}
                  {copied && <span className="text-green-500 font-bold">✓</span>}
                </button>
              </div>
            </div>

            {/* DEX Limit Order Card for Offers */}
            {isOffer ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-900">DEX Limit Order</span>
                </div>

                {/* Vertical Trade Flow */}
                <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-4">
                  {/* SELLING ROW */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Selling</div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">
                        {offerDetails?.amount ? parseFloat(offerDetails.amount).toLocaleString(undefined, { maximumFractionDigits: 7 }) : '0'}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">{offerDetails?.selling}</span>
                    </div>
                  </div>

                  {/* EXCHANGE RATE ROW */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Exchange Rate</div>
                    <div className="bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs font-mono text-slate-700 shadow-sm">
                      1 {offerDetails?.selling} ≈ {offerDetails?.price} {offerDetails?.buying}
                    </div>
                  </div>

                  {/* BUYING ROW */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Buying</div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-indigo-600">
                        {offerDetails?.amount && offerDetails?.price
                          ? (parseFloat(offerDetails.amount) * parseFloat(offerDetails.price)).toLocaleString(undefined, { maximumFractionDigits: 7 })
                          : '0'
                        }
                      </span>
                      <span className="text-sm text-slate-500 ml-1">{offerDetails?.buying}</span>
                    </div>
                  </div>
                </div>

                {/* Order By */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Order by</span>
                  <Link href={`/account/${transaction.source_account}`} className="text-slate-600 font-semibold hover:text-indigo-600 transition-colors">
                    {shortenAddress(transaction.source_account, 4)}
                  </Link>
                </div>
              </div>
            ) : (
              /* Visual Flow for non-offer transactions */
              <div className="space-y-2 mb-4 relative">
                {/* Connector Line */}
                <div className="absolute left-[1.6rem] top-8 bottom-8 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 -z-10"></div>

                {/* FIRST CARD (From / Sold / Selling) */}
                <div className={`relative overflow-hidden rounded-2xl p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] bg-white group transition-all duration-300 hover:shadow-md`}>
                  {/* Subtle Background Gradient */}
                  <div className={`absolute inset-0 opacity-30 bg-gradient-to-r ${isSwap ? 'from-indigo-50 via-white to-white' : 'from-emerald-50 via-white to-white'
                    }`}></div>

                  <div className="relative flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isSwap ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {isSwap ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        )}
                      </div>

                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{fromLabel}</div>
                        {isSwap ? (
                          <span className="font-mono text-xs text-slate-700 font-bold">
                            {formatTokenAmount(swapSold?.amount)} <span className="text-[10px] font-normal text-slate-500">{swapSold?.code}</span>
                          </span>
                        ) : (
                          <Link href={`/account/${transaction.source_account}`} className="text-xs font-semibold text-slate-700 block hover:text-emerald-600 transition-colors">
                            {shortenAddress(transaction.source_account, 4)}
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Right side of First Card */}
                    {!isSwap && (
                      <div className="text-right">
                        {fromCardAmount > 0 ? (
                          <div className="text-sm font-bold text-slate-900">
                            - {fromCardAmount.toLocaleString(undefined, { maximumFractionDigits: 7 })} <span className="text-[10px] font-normal text-slate-500">{fromCardAsset}</span>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-slate-900">--</div>
                        )}
                        <div className="text-[9px] uppercase font-bold text-emerald-600/80 tracking-wide">{isContractCall ? 'Called' : 'Sent'}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connect Icon */}
                <div className="flex justify-center -my-3 relative z-20 pointer-events-none">
                  <div className="bg-white rounded-full p-1.5 shadow-md text-slate-300 ring-4 ring-[#F8FAFC]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                    </svg>
                  </div>
                </div>

                {/* SECOND CARD (To / Bought / Buying) */}
                <div className={`relative overflow-hidden rounded-2xl p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] bg-white group transition-all duration-300 hover:shadow-md`}>
                  <div className={`absolute inset-0 opacity-30 bg-gradient-to-r ${isSwap ? 'from-violet-50 via-white to-white' : 'from-amber-50 via-white to-white'
                    }`}></div>

                  <div className="relative flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isSwap ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                        {isSwap ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{toLabel}</div>

                        {isSwap ? (
                          <span className="font-mono text-sm text-slate-700 font-bold">
                            {formatTokenAmount(swapBought?.amount)} <span className="text-xs font-normal text-slate-500">{swapBought?.code}</span>
                          </span>
                        ) : isMultiSend ? (
                          <div className="font-mono text-sm text-slate-700 font-bold">
                            {paymentOps.length} Recipients
                          </div>
                        ) : (
                          <>
                            {destination !== 'Smart Contract' && !destination.includes('Contract') ? (
                              <Link href={`/account/${destination}`} className="text-xs font-semibold text-slate-700 block hover:text-amber-600 transition-colors">
                                {shortenAddress(destination, 4)}
                              </Link>
                            ) : (
                              <div className="font-mono text-xs text-slate-700 truncate w-32 sm:w-48">
                                {isContractCall ? contractFunctionName : 'Smart Contract'}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {!isSwap && (
                      <div className="text-right">
                        {isMultiSend ? (
                          <div className="text-sm font-bold text-slate-900">
                            {displayAmount.toLocaleString(undefined, { maximumFractionDigits: 7 })}
                          </div>
                        ) : toCardAmount > 0 ? (
                          <div className="text-sm font-bold text-slate-900">
                            + {toCardAmount.toLocaleString(undefined, { maximumFractionDigits: 7 })} <span className="text-[10px] font-normal text-slate-500">{toCardAsset}</span>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-slate-900">--</div>
                        )}

                        <div className="text-[9px] font-bold uppercase tracking-wide text-amber-600/80">
                          {isMultiSend ? 'Total Amt' : isContractCall ? 'Effect Amt' : 'Received'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Recipients List */}
                  {isMultiSend && (
                    <div className="relative mt-2">
                      <div className="absolute left-0 right-0 -top-4 flex justify-center z-10">
                        <button
                          onClick={() => setShowRecipients(!showRecipients)}
                          className="bg-white border border-slate-100 rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-slate-400 hover:text-slate-600 hover:scale-105 transition-all"
                        >
                          <svg className={`w-4 h-4 transition-transform duration-200 ${showRecipients ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showRecipients ? 'max-h-[500px] opacity-100 pt-4' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-slate-50 rounded-xl border border-slate-100/50 overflow-hidden">
                          <div className="max-h-[300px] overflow-y-auto">
                            {Object.entries(
                              paymentOps.reduce((acc, op) => {
                                const to = op.to || (op as any).into || 'unknown';
                                if (!acc[to]) acc[to] = [];
                                acc[to].push(op);
                                return acc;
                              }, {} as Record<string, Operation[]>)
                            ).map(([to, ops], idx) => (
                              <div key={to} className="flex items-start justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-100/50">
                                <div className="flex items-center gap-3 overflow-hidden mt-0.5">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                                    {idx + 1}
                                  </div>
                                  <Link href={`/account/${to}`} className="text-xs font-semibold text-slate-600 truncate hover:text-indigo-600 transition-colors">
                                    {shortenAddress(to, 4)}
                                  </Link>
                                </div>
                                <div className="text-right space-y-1">
                                  {ops.map((op, opIdx) => (
                                    <div key={op.id || opIdx} className="text-right">
                                      <span className="text-xs font-bold text-slate-900">
                                        {op.amount ? parseFloat(op.amount).toLocaleString(undefined, { maximumFractionDigits: 7 }) : '0'}
                                      </span>
                                      <span className="text-[10px] text-slate-400 ml-1">{op.asset_type === 'native' ? 'XLM' : (op.asset_code || '')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Network Fee Bar */}
            <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-1.5 mb-3 border border-slate-100">
              <span className="text-[10px] font-medium text-slate-500">Network Fee</span>
              <span className="text-[10px] font-mono font-medium text-slate-700">{feeXLM} XLM</span>
            </div>
          </>
        )}

        {/* Tabs Navigation */}
        <div className="border-b border-slate-200 mb-4">
          <nav aria-label="Tabs" className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar">
            {[
              { id: 'operations', label: 'Operations', count: transaction.operation_count },
              { id: 'effects', label: 'Effects', count: effects.length > 0 ? effects.length : undefined },
              { id: 'details', label: 'Details' },
              { id: 'raw', label: 'Raw Data' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id as any)}
                className={`py-2 px-1 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 py-0.5 px-1.5 rounded-full text-[10px] ${activeTab === tab.id
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
              {operations.map((op, idx) => (
                <div key={op.id} className="bg-white border border-slate-200 rounded-xl p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center p-2.5 gap-2.5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-2 items-center">
                      <span className="text-xs font-semibold text-slate-900 capitalize truncate">
                        {op.type === 'invoke_host_function'
                          ? decodeContractFunctionName(op)
                          : op.type === 'payment' && isMultiSend
                            ? 'Sent Payment'
                            : getOperationTypeLabel(op.type).replace(/_/g, ' ')
                        }
                      </span>
                      <div className="flex items-center text-[10px] text-slate-500 font-medium truncate">
                        {['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type) ? (
                          <span className="text-slate-500">
                            → {(op as any).buying_asset_type === 'native' ? 'XLM' : ((op as any).buying_asset_code || 'XLM')}
                            <span className="text-slate-400 ml-1">@ {(op as any).price}</span>
                          </span>
                        ) : (
                          <>
                            {op.source_account && op.source_account !== transaction.source_account && (
                              <>
                                <Link href={`/account/${op.source_account}`} className="truncate max-w-[80px] hover:text-slate-900 transition-colors">
                                  {shortenAddress(op.source_account, 4)}
                                </Link>
                                <svg className="w-3 h-3 mx-1 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                              </>
                            )}
                            {(op.to || (op as any).into) ? (
                              <span className="flex items-center">
                                {(op.source_account === transaction.source_account) && <span className="mr-1 text-slate-400">To</span>}
                                <Link href={`/account/${op.to || (op as any).into}`} className="truncate max-w-[100px] hover:text-slate-900 transition-colors font-semibold">
                                  {shortenAddress(op.to || (op as any).into, 4)}
                                </Link>
                              </span>
                            ) : (
                              <span className="text-slate-300">--</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {op.amount && (
                      <div className="text-right flex-shrink-0">
                        {['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type) ? (
                          <span className="block text-xs font-bold text-slate-900">
                            {parseFloat(op.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}
                            <span className="text-[10px] font-normal text-slate-500 ml-1">
                              {(op as any).selling_asset_type === 'native' ? 'XLM' : ((op as any).selling_asset_code || 'XLM')}
                            </span>
                          </span>
                        ) : (
                          <span className="block text-xs font-bold text-slate-900">
                            {parseFloat(op.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}
                            <span className="text-[10px] font-normal text-slate-500 ml-1">{op.asset_type === 'native' ? 'XLM' : op.asset_code || ''}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                Object.entries(effects.reduce((acc, ef) => {
                  const key = ef.account || 'unknown';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(ef);
                  return acc;
                }, {} as Record<string, Effect[]>)).map(([account, accountEffects]: [string, Effect[]]) => (
                  <div key={account} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      {account === 'unknown' ? (
                        <span className="text-xs text-slate-400">Unknown account</span>
                      ) : (
                        <Link href={`/account/${account}`} className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                          {shortenAddress(account, 4)}
                        </Link>
                      )}
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">
                        {accountEffects.length} effects
                      </span>
                    </div>
                    <div className="space-y-1">
                      {accountEffects.map((ef) => {
                        const isCredit = ef.type.includes('credited');
                        const isDebit = ef.type.includes('debited');
                        const effectLabel = isCredit ? 'Received' : isDebit ? 'Sent' : ef.type.replace(/_/g, ' ');
                        const effectAsset = ef.asset_type === 'native' ? 'XLM' : ef.asset_code;
                        return (
                          <div key={ef.id} className="flex items-center">
                            <div className={`w-20 text-[9px] uppercase font-semibold tracking-wide ${isCredit ? 'text-emerald-600' : isDebit ? 'text-red-500' : 'text-slate-400'}`}>
                              {effectLabel}
                            </div>
                            <div className="ml-auto flex items-center">
                              <div className="font-mono text-xs font-semibold text-right">
                                {ef.amount ? (
                                  <span className={isCredit ? 'text-emerald-600' : isDebit ? 'text-red-500' : 'text-slate-700'}>
                                    {isCredit ? '+' : isDebit ? '-' : ''}{formatTokenAmount(ef.amount)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">--</span>
                                )}
                              </div>
                              <div className="w-12 text-left pl-2 text-[9px] font-normal text-slate-400 truncate">
                                {ef.amount && effectAsset}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              {[
                { label: 'Fee Charged', value: `${feeXLM} XLM` },
                { label: 'Max Fee', value: `${(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM` },
                { label: 'Memo', value: transaction.memo ? `${transaction.memo} (${transaction.memo_type})` : 'None' },
                { label: 'Fee Account', value: transaction.source_account, isLink: true },
                { label: 'Sequence', value: transaction.source_account_sequence },
                { label: 'Ledger', value: transaction.ledger.toString(), linkUrl: `/ledger/${transaction.ledger}` },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                  {item.isLink ? (
                    <Link href={`/account/${item.value}`} className="text-xs font-semibold text-blue-600 hover:underline">
                      {shortenAddress(item.value!, 4)}
                    </Link>
                  ) : item.linkUrl ? (
                    <Link href={item.linkUrl} className="text-xs font-bold text-blue-600 hover:underline">
                      {item.value}
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-slate-700 text-right">{item.value}</span>
                  )}
                </div>
              ))}

              {/* Signatures */}
              <div className="pt-4">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Signatures</h3>
                <div className="space-y-2">
                  {transaction.signatures.map((sig, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100">
                      <p className="text-[10px] font-mono text-slate-500 break-all">{sig}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RAW DATA TAB */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Envelope XDR</div>
                <p className="font-mono text-[9px] text-slate-600 break-all">{transaction.envelope_xdr}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Result XDR</div>
                <p className="font-mono text-[9px] text-slate-600 break-all">{transaction.result_xdr}</p>
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
