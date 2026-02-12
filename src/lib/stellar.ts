// Stellar Horizon API Service Layer
import { xdr, Address, StrKey } from '@stellar/stellar-sdk';

import type {
  Ledger,
  TransactionDisplayInfo,
  Transaction,
  Operation,
  Effect,
  MarketAsset,
  AssetDetails,
  PaginatedResponse,
  LiquidityPool,
  LiquidityPoolTrade,
  AssetTrade,
  ContractInvocation,
  AssetHolder,
  TradingPair,
  RichListAccount,
  LabeledAccount,
  AccountLabel,
  TradeAggregation,
  OrderBook,
} from './interfaces';

// Re-export all interfaces so consumers can import from '@/lib/stellar'
export type {
  Ledger,
  TransactionDisplayInfo,
  Transaction,
  Operation,
  KnownAccount,
  Effect,
  MarketAsset,
  AssetDetails,
  PaginatedResponse,
  NetworkStats,
  LiquidityPool,
  LiquidityPoolTrade,
  LiquidityPoolEffect,
  AssetTrade,
  ContractInvocation,
  AssetHolder,
  TradingPair,
  RichListAccount,
  LabeledAccount,
  LabeledAccountsAPIResponse,
  AccountLabel,
  APIContract,
  StatItem,
  StatisticsData,
  TradeAggregation,
  OrderBook,
} from './interfaces';

const HORIZON_URLS = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
  futurenet: 'https://horizon-futurenet.stellar.org',
};

const NETWORK_COOKIE_NAME = 'stellarchain-network';

type NetworkType = 'mainnet' | 'testnet' | 'futurenet';

let currentNetwork: NetworkType = 'mainnet';

// Initialize from localStorage if available (client-side)
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(NETWORK_COOKIE_NAME) as NetworkType | null;
  if (stored && HORIZON_URLS[stored]) {
    currentNetwork = stored;
  }
}

export function setNetwork(network: NetworkType) {
  currentNetwork = network;
}

export function getNetwork(): NetworkType {
  return currentNetwork;
}

// Get network from cookie (for server-side) - returns network or null if not set
async function getNetworkFromCookie(): Promise<NetworkType | null> {
  // Only try to read cookies on server-side
  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    // Dynamic import to avoid bundling next/headers in client code
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const networkCookie = cookieStore.get(NETWORK_COOKIE_NAME);
    if (networkCookie && HORIZON_URLS[networkCookie.value as NetworkType]) {
      return networkCookie.value as NetworkType;
    }
  } catch {
    // cookies() throws when called outside of server context
  }
  return null;
}

// Get base URL - checks cookie first (server), then module state (client)
export function getBaseUrl(): string {
  return HORIZON_URLS[currentNetwork];
}

// Async version for server components - reads from cookie
async function getBaseUrlAsync(): Promise<string> {
  const cookieNetwork = await getNetworkFromCookie();
  if (cookieNetwork) {
    return HORIZON_URLS[cookieNetwork];
  }
  return HORIZON_URLS[currentNetwork];
}

// Types

interface StellarAccount {
  id: string;
  account_id: string;
  sequence: string;
  subentry_count: number;
  home_domain?: string;
  last_modified_ledger: number;
  last_modified_time: string;
  thresholds: {
    low_threshold: number;
    med_threshold: number;
    high_threshold: number;
  };
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
    auth_clawback_enabled: boolean;
  };
  balances: Balance[];
  signers: Signer[];
  data: Record<string, string>;
  num_sponsoring: number;
  num_sponsored: number;
}

interface Balance {
  balance: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
  limit?: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  is_authorized?: boolean;
  is_authorized_to_maintain_liabilities?: boolean;
}

interface Signer {
  weight: number;
  key: string;
  type: string;
}

// API Functions

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const options: RequestInit = {
    headers: {
      'Accept': 'application/json',
    },
    signal,
  };

  // Only use Next.js caching on server-side
  if (typeof window === 'undefined') {
    (options as any).next = { revalidate: 10 };
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Liquidity Pool endpoints
export async function getLiquidityPoolByAssets(
  assetA: { code: string; issuer?: string },
  assetB: { code: string; issuer?: string }
): Promise<LiquidityPool | null> {
  const formatAsset = (a: { code: string; issuer?: string }) =>
    a.code === 'XLM' && !a.issuer ? 'native' : `${a.code}:${a.issuer}`;
  const reserves = `${formatAsset(assetA)},${formatAsset(assetB)}`;
  try {
    const data = await fetchJSON<PaginatedResponse<LiquidityPool>>(
      `${getBaseUrl()}/liquidity_pools?reserves=${encodeURIComponent(reserves)}&limit=1`
    );
    return data._embedded.records.length > 0 ? data._embedded.records[0] : null;
  } catch {
    return null;
  }
}

// Fetch transaction hash for a trade from its operation link
async function getTradeTransactionHash(trade: LiquidityPoolTrade): Promise<string | null> {
  try {
    if (!trade._links?.operation?.href) return null;
    const operationUrl = trade._links.operation.href;
    const response = await fetch(operationUrl);
    if (!response.ok) return null;
    const operation = await response.json();
    return operation.transaction_hash || null;
  } catch {
    return null;
  }
}

export async function enrichTradesWithTransactionHashes(
  trades: LiquidityPoolTrade[]
): Promise<LiquidityPoolTrade[]> {
  const results = await Promise.allSettled(
    trades.map(async (trade) => {
      if (trade.transaction_hash) return trade;
      const hash = await getTradeTransactionHash(trade);
      return { ...trade, transaction_hash: hash || undefined };
    })
  );

  return results.map((result, index) =>
    result.status === 'fulfilled' ? result.value : trades[index]
  );
}

// Get trades for a specific asset (paired with XLM for credit assets, or USDC for XLM)
export async function getAssetTrades(
  assetCode: string,
  assetIssuer?: string,
  limit: number = 20,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<PaginatedResponse<AssetTrade>> {
  let url = `${getBaseUrl()}/trades?limit=${limit}&order=${order}`;

  // Only treat as native XLM if code is exactly 'XLM' and no issuer
  const isNative = assetCode === 'XLM' && (!assetIssuer || assetIssuer === '');

  if (isNative) {
    // Native asset (XLM) - pair with USDC
    url += `&base_asset_type=native`;
    url += `&counter_asset_type=credit_alphanum4`;
    url += `&counter_asset_code=USDC`;
    url += `&counter_asset_issuer=${USDC_ISSUER}`;
  } else if (assetIssuer) {
    // Credit asset with issuer - pair with XLM
    url += `&base_asset_type=credit_alphanum${assetCode.length <= 4 ? '4' : '12'}`;
    url += `&base_asset_code=${assetCode}`;
    url += `&base_asset_issuer=${assetIssuer}`;
    url += `&counter_asset_type=native`;
  } else {
    // No issuer for non-XLM asset - can't fetch trades
    throw new Error(`Cannot fetch trades for ${assetCode} without issuer`);
  }

  if (cursor) {
    url += `&cursor=${cursor}`;
  }

  return fetchJSON<PaginatedResponse<AssetTrade>>(url);
}

// Get transaction hash from an asset trade's operation
export async function getAssetTradeTransactionHash(trade: AssetTrade): Promise<string | null> {
  try {
    // Extract operation ID from trade ID (format: "{operation_id}-{index}")
    const operationId = trade.id.split('-')[0];
    if (!operationId) return null;

    const operation = await getOperation(operationId);
    return operation.transaction_hash || null;
  } catch (error) {
    console.error('Failed to get transaction hash for trade:', error);
    return null;
  }
}

// Ledger endpoints
async function getLedgerTransactions(
  sequence: number,
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<PaginatedResponse<Transaction>> {
  const baseUrl = await getBaseUrlAsync();
  let url = `${baseUrl}/ledgers/${sequence}/transactions?limit=${limit}&order=${order}`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }
  return fetchJSON<PaginatedResponse<Transaction>>(url);
}

// Fetch ledger transactions with display info (batch operations fetch)
export async function getLedgerTransactionsWithDisplayInfo(
  sequence: number,
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<Transaction[]> {
  const txResponse = await getLedgerTransactions(sequence, limit, order, cursor);
  const transactions = txResponse._embedded.records;

  // Fetch operations for each transaction in parallel
  const transactionsWithOps = await Promise.all(
    transactions.map(async (tx) => {
      try {
        const opsResponse = await getTransactionOperations(tx.hash, 20); // slightly higher limit to catch more complex ops
        const operations = opsResponse._embedded.records;
        return {
          ...tx,
          displayInfo: getTransactionDisplayInfo(operations),
        };
      } catch {
        return {
          ...tx,
          displayInfo: { type: 'other' as const },
        };
      }
    })
  );

  return transactionsWithOps;
}

export async function getLedgerOperations(
  sequence: number,
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<PaginatedResponse<Operation>> {
  const baseUrl = await getBaseUrlAsync();
  let url = `${baseUrl}/ledgers/${sequence}/operations?limit=${limit}&order=${order}`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }
  return fetchJSON<PaginatedResponse<Operation>>(url);
}

// Transaction endpoints
export async function getTransactions(
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<PaginatedResponse<Transaction>> {
  const baseUrl = await getBaseUrlAsync();
  let url = `${baseUrl}/transactions?limit=${limit}&order=${order}`;
  if (cursor) url += `&cursor=${cursor}`;
  return fetchJSON<PaginatedResponse<Transaction>>(url);
}

export async function getTransactionOperations(
  hash: string,
  limit: number = 10
): Promise<PaginatedResponse<Operation>> {
  const baseUrl = await getBaseUrlAsync();
  return fetchJSON<PaginatedResponse<Operation>>(
    `${baseUrl}/transactions/${hash}/operations?limit=${limit}`
  );
}

// Helper to extract display info from operations
// Format amount with appropriate precision (shows small values properly)
function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } else if (value >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } else if (value >= 0.0001) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 7 });
  } else {
    // For very small values, use scientific notation or show all decimals
    return value.toFixed(7).replace(/\.?0+$/, '');
  }
}

export function getTransactionDisplayInfo(operations: Operation[]): TransactionDisplayInfo {
  if (!operations || operations.length === 0) {
    return { type: 'other' };
  }

  // Determine primary operation based on priority
  let primaryOp = operations[0];

  // Priority: Contract > Swap > Multi Send > Offer > Payment > Create Account
  const contractOp = operations.find(op => op.type === 'invoke_host_function');
  const swapOp = operations.find(op => op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive');
  const offerOp = operations.find(op => ['manage_buy_offer', 'manage_sell_offer', 'create_passive_sell_offer'].includes(op.type));
  const paymentOps = operations.filter(op => op.type === 'payment' || op.type === 'create_account');
  const paymentOp = operations.find(op => op.type === 'payment');
  const createAccountOp = operations.find(op => op.type === 'create_account');

  if (contractOp) primaryOp = contractOp;
  else if (swapOp) primaryOp = swapOp;
  else if (paymentOps.length > 1) primaryOp = paymentOps[0]; // Multi Send
  else if (offerOp) primaryOp = offerOp;
  else if (paymentOp) primaryOp = paymentOp;
  else if (createAccountOp) primaryOp = createAccountOp;

  // Smart contract invocation
  if (primaryOp.type === 'invoke_host_function') {
    // Try to decode the function name from parameters
    let functionName = (primaryOp as any).function || 'Contract Call';

    try {
      const parameters = primaryOp.parameters as Array<{ type: string; value: string }> | undefined;
      if (parameters) {
        const symParam = parameters.find(p => p.type === 'Sym');
        if (symParam) {
          const decoded = atob(symParam.value);
          // Remove all non-printable characters and keep only valid function name characters
          const extractedName = decoded
            .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII
            .replace(/^[^a-zA-Z_]+/, '') // Remove leading non-letter characters
            .trim();
          if (extractedName) {
            functionName = extractedName;
          }
        }
      }
    } catch (error) {
      console.error('Error decoding contract function name:', error);
    }

    return {
      type: 'contract',
      functionName,
    };
  }

  // Swap operations (Path Payment)
  if (primaryOp.type === 'path_payment_strict_send' || primaryOp.type === 'path_payment_strict_receive') {
    const rawAmount = primaryOp.amount ? parseFloat(primaryOp.amount) : 0;
    const amount = formatAmount(rawAmount);
    const asset = primaryOp.asset_type === 'native' ? 'XLM' : (primaryOp.asset_code || 'XLM');

    // Extract source details
    const sourceRawAmount = (primaryOp as any).source_amount ? parseFloat((primaryOp as any).source_amount) : 0;
    const sourceAmount = formatAmount(sourceRawAmount);
    const sourceAsset = (primaryOp as any).source_asset_type === 'native' ? 'XLM' : ((primaryOp as any).source_asset_code || 'XLM');

    return {
      type: 'payment',
      amount,
      rawAmount,
      asset,
      isSwap: true,
      sourceAmount,
      sourceAsset
    };
  }

  // Multi Send / Bulk Send
  if (paymentOps.length > 1 && !swapOp && !contractOp) {
    const isBulk = paymentOps.length > 10;
    return {
      type: isBulk ? 'bulk_send' : 'multi_send',
      elementCount: paymentOps.length,
      amount: formatAmount(paymentOps.reduce((acc, op) => acc + (op.amount ? parseFloat(op.amount) : 0), 0)), // Approx sum if same asset, effectively just a number
      asset: 'Recipients'
    };
  }

  // Manage Offer
  if (offerOp && !swapOp && !contractOp) {
    const sellingAsset = (offerOp as any).selling_asset_type === 'native' ? 'XLM' : ((offerOp as any).selling_asset_code || 'XLM');
    const buyingAsset = (offerOp as any).buying_asset_type === 'native' ? 'XLM' : ((offerOp as any).buying_asset_code || 'XLM');
    const price = (offerOp as any).price || '0';
    const amount = (offerOp as any).amount || '0';

    return {
      type: 'manage_offer',
      offerDetails: {
        sellingAsset,
        buyingAsset,
        price,
        amount
      }
    };
  }

  // Standard Payment operations
  if (primaryOp.type === 'payment') {
    const rawAmount = primaryOp.amount ? parseFloat(primaryOp.amount) : 0;
    const amount = formatAmount(rawAmount);
    const asset = primaryOp.asset_type === 'native' ? 'XLM' : (primaryOp.asset_code || 'XLM');
    return {
      type: 'payment',
      amount,
      rawAmount,
      asset,
      to: primaryOp.to, // Recipient address
    };
  }
  // Create account
  if (primaryOp.type === 'create_account') {
    const rawAmount = (primaryOp as any).starting_balance ? parseFloat((primaryOp as any).starting_balance) : 0;
    const amount = formatAmount(rawAmount);
    return {
      type: 'payment',
      amount,
      rawAmount,
      asset: 'XLM', // Starting balance is always in XLM
      to: (primaryOp as any).account, // Newly created account
    };
  }

  return { type: 'other' };
}

// Operations endpoints
export async function getOperation(id: string): Promise<Operation> {
  const baseUrl = await getBaseUrlAsync();
  return fetchJSON<Operation>(`${baseUrl}/operations/${id}`);
}


// Helper to decode contract address from XDR ScVal
function decodeContractAddress(value: string): string | null {
  try {
    const scVal = xdr.ScVal.fromXDR(value, 'base64');
    if (scVal.switch().name === 'scvAddress') {
      const scAddr = scVal.address();
      if (scAddr.switch().name === 'scAddressTypeContract') {
        const contractHash = scAddr.contractId();
        // Cast to any and convert to Buffer for StrKey encoding
        const hashBuffer = Buffer.from(contractHash as unknown as Uint8Array);
        return StrKey.encodeContract(hashBuffer);
      }
    }
  } catch {
    // Failed to decode
  }
  return null;
}

// Helper to decode symbol from XDR ScVal
function decodeSymbol(value: string): string | null {
  try {
    const scVal = xdr.ScVal.fromXDR(value, 'base64');
    if (scVal.switch().name === 'scvSymbol') {
      return scVal.sym().toString();
    }
  } catch {
    // Failed to decode
  }
  return null;
}

// Get invocations for a specific contract from Horizon
export async function getContractInvocations(
  contractId: string,
  limit: number = 50,
  startCursor?: string
): Promise<ContractInvocation[]> {
  try {
    // Import the event parser functions
    const { getContractEvents } = await import('./eventParser');

    // Get events for this contract
    const events = await getContractEvents(contractId, limit);

    // Convert events to invocations by extracting transaction data
    const invocations: ContractInvocation[] = [];
    const seenTxHashes = new Set<string>();

    for (const event of events) {
      if (invocations.length >= limit) break;
      if (!event.txHash) continue;
      if (seenTxHashes.has(event.txHash)) continue;

      seenTxHashes.add(event.txHash);

      // Determine function name from event type
      let functionName = 'unknown';
      if (event.type === 'transfer') functionName = 'transfer';
      else if (event.type === 'mint') functionName = 'mint';
      else if (event.type === 'burn') functionName = 'burn';
      else if (event.type === 'approve') functionName = 'approve';
      else if (event.type === 'clawback') functionName = 'clawback';

      // Build parameters from event data
      const parameters: Array<{ type: string; value: string; decoded?: string }> = [];
      if (event.data && typeof event.data === 'object') {
        const data = event.data as Record<string, any>;
        if (data.from) {
          parameters.push({ type: 'Address', value: '', decoded: data.from });
        }
        if (data.to) {
          parameters.push({ type: 'Address', value: '', decoded: data.to });
        }
        if (data.amount) {
          parameters.push({ type: 'I128', value: '', decoded: data.amount });
        }
      }

      invocations.push({
        id: `${event.ledger}-${event.txHash}`,
        txHash: event.txHash,
        sourceAccount: event.contractId || contractId,
        contractId: contractId,
        functionName,
        parameters,
        createdAt: event.timestamp || new Date().toISOString(),
        ledger: event.ledger,
        successful: true,
      });
    }

    console.log(`[getContractInvocations] Found ${invocations.length} invocations from events for ${contractId}`);

    // Fetch effects for each invocation to get credited amounts (for harvest/claim)
    // Do this in parallel batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < invocations.length; i += batchSize) {
      const batch = invocations.slice(i, i + batchSize);
      await Promise.all(batch.map(async (inv) => {
        try {
          const effectsUrl = `${getBaseUrl()}/operations/${inv.id}/effects?limit=10`;
          const effectsResponse = await fetch(effectsUrl, {
            headers: { 'Accept': 'application/json' },
          });
          if (effectsResponse.ok) {
            const effectsData = await effectsResponse.json() as PaginatedResponse<Effect>;
            const effects = effectsData._embedded?.records || [];
            // Look for account_credited effect to the source account
            const creditEffect = effects.find((e: Effect) =>
              e.type === 'account_credited' && e.account === inv.sourceAccount
            );
            if (creditEffect) {
              inv.resultAmount = (creditEffect as any).amount;
              const assetType = (creditEffect as any).asset_type;
              if (assetType === 'native') {
                inv.resultAsset = 'XLM';
              } else {
                inv.resultAsset = (creditEffect as any).asset_code || '';
              }
            }
          }
        } catch {
          // Ignore effect fetch errors
        }
      }));
    }

    return invocations;
  } catch (error) {
    console.error('Error fetching contract invocations:', error);
    return [];
  }
}

// Get accounts holding a specific asset (sorted by balance descending)
export async function getAssetHolders(
  assetCode: string,
  assetIssuer: string,
  limit: number = 20,
  cursor?: string
): Promise<{ holders: AssetHolder[]; nextCursor: string | null; totalSupply: number }> {
  // For native XLM, we can't query by asset filter - return empty
  if (assetCode === 'XLM' && !assetIssuer) {
    return { holders: [], nextCursor: null, totalSupply: 0 };
  }

  let url = `${getBaseUrl()}/accounts?asset=${assetCode}:${assetIssuer}&limit=${limit}&order=desc`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }

  const response = await fetchJSON<PaginatedResponse<StellarAccount>>(url);
  const accounts = response._embedded.records;

  // Extract the balance for the specific asset from each account
  const holders: AssetHolder[] = accounts.map(account => {
    const assetBalance = account.balances.find(
      b => b.asset_code === assetCode && b.asset_issuer === assetIssuer
    );
    return {
      account_id: account.account_id,
      balance: assetBalance?.balance || '0',
      paging_token: (account as any).paging_token || account.id,
    };
  }).filter(h => parseFloat(h.balance) > 0);

  // Sort by balance descending (accounts endpoint doesn't sort by balance)
  holders.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

  // Get next cursor from the last account
  const lastAccount = accounts[accounts.length - 1];
  const nextCursor = accounts.length === limit ? ((lastAccount as any).paging_token || lastAccount?.id || null) : null;

  // Calculate total supply from all holders (approximate - for display purposes)
  const totalSupply = holders.reduce((sum, h) => sum + parseFloat(h.balance), 0);

  return { holders, nextCursor, totalSupply };
}

// Get all trading pairs for a specific asset
export async function getAssetTradingPairs(
  assetCode: string,
  assetIssuer?: string
): Promise<TradingPair[]> {
  const pairs: TradingPair[] = [];

  const isNative = assetCode === 'XLM' && (!assetIssuer || assetIssuer === '');
  const assetType = isNative ? 'native' : (assetCode.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12');

  // The trades endpoint requires both assets (a pair) when filtering
  // So we fetch general recent trades and filter client-side
  const tradesUrl = `${getBaseUrl()}/trades?limit=200&order=desc`;

  try {
    // Fetch multiple pages to get more trades
    let allTrades: AssetTrade[] = [];
    let currentUrl: string = tradesUrl;
    const maxPages = 5; // Fetch up to 5 pages (1000 trades)

    for (let pageCount = 0; pageCount < maxPages; pageCount++) {
      const response: PaginatedResponse<AssetTrade> = await fetchJSON<PaginatedResponse<AssetTrade>>(currentUrl);
      allTrades = [...allTrades, ...response._embedded.records];
      const nextHref = response._links.next?.href;
      if (!nextHref) break;
      currentUrl = nextHref;
    }

    // Filter trades that involve our asset
    const relevantTrades = allTrades.filter(trade => {
      const baseCode = trade.base_asset_type === 'native' ? 'XLM' : (trade.base_asset_code || '');
      const baseIssuer = trade.base_asset_issuer || '';
      const counterCode = trade.counter_asset_type === 'native' ? 'XLM' : (trade.counter_asset_code || '');
      const counterIssuer = trade.counter_asset_issuer || '';

      const normalizedAssetIssuer = assetIssuer || '';

      // Check if our asset is involved
      const isOurAssetBase = isNative
        ? trade.base_asset_type === 'native'
        : (baseCode === assetCode && baseIssuer === normalizedAssetIssuer);

      const isOurAssetCounter = isNative
        ? trade.counter_asset_type === 'native'
        : (counterCode === assetCode && counterIssuer === normalizedAssetIssuer);

      return isOurAssetBase || isOurAssetCounter;
    });

    if (relevantTrades.length === 0) {
      return pairs;
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Group trades by pair
    const pairStats = new Map<string, {
      baseAsset: { code: string; issuer?: string; type: string };
      counterAsset: { code: string; issuer?: string; type: string };
      trades24h: number;
      totalTrades: number;
      baseVolume: number;
      counterVolume: number;
      lastPrice: number;
      firstPrice: number;
      lastTradeTime: string;
    }>();

    for (const trade of relevantTrades) {
      const baseCode = trade.base_asset_type === 'native' ? 'XLM' : (trade.base_asset_code || '');
      const baseIssuer = trade.base_asset_issuer || '';
      const counterCode = trade.counter_asset_type === 'native' ? 'XLM' : (trade.counter_asset_code || '');
      const counterIssuer = trade.counter_asset_issuer || '';

      // Check if our asset is the base or counter
      const isOurAssetBase = isNative
        ? trade.base_asset_type === 'native'
        : (baseCode === assetCode && baseIssuer === (assetIssuer || ''));


      // Create a unique key for this pair (always put our asset first)
      const otherCode = isOurAssetBase ? counterCode : baseCode;
      const otherIssuer = isOurAssetBase ? counterIssuer : baseIssuer;
      const otherType = isOurAssetBase ? trade.counter_asset_type : trade.base_asset_type;

      const pairKey = `${otherCode}:${otherIssuer || 'native'}`;

      if (!pairStats.has(pairKey)) {
        pairStats.set(pairKey, {
          baseAsset: { code: assetCode, issuer: assetIssuer, type: isNative ? 'native' : assetType },
          counterAsset: { code: otherCode, issuer: otherIssuer || undefined, type: otherType },
          trades24h: 0,
          totalTrades: 0,
          baseVolume: 0,
          counterVolume: 0,
          lastPrice: 0,
          firstPrice: 0,
          lastTradeTime: trade.ledger_close_time,
        });
      }

      const stats = pairStats.get(pairKey)!;
      const tradeTime = new Date(trade.ledger_close_time).getTime();

      stats.totalTrades++;

      // Count 24h stats
      if (tradeTime >= oneDayAgo) {
        stats.trades24h++;
        if (isOurAssetBase) {
          stats.baseVolume += parseFloat(trade.base_amount);
          stats.counterVolume += parseFloat(trade.counter_amount);
        } else {
          stats.baseVolume += parseFloat(trade.counter_amount);
          stats.counterVolume += parseFloat(trade.base_amount);
        }
      }

      // Track prices for change calculation (price is always base/counter in the trade)
      const rawPrice = trade.price.d > 0 ? trade.price.n / trade.price.d : 0;
      // If our asset is the counter, we need to invert the price
      const price = isOurAssetBase ? rawPrice : (rawPrice > 0 ? 1 / rawPrice : 0);

      if (stats.lastPrice === 0) {
        stats.lastPrice = price;
      }
      stats.firstPrice = price;

      if (trade.ledger_close_time > stats.lastTradeTime) {
        stats.lastTradeTime = trade.ledger_close_time;
        stats.lastPrice = price;
      }
    }

    // Convert to TradingPair array - include ALL pairs, not just those with 24h activity
    for (const [, stats] of pairStats) {
      const priceChange = stats.firstPrice > 0 && stats.lastPrice > 0
        ? ((stats.lastPrice - stats.firstPrice) / stats.firstPrice) * 100
        : 0;

      pairs.push({
        baseAsset: stats.baseAsset,
        counterAsset: stats.counterAsset,
        price: stats.lastPrice,
        baseVolume24h: stats.baseVolume,
        counterVolume24h: stats.counterVolume,
        tradeCount24h: stats.trades24h,
        totalTradeCount: stats.totalTrades,
        priceChange24h: priceChange,
        spread: 0,
        lastTradeTime: stats.lastTradeTime,
      });
    }

    // Sort by total trade count (most active pairs first)
    pairs.sort((a, b) => b.totalTradeCount - a.totalTradeCount);

  } catch (error) {
    console.error('Failed to fetch trading pairs:', error);
  }

  return pairs;
}

// Calculate percentage change between two prices
function calculatePriceChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

// Extract price at specific hours ago from price7d array
function getPriceAtHoursAgo(price7d: [number, number][], hoursAgo: number): number {
  if (!price7d || price7d.length === 0) return 0;

  const now = Date.now();
  const targetTime = now - (hoursAgo * 60 * 60 * 1000);

  // Find the closest price point to the target time
  let closestPrice = price7d[0][1];
  let closestDiff = Math.abs(price7d[0][0] - targetTime);

  for (const [timestamp, price] of price7d) {
    const diff = Math.abs(timestamp - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestPrice = price;
    }
  }

  return closestPrice;
}

interface StellarCoinApiResponse {
  coingecko_stellar?: {
    market_cap_rank?: number;
    market_data?: {
      current_price?: { usd?: number };
      market_cap?: { usd?: number };
      total_volume?: { usd?: number };
      circulating_supply?: number;
      price_change_percentage_24h?: number;
      price_change_percentage_30d?: number;
      price_change_percentage_1y?: number;
      sparkline_7d?: { price?: number[] };
    };
  };
  stellar_expert?: {
    _embedded?: {
      records?: Array<Record<string, unknown>>;
    };
  };
}

type NormalizedStellarchainAsset = {
  code?: string;
  domain?: string;
  image?: string;
  holders: number;
  trades_24h: number;
  payments_24h: number;
  price_usd: number;
  price_usd_change: number;
  volume_usd: number;
  supply: number;
  rating: number;
};

function parseStellarchainV1AssetData(payload: unknown): NormalizedStellarchainAsset | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const stellarData = (root.stellarData as Record<string, unknown>) || {};
  const stats = Array.isArray(root.statisticHistory) ? root.statisticHistory as Record<string, unknown>[] : [];
  const latest = stats.length > 0 ? stats[stats.length - 1] : null;
  const first = stats.length > 0 ? stats[0] : null;
  const decimals = Number(stellarData.decimals ?? 7) || 7;
  const scalar = 10 ** decimals;

  const latestPrice = Number(latest?.price ?? stellarData.price ?? 0);
  const firstPrice = Number(first?.price ?? latestPrice ?? 0);
  const priceChange = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  const rawSupply = Number(latest?.supply ?? stellarData.supply ?? 0);
  const supply = rawSupply > 0 ? rawSupply / scalar : 0;

  const volume7dRaw = Number(stellarData.volume7d ?? 0);
  const volume7d = volume7dRaw > 0 ? volume7dRaw / scalar : 0;
  const volume24hUsd = volume7d > 0 && latestPrice > 0 ? (volume7d / 7) * latestPrice : 0;

  const ratingFromStats = Number(latest?.ratingAverage ?? 0);
  const ratingNode = (stellarData.rating as Record<string, unknown>) || {};
  const ratingFromStellar = Number(ratingNode.average ?? 0);
  const rating = ratingFromStats || ratingFromStellar || 0;

  const toml = (stellarData.toml_info as Record<string, unknown>) || {};
  const image = (toml.image || toml.orgLogo) as string | undefined;
  const trustlines = (stellarData.trustlines as Record<string, unknown>) || {};

  return {
    code: (root.code || toml.code) as string | undefined,
    domain: stellarData.home_domain as string | undefined,
    image,
    holders: Number(latest?.trustlinesTotal ?? trustlines.total ?? 0),
    trades_24h: Number(latest?.trades ?? stellarData.trades ?? 0),
    payments_24h: Number(latest?.payments ?? stellarData.payments ?? 0),
    price_usd: latestPrice,
    price_usd_change: priceChange,
    volume_usd: volume24hUsd,
    supply,
    rating,
  };
}

const STELLAR_COIN_API_URL = 'https://api.stellarchain.dev/api/coins/stellar';
const STELLAR_COIN_API_TTL_MS = 60_000;
let stellarCoinApiCache: {
  data: StellarCoinApiResponse | null;
  expiresAt: number;
  inFlight: Promise<StellarCoinApiResponse | null> | null;
} = {
  data: null,
  expiresAt: 0,
  inFlight: null,
};

async function getStellarCoinApiData(): Promise<StellarCoinApiResponse | null> {
  const now = Date.now();
  if (stellarCoinApiCache.data && stellarCoinApiCache.expiresAt > now) {
    return stellarCoinApiCache.data;
  }

  if (stellarCoinApiCache.inFlight) {
    return stellarCoinApiCache.inFlight;
  }

  stellarCoinApiCache.inFlight = (async () => {
    try {
      const response = await fetch(STELLAR_COIN_API_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        return null;
      }

      const json = await response.json() as StellarCoinApiResponse;
      stellarCoinApiCache.data = json;
      stellarCoinApiCache.expiresAt = Date.now() + STELLAR_COIN_API_TTL_MS;
      return json;
    } catch {
      return null;
    } finally {
      stellarCoinApiCache.inFlight = null;
    }
  })();

  return stellarCoinApiCache.inFlight;
}

// Fetch XLM price from Stellarchain coins API
async function getXLMPrice(): Promise<number> {
  try {
    const json = await getStellarCoinApiData();
    const xlmPrice = Number(json?.coingecko_stellar?.market_data?.current_price?.usd || 0);
    if (xlmPrice > 0) {
      return xlmPrice;
    }
  } catch {
    // Ignore error, use default
  }
  return 0.1; // Fallback XLM price
}

// Fetch market data from StellarExpert API (aggregated market data)
// Fetch XLM data from CoinGecko
// Fetch XLM data from Stellarchain (CoinGecko Proxy)
async function getCoinGeckoXLMData() {
  try {
    const json = await getStellarCoinApiData();
    const marketData = json?.coingecko_stellar?.market_data;

    if (marketData) {
      return {
        usd: marketData.current_price?.usd || 0,
        usd_market_cap: marketData.market_cap?.usd || 0,
        usd_24h_vol: marketData.total_volume?.usd || 0,
        usd_24h_change: marketData.price_change_percentage_24h || 0
      };
    }
  } catch (error) {
    console.error('Error fetching CoinGecko data from Stellarchain:', error);
  }
  return null;
}

// Client-side helper to fetch XLM stats
export async function getXLMStats(): Promise<{ usd: number; usd_24h_change: number } | null> {
  try {
    const json = await getStellarCoinApiData();
    const marketData = json?.coingecko_stellar?.market_data;
    if (marketData) {
      return {
        usd: Number(marketData.current_price?.usd || 0),
        usd_24h_change: Number(marketData.price_change_percentage_24h || 0)
      };
    }
  } catch (error) {
    console.error('Error fetching XLM stats:', error);
  }
  return null;
}

// Fetch paginated market data from Stellarchain API
async function getStellarCoinApiDataWithCursor(cursor: number = 0): Promise<StellarCoinApiResponse | null> {
  try {
    const url = `https://api.stellarchain.dev/api/coins/stellar?cursor=${cursor}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as StellarCoinApiResponse;
  } catch {
    return null;
  }
}

// Fetch market data from StellarExpert API (aggregated market data)
export async function getMarketAssets(cursor: number = 0): Promise<{ assets: MarketAsset[], hasNext: boolean }> {
  try {
    // Fetch from unified Stellarchain endpoint (includes CoinGecko + Stellar Expert payloads)
    const [xlmPrice, coinApiData, coinGeckoData] = await Promise.all([
      getXLMPrice(),
      cursor === 0 ? getStellarCoinApiData() : getStellarCoinApiDataWithCursor(cursor),
      getCoinGeckoXLMData()
    ]);

    const records = coinApiData?.stellar_expert?._embedded?.records;
    if (!Array.isArray(records)) {
      throw new Error('Invalid stellar_expert payload in coins endpoint');
    }

    // Check if there's a next page
    const hasNext = !!coinApiData?.stellar_expert?._links?.next;

    // Transform StellarExpert data to our MarketAsset format
    const assets = records.map((asset: Record<string, unknown>, index: number) => {
      const toml = asset.tomlInfo as Record<string, unknown> | undefined;
      const currentPrice = Number(asset.price) || 0;

      // Supply from StellarExpert is in stroops (7 decimal places)
      // Always divide by 10^7 to get actual token amount
      const supplyRaw = Number(asset.supply) || 0;
      const supply = supplyRaw / 1e7;

      // Same for volume - it's also in stroops
      const volume7dRaw = Number(asset.volume7d) || 0;
      const volume7d = volume7dRaw / 1e7;

      // Parse price7d array - it contains [timestamp, price] tuples
      const price7dRaw = asset.price7d as [number, number][] | undefined;
      const price7d = Array.isArray(price7dRaw) ? price7dRaw : [];

      // Calculate price changes from historical data
      const price1hAgo = getPriceAtHoursAgo(price7d, 1);
      const price24hAgo = getPriceAtHoursAgo(price7d, 24);
      const price7dAgo = price7d.length > 0 ? price7d[0][1] : currentPrice;

      const change1h = calculatePriceChange(price1hAgo, currentPrice);
      const change24h = calculatePriceChange(price24hAgo, currentPrice);
      const change7d = calculatePriceChange(price7dAgo, currentPrice);

      // Extract just the prices for sparkline (most recent 24 data points)
      const sparklineData = price7d.slice(-24).map(point => point[1]);

      // Estimate 24h volume as roughly 1/7th of 7d volume
      const volume24h = volume7d / 7;

      // Calculate price in XLM (price USD / XLM price USD)
      const priceInXlm = xlmPrice > 0 ? currentPrice / xlmPrice : 0;

      return {
        rank: index + 1,
        code: String(asset.asset || 'Unknown').split('-')[0],
        issuer: String(asset.asset || '').split('-')[1] || '',
        name: String(toml?.name || String(asset.asset || 'Unknown').split('-')[0]),
        image: toml?.image ? String(toml.image) : undefined,
        price_usd: currentPrice,
        price_xlm: priceInXlm,
        change_1h: change1h,
        change_24h: change24h,
        change_7d: change7d,
        volume_24h: volume24h,
        market_cap: supply * currentPrice,
        circulating_supply: supply,
        sparkline: sparklineData.length > 0 ? sparklineData : [],
      };
    });

    // Override XLM data with CoinGecko if available
    if (coinGeckoData && assets.length > 0) {
      // Assume the first asset is XLM (usually sorted by rating/volume)
      // Or find it explicitly
      const xlmIndex = assets.findIndex((a: MarketAsset) => a.code === 'XLM' && !a.issuer);

      if (xlmIndex !== -1) {
        assets[xlmIndex] = {
          ...assets[xlmIndex],
          price_usd: coinGeckoData.usd,
          volume_24h: coinGeckoData.usd_24h_vol, // CoinGecko returns volume in USD
          market_cap: coinGeckoData.usd_market_cap,
          change_24h: coinGeckoData.usd_24h_change,
          price_xlm: 1, // 1 XLM = 1 XLM
        };
      }
    }

    return { assets, hasNext };

  } catch (error) {
    console.error('Error fetching market assets:', error);
    // Return empty result instead of mock data
    return { assets: [], hasNext: false };
  }
}

// Fetch detailed asset information
export async function getAssetDetails(code: string, issuer?: string): Promise<AssetDetails | null> {
  // Parse issuer from code if provided in "CODE-ISSUER" format (e.g., "AQUA-GBNZILSTVQZ...")
  let parsedCode = code;
  let parsedIssuer = issuer;
  if (!issuer && code.includes('-')) {
    const parts = code.split('-');
    if (parts.length === 2 && parts[1].length > 20) {
      // Looks like a "CODE-ISSUER" format
      parsedCode = parts[0];
      parsedIssuer = parts[1];
    }
  }

  const assetId = parsedIssuer ? `${parsedCode}-${parsedIssuer}` : parsedCode;
  let stellarChainData: any = null;

  // 1. Try fetching from Stellarchain v1 API first
  // It provides asset-level stats and metadata for most issued assets.
  try {
    const scResponse = await fetch(`https://api.stellarchain.dev/v1/assets/${assetId}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 }
    });

    if (scResponse.ok) {
      const json = await scResponse.json();
      stellarChainData = parseStellarchainV1AssetData(json);
    }
  } catch (e) {
    console.error('Error fetching from Stellarchain.dev v1:', e);
  }

  // 2. Fallback/Concurrent Fetch to Stellar Expert & CoinGecko (for XLM)
  try {
    const xlmPrice = await getXLMPrice();

    // Handle native XLM
    if (code === 'XLM' && !issuer) {
      const statsResponse = await fetchCoinGeckoData();
      const priceHistory: [number, number][] = [];

      // Use CoinGecko for XLM USD price and movement
      const currentPrice = statsResponse.price > 0 ? statsResponse.price : xlmPrice;

      // Use CoinGecko sparkline for 24h high/low (it's in USD)
      const sparklineUSD = statsResponse.sparkline.length > 0 ? statsResponse.sparkline : [currentPrice];
      const high24h = Math.max(...sparklineUSD);
      const low24h = Math.min(...sparklineUSD);

      return {
        rank: statsResponse.rank,
        code: 'XLM',
        issuer: '',
        name: 'Stellar Lumens',
        description: 'Stellar is an open-source, distributed payments infrastructure. Stellar Lumens (XLM) is the native cryptocurrency of the Stellar network, used to facilitate cross-border transactions and connect financial institutions.',
        domain: 'stellar.org',
        image: 'https://stellar.org/favicon.ico',
        price_usd: currentPrice,
        price_xlm: 1,
        change_1h: 0,
        change_24h: stellarChainData?.price_usd_change || statsResponse.priceChange24h,
        change_7d: priceHistory.length > 0 ? calculatePriceChange(priceHistory[0][1], currentPrice) : 0,
        change_30d: statsResponse.priceChange30d,
        change_90d: undefined,
        change_1y: statsResponse.priceChange1y,
        volume_24h: stellarChainData?.volume_usd || statsResponse.volume,
        market_cap: statsResponse.marketCap,
        circulating_supply: statsResponse.circulatingSupply,
        total_supply: 50000000000,
        holders: stellarChainData?.holders || 8500000,
        payments_24h: 2500000,
        trades_24h: 450000,
        price_high_24h: high24h,
        price_low_24h: low24h,
        all_time_high: 0.94,
        all_time_low: 0.001,
        rating: stellarChainData?.rating || 100,
        sparkline: statsResponse.sparkline.length > 0 ? statsResponse.sparkline : sparklineUSD,
        price_history: priceHistory,
        volume_history: [],
      };
    }

    const coinApiData = await getStellarCoinApiData();
    const cachedAsset = coinApiData?.stellar_expert?._embedded?.records?.find((record) => {
      const recordAsset = String(record.asset || '');
      if (!recordAsset) return false;
      if (recordAsset === assetId) return true;
      // Some records append a suffix like "-1" / "-2"; match by CODE-ISSUER prefix.
      return parsedIssuer ? recordAsset.startsWith(`${parsedCode}-${parsedIssuer}`) : recordAsset === parsedCode;
    }) as Record<string, unknown> | undefined;

    if (!cachedAsset) {
      if (stellarChainData) {
        // No asset payload from our coins API. Return only Stellarchain-side data.
        return {
          rank: stellarChainData.rating || 0,
          code: parsedCode,
          issuer: parsedIssuer || '',
          name: stellarChainData.code || code,
          description: '',
          domain: stellarChainData.domain,
          image: stellarChainData.image,
          price_usd: stellarChainData.price_usd || 0,
          price_xlm: 0,
          change_1h: 0,
          change_24h: stellarChainData.price_usd_change || 0,
          change_7d: 0,
          volume_24h: stellarChainData.volume_usd || 0,
          market_cap: 0,
          circulating_supply: Number(stellarChainData.supply) || 0,
          total_supply: Number(stellarChainData.supply) || 0,
          holders: stellarChainData.holders || 0,
          payments_24h: 0,
          trades_24h: 0,
          price_high_24h: 0,
          price_low_24h: 0,
          all_time_high: 0,
          all_time_low: 0,
          rating: stellarChainData.rating,
          sparkline: [],
          price_history: [],
          volume_history: [],
        }
      }
      return null;
    }

    const asset = cachedAsset;

    const toml = (asset.tomlInfo as Record<string, unknown> | undefined) || {};

    // Get price history for chart
    let priceHistory: [number, number][] = [];
    if (Array.isArray(asset.price7d)) {
      priceHistory = asset.price7d as [number, number][];
    }

    // Fallback to price7d from main asset response if specific price endpoint failed or returned empty
    if (priceHistory.length === 0 && Array.isArray(asset.price7d)) {
      priceHistory = asset.price7d;
    }

    // Get price from Horizon API (single source of truth)
    const horizonPrice = await getAssetPriceFromHorizon(parsedCode, parsedIssuer);
    const currentPrice = horizonPrice.priceUsd;
    const priceInXlm = horizonPrice.priceXlm;

    const supply = stellarChainData?.supply !== undefined ? Number(stellarChainData.supply) : ((Number(asset.supply) || 0) / 1e7);
    // Note: StellarExpert volume is 7d in stroops, SC is 24h USD. We prefer SC volume if available.
    const volume7d = (Number(asset.volume7d) || 0) / 1e7;
    const volume24h = stellarChainData?.volume_usd !== undefined ? Number(stellarChainData.volume_usd) : (volume7d / 7);
    const trustlines = Array.isArray(asset.trustlines) ? asset.trustlines : [];

    // Calculate price changes using Horizon current price
    const price24hAgo = getPriceAtHoursAgo(priceHistory, 24);
    const price7dAgo = priceHistory.length > 0 ? priceHistory[0][1] : currentPrice;

    // Calculate change based on current Horizon price
    const change24h = price24hAgo > 0 ? calculatePriceChange(price24hAgo, currentPrice) : 0;

    const change7d = calculatePriceChange(price7dAgo, currentPrice);

    // Calculate high/low
    const recentPrices = priceHistory.slice(-24).map(p => p[1]);
    const high24h = recentPrices.length > 0 ? Math.max(...recentPrices) : currentPrice;
    const low24h = recentPrices.length > 0 ? Math.min(...recentPrices) : currentPrice;
    const allPrices = priceHistory.map(p => p[1]);
    const allTimeHigh = allPrices.length > 0 ? Math.max(...allPrices) : undefined;
    const allTimeLow = allPrices.length > 0 ? Math.min(...allPrices) : undefined;

    return {
      rank: Number(stellarChainData?.rating || asset.rating) || 0,
      code: parsedCode,
      issuer: parsedIssuer || '',
      name: String(toml.name || code),
      description: String(toml.desc || ''),
      domain: String(stellarChainData?.domain || asset.domain || toml.orgName || ''),
      image: stellarChainData?.image || (toml.image ? String(toml.image) : undefined),
      price_usd: currentPrice,
      price_xlm: priceInXlm,
      change_1h: 0,
      change_24h: change24h,
      change_7d: change7d,
      volume_24h: volume24h,
      market_cap: supply * currentPrice,
      circulating_supply: supply,
      total_supply: supply,
      holders: stellarChainData?.holders || Number(trustlines[0]) || Number(asset.accounts) || 0,
      payments_24h: Number(asset.payments) || 0,
      trades_24h: Number(asset.trades) || 0,
      price_high_24h: high24h,
      price_low_24h: low24h,
      all_time_high: allTimeHigh,
      all_time_low: allTimeLow,
      rating: Number(stellarChainData?.rating || asset.rating) || 0,
      sparkline: priceHistory.slice(-24).map(p => p[1]),
      price_history: priceHistory,
      volume_history: [],
    };
  } catch (error) {
    console.error('Error fetching asset details:', error);
    return null;
  }
}

// Get XLM Holders (Top Accounts)
export async function getXLMHolders(
  _limit: number = 20,
  cursor?: string
): Promise<{ holders: AssetHolder[]; nextCursor?: string }> {
  try {
    const page = cursor ? parseInt(cursor) : 1;
    const url = `https://api.stellarchain.dev/v1/accounts?page=${page}&order[accountMetric.rankPosition]=asc`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/ld+json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      return { holders: [] };
    }

    const data = await response.json();
    const records = data.member || [];

    const holders: AssetHolder[] = records.map((record: any) => ({
      account_id: record.address,
      balance: record.accountMetric?.nativeBalance?.toString() || '0',
      paging_token: (page + 1).toString(), // generic token
    }));

    return {
      holders,
      // Check if there's a next page in the view
      nextCursor: data.view?.next ? (page + 1).toString() : undefined
    };
  } catch (error) {
    console.error('Failed to fetch XLM holders:', error);
    return { holders: [] };
  }
}

export async function getRichList(
  page: number = 1,
  limit: number = 50
): Promise<RichListAccount[]> {
  try {
    const url = `https://api.stellarchain.dev/v1/accounts?page=${page}&order[accountMetric.rankPosition]=asc`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/ld+json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rich list: ${response.status}`);
    }

    const data = await response.json();
    return (data.member || []).map((record: any) => ({
      rank: record.accountMetric?.rankPosition || 0,
      account: record.address,
      balance: parseFloat(record.accountMetric?.nativeBalance || '0'),
      percent_of_coins: undefined, // Not available in new API
      transactions: parseInt(record.accountMetric?.totalTransactions || '0'),
      label: record.label ? {
        name: record.label,
        verified: record.verified === true,
        description: undefined // Not available in new API
      } : undefined
    }));
  } catch (error) {
    console.error('Error fetching rich list:', error);
    return [];
  }
}

// Known Accounts (Legacy wrapper for compatibility)
// List All Accounts sorted by XLM balance (Rich List) - using Stellarchain API
// Known/Labeled Accounts API types

// Cache for all labeled accounts (fetched once and reused)
let labeledAccountsCache: Map<string, AccountLabel> | null = null;
let labelsCacheTimestamp: number = 0;
let labeledAccountsFetchPromise: Promise<Map<string, AccountLabel>> | null = null;
const LABELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch all labeled accounts and build a lookup map
async function fetchAllLabeledAccounts(): Promise<Map<string, AccountLabel>> {
  const labels = new Map<string, AccountLabel>();

  try {
    // Fetch all pages (676 accounts total, 100 per page = 7 pages)
    const allAccounts: LabeledAccount[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 30) { // Increased limit for new API
      const url = `https://api.stellarchain.dev/v1/accounts?page=${page}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/ld+json' },
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!response.ok) break;

      const json = await response.json();
      const data = json.member || [];

      // Transform new API format to old LabeledAccount format
      const transformedData = data.map((record: any) => ({
        account: record.address,
        org_name: null, // Not available in new API
        label: record.label ? {
          name: record.label,
          description: null, // Not available in new API
          verified: record.verified ? 1 : 0
        } : null,
        balance: parseFloat(record.accountMetric?.nativeBalance || '0'),
        transactions: record.accountMetric?.totalTransactions || '0',
        rank: record.accountMetric?.rankPosition || 0
      }));

      allAccounts.push(...transformedData);

      hasMore = !!json.view?.next; // Check if there's a next page
      page++;
    }

    // Build lookup map
    for (const account of allAccounts) {
      if (account.label) {
        labels.set(account.account, {
          name: account.label.name || '',
          verified: account.label.verified === 1,
          org_name: account.org_name || null,
          description: account.label.description,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching labeled accounts for badges:', error);
  }

  return labels;
}

// Get cached labels or fetch if stale
async function getCachedLabels(): Promise<Map<string, AccountLabel>> {
  const now = Date.now();

  if (labeledAccountsCache && (now - labelsCacheTimestamp) < LABELS_CACHE_TTL) {
    return labeledAccountsCache;
  }

  // De-duplicate concurrent fetches (common in client effects/StrictMode).
  if (!labeledAccountsFetchPromise) {
    labeledAccountsFetchPromise = fetchAllLabeledAccounts()
      .then((labels) => {
        labeledAccountsCache = labels;
        labelsCacheTimestamp = Date.now();
        return labels;
      })
      .finally(() => {
        labeledAccountsFetchPromise = null;
      });
  }

  return labeledAccountsFetchPromise;
}

function normalizeUnknownLabel(raw: unknown): AccountLabel | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const nested = (obj.label && typeof obj.label === 'object')
    ? (obj.label as Record<string, unknown>)
    : null;

  const name = (
    (typeof obj.name === 'string' ? obj.name.trim() : '') ||
    (nested && typeof nested.name === 'string' ? nested.name.trim() : '')
  );
  const orgName = (
    (typeof obj.org_name === 'string' ? obj.org_name.trim() : '') ||
    (typeof obj.orgName === 'string' ? obj.orgName.trim() : '')
  );
  const descriptionValue = (
    (typeof obj.description === 'string' ? obj.description.trim() : '') ||
    (nested && typeof nested.description === 'string' ? nested.description.trim() : '')
  );
  const verifiedValue = nested?.verified ?? obj.verified;
  const verified = verifiedValue === true || verifiedValue === 1 || verifiedValue === '1';

  if (!name && !orgName && !descriptionValue && !verified) {
    return null;
  }

  return {
    name,
    verified,
    org_name: orgName || null,
    description: descriptionValue || null,
  };
}

function collectLabelsFromPayload(payload: unknown): Map<string, AccountLabel> {
  const found = new Map<string, AccountLabel>();

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const address = (
          (typeof row.address === 'string' && row.address) ||
          (typeof row.account === 'string' && row.account) ||
          (typeof row.account_id === 'string' && row.account_id) ||
          ''
        );
        const normalized = normalizeUnknownLabel(row);
        if (address && normalized) {
          found.set(address, normalized);
        }
      }
      return;
    }

    const obj = node as Record<string, unknown>;

    // Handle object maps: { "G...": { ...label } }
    for (const [key, value] of Object.entries(obj)) {
      if (typeof key === 'string' && key.length >= 56 && (key.startsWith('G') || key.startsWith('C'))) {
        const normalized = normalizeUnknownLabel(value);
        if (normalized) {
          found.set(key, normalized);
        }
      }
    }

    if ('data' in obj) {
      visit(obj.data);
    }
  };

  visit(payload);
  return found;
}

// Batch fetch labels for multiple accounts
export async function getAccountLabels(
  addresses: string[]
): Promise<Map<string, AccountLabel>> {
  const result = new Map<string, AccountLabel>();

  if (addresses.length === 0) {
    return result;
  }

  const uniqueAddresses = Array.from(new Set(addresses.filter(Boolean)));

  // First, try direct lookup endpoint (fresh + precise).
  try {
    const params = new URLSearchParams();
    for (const address of uniqueAddresses) {
      params.append('address[]', address);
    }
    const url = `https://api.stellarchain.dev/v1/accounts?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/ld+json',
      },
    });

    if (response.ok) {
      const payload = await response.json();
      const accounts = payload.member || [];

      for (const account of accounts) {
        if (account.label) {
          result.set(account.address, {
            name: account.label,
            verified: account.verified === true,
            org_name: null, // Not available in new API
            description: null, // Not available in new API
          });
        }
      }

      if (result.size > 0) {
        return result;
      }
    }
  } catch {
    // Fall back to cached directory method below
  }

  // Get all labeled accounts from cache
  const allLabels = await getCachedLabels();

  // Look up requested addresses
  for (const address of uniqueAddresses) {
    const label = allLabels.get(address) || allLabels.get(address.toUpperCase()) || allLabels.get(address.toLowerCase());
    if (label) {
      result.set(address, label);
    }
  }

  return result;
}

// Normalize Horizon SDK transaction records to ensure ledger_attr is set
// The SDK returns `ledger` as a function and the actual number as `ledger_attr`
export function normalizeTransactions(records: any[]): Transaction[] {
  return records.map(tx => ({
    ...tx,
    ledger_attr: tx.ledger_attr ?? (typeof tx.ledger === 'number' ? tx.ledger : 0),
  }));
}

// Utility functions
export function formatXLM(stroops: string | number): string {
  const amount = typeof stroops === 'string' ? parseFloat(stroops) : stroops;
  if (amount >= 1e12) {
    return (amount / 1e12).toFixed(2) + 'T';
  } else if (amount >= 1e9) {
    return (amount / 1e9).toFixed(2) + 'B';
  } else if (amount >= 1e6) {
    return (amount / 1e6).toFixed(2) + 'M';
  } else if (amount >= 1e3) {
    return (amount / 1e3).toFixed(2) + 'K';
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

export function formatStroopsToXLM(stroops: number): string {
  return (stroops / 10000000).toFixed(7);
}

export function shortenAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function getDecodedParameters(op: Operation): { name: string; value: string }[] {
  if (
    op.type === 'invoke_host_function' &&
    (op.function === 'HostFunctionTypeHostFunctionTypeInvokeContract' ||
      op.function === 'HostFunctionTypeInvokeContract') &&
    op.parameters
  ) {
    try {
      return op.parameters.map((param, index) => {
        let decodedValue = param.value;
        let paramName = `Param ${index + 1}`;

        try {
          // Try to decode common types primarily
          const scVal = xdr.ScVal.fromXDR(param.value, 'base64');
          switch (scVal.switch()) {
            case xdr.ScValType.scvSymbol():
              decodedValue = scVal.sym().toString();
              if (index === 1) paramName = "Function Name";
              break;
            case xdr.ScValType.scvAddress():
              decodedValue = Address.fromScVal(scVal).toString();
              if (index === 0) paramName = "Contract Address";
              break;
            case xdr.ScValType.scvI128():
              const parts = scVal.i128();
              decodedValue = `Lo: ${parts.lo().toString()}, Hi: ${parts.hi().toString()}`;
              break;
            case xdr.ScValType.scvU128():
              const uParts = scVal.u128();
              decodedValue = `Lo: ${uParts.lo().toString()}, Hi: ${uParts.hi().toString()}`;
              break;
            case xdr.ScValType.scvU64():
              decodedValue = scVal.u64().toString();
              break;
            case xdr.ScValType.scvI64():
              decodedValue = scVal.i64().toString();
              break;
            case xdr.ScValType.scvU32():
              decodedValue = scVal.u32().toString();
              break;
            case xdr.ScValType.scvI32():
              decodedValue = scVal.i32().toString();
              break;
            case xdr.ScValType.scvBool():
              decodedValue = scVal.b() ? 'true' : 'false';
              break;
            // Add more types as needed
            default:
              // Keep base64 for complex/nested types for now, or improve later
              break;

          }
        } catch (innerError) {
          console.warn("Failed to decode specific param", innerError);
        }

        return {
          name: paramName,
          value: decodedValue
        };
      });
    } catch (e) {
      console.error('Error decoding parameters:', e);
      return [];
    }
  }
  return [];
}

export function getOperationTypeLabel(typeOrOp: string | Operation): string {
  const type = typeof typeOrOp === 'string' ? typeOrOp : typeOrOp.type;

  if (type === 'invoke_host_function' && typeof typeOrOp !== 'string') {
    const op = typeOrOp;
    if (
      (op.function === 'HostFunctionTypeHostFunctionTypeInvokeContract' ||
        op.function === 'HostFunctionTypeInvokeContract') &&
      op.parameters &&
      op.parameters.length >= 2
    ) {
      try {
        const fnNameParam = op.parameters[1];
        if (fnNameParam.type === 'Sym' || fnNameParam.type === 'Symbol') {
          const scVal = xdr.ScVal.fromXDR(fnNameParam.value, 'base64');
          return `Call: ${scVal.sym().toString()}`;
        }
      } catch (e) {
        console.error('Error decoding contract function name:', e);
      }
    }
    return 'Smart Contract Call';
  }

  const labels: Record<string, string> = {
    'create_account': 'Create Account',
    'payment': 'Payment',
    'path_payment_strict_receive': 'Path Payment (Receive)',
    'path_payment_strict_send': 'Path Payment (Send)',
    'manage_sell_offer': 'Manage Sell Offer',
    'manage_buy_offer': 'Manage Buy Offer',
    'create_passive_sell_offer': 'Passive Sell Offer',
    'set_options': 'Set Options',
    'change_trust': 'Change Trust',
    'allow_trust': 'Allow Trust',
    'account_merge': 'Account Merge',
    'inflation': 'Inflation',
    'manage_data': 'Manage Data',
    'bump_sequence': 'Bump Sequence',
    'create_claimable_balance': 'Create Claimable Balance',
    'claim_claimable_balance': 'Claim Claimable Balance',
    'begin_sponsoring_future_reserves': 'Begin Sponsorship',
    'end_sponsoring_future_reserves': 'End Sponsorship',
    'revoke_sponsorship': 'Revoke Sponsorship',
    'clawback': 'Clawback',
    'clawback_claimable_balance': 'Clawback Claimable Balance',
    'set_trust_line_flags': 'Set Trustline Flags',
    'liquidity_pool_deposit': 'LP Deposit',
    'liquidity_pool_withdraw': 'LP Withdraw',
    'invoke_host_function': 'Smart Contract',
    'extend_footprint_ttl': 'Extend Footprint TTL',
    'restore_footprint': 'Restore Footprint',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================
// Soroban Contract Helper Functions
// ============================================

import type { ContractFunctionType } from './types/token';

// Convert i128 (lo, hi) to BigInt
// Extract contract address from invoke_host_function operation
export function extractContractAddress(op: Operation): string | null {
  if (
    op.type !== 'invoke_host_function' ||
    !op.parameters ||
    op.parameters.length === 0
  ) {
    return null;
  }

  try {
    const firstParam = op.parameters[0];
    if (!firstParam || !firstParam.value) return null;

    const scVal = xdr.ScVal.fromXDR(firstParam.value, 'base64');
    if (scVal.switch() === xdr.ScValType.scvAddress()) {
      const address = Address.fromScVal(scVal).toString();
      // Contract addresses start with 'C'
      if (address.startsWith('C')) {
        return address;
      }
    }
  } catch (error) {
    console.warn('Error extracting contract address:', error);
  }

  return null;
}

// Detect common SEP-0041 function types
export function detectContractFunctionType(functionName: string): ContractFunctionType {
  const normalized = functionName.toLowerCase();

  if (normalized === 'transfer' || normalized === 'xfer') return 'transfer';
  if (normalized.includes('swap')) return 'swap';
  if (normalized === 'mint') return 'mint';
  if (normalized === 'burn') return 'burn';
  if (normalized === 'approve' || normalized === 'incr_allow' || normalized === 'allowance') return 'approve';
  if (normalized.includes('deposit')) return 'deposit';
  if (normalized.includes('withdraw')) return 'withdraw';
  if (normalized === 'initialize' || normalized === 'init') return 'initialize';

  return 'unknown';
}


// Statistics interfaces

// Fetch XLM market data from Stellarchain (CoinGecko Proxy)
async function fetchCoinGeckoData(): Promise<{
  price: number;
  rank: number;
  marketCap: number;
  volume: number;
  circulatingSupply: number;
  priceChange24h: number;
  priceChange30d?: number;
  priceChange1y?: number;
  sparkline: number[];
}> {
  const fallback = {
    price: 0.12,
    rank: 25,
    marketCap: 3500000000,
    volume: 150000000,
    circulatingSupply: 29000000000,
    priceChange24h: 2.5,
    sparkline: [] as number[],
  };

  try {
    const json = await getStellarCoinApiData();
    const data = json?.coingecko_stellar;

    if (!data) return fallback;

    return {
      price: data.market_data?.current_price?.usd || 0,
      rank: data.market_cap_rank || 0,
      marketCap: data.market_data?.market_cap?.usd || 0,
      volume: data.market_data?.total_volume?.usd || 0,
      circulatingSupply: data.market_data?.circulating_supply || 0,
      priceChange24h: data.market_data?.price_change_percentage_24h || 0,
      priceChange30d: data.market_data?.price_change_percentage_30d,
      priceChange1y: data.market_data?.price_change_percentage_1y,
      sparkline: data.market_data?.sparkline_7d?.price?.slice(-24) || [],
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Stellarchain CoinGecko proxy fetch warning:', error);
    }
    return fallback;
  }
}

// Fetch Order Book
export async function getOrderBook(
  sellingAsset: { code: string; issuer?: string },
  buyingAsset: { code: string; issuer?: string },
  limit: number = 20
): Promise<OrderBook> {
  const sellingType = sellingAsset.code === 'XLM' ? 'native' : (sellingAsset.code.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
  const buyingType = buyingAsset.code === 'XLM' ? 'native' : (buyingAsset.code.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');

  let url = `${getBaseUrl()}/order_book?selling_asset_type=${sellingType}&buying_asset_type=${buyingType}&limit=${limit}`;

  if (sellingAsset.code !== 'XLM' && sellingAsset.issuer) {
    url += `&selling_asset_code=${sellingAsset.code}&selling_asset_issuer=${sellingAsset.issuer}`;
  }
  if (buyingAsset.code !== 'XLM' && buyingAsset.issuer) {
    url += `&buying_asset_code=${buyingAsset.code}&buying_asset_issuer=${buyingAsset.issuer}`;
  }

  return fetchJSON<OrderBook>(url);
}

// Fetch OHLC Data
export async function getTradeAggregations(
  baseAsset: { code: string; issuer?: string },
  counterAsset: { code: string; issuer?: string },
  resolution: number, // e.g. 900000 (15m), 3600000 (1h), 86400000 (1d)
  limit: number = 100,
  startTime?: number,
  endTime?: number,
  signal?: AbortSignal
): Promise<TradeAggregation[]> {
  const baseType = baseAsset.code === 'XLM' ? 'native' : (baseAsset.code.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
  const counterType = counterAsset.code === 'XLM' ? 'native' : (counterAsset.code.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');

  // Use asc order when time range specified to get chronological data
  const order = startTime ? 'asc' : 'desc';
  let url = `${getBaseUrl()}/trade_aggregations?base_asset_type=${baseType}&counter_asset_type=${counterType}&resolution=${resolution}&limit=${limit}&order=${order}`;

  if (baseAsset.code !== 'XLM' && baseAsset.issuer) {
    url += `&base_asset_code=${baseAsset.code}&base_asset_issuer=${baseAsset.issuer}`;
  }
  if (counterAsset.code !== 'XLM' && counterAsset.issuer) {
    url += `&counter_asset_code=${counterAsset.code}&counter_asset_issuer=${counterAsset.issuer}`;
  }
  if (startTime) url += `&start_time=${startTime}`;
  if (endTime) url += `&end_time=${endTime}`;

  const response = await fetchJSON<PaginatedResponse<TradeAggregation>>(url, signal);
  return response._embedded.records;
}

// USDC issuer on Stellar mainnet (Centre/Circle)
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

/**
 * Get current XLM/USD price from Horizon API using XLM/USDC trade aggregations
 * Uses the most recent 15-minute aggregation to get the close price
 */
export async function getXLMUSDPriceFromHorizon(signal?: AbortSignal): Promise<number> {
  try {
    const aggregations = await getTradeAggregations(
      { code: 'XLM' }, // base asset
      { code: 'USDC', issuer: USDC_ISSUER }, // counter asset (USDC ≈ USD)
      900000, // 15-minute resolution
      1, // just need the most recent one
      undefined,
      undefined,
      signal
    );

    if (aggregations.length > 0) {
      // Close price gives us XLM price in USDC (≈ USD)
      return parseFloat(aggregations[0].close);
    }

    // Fallback: use current order book midpoint/first quote if there were no recent trades
    const orderBookUrl = `${getBaseUrl()}/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=${USDC_ISSUER}&limit=5`;
    const orderBook = await fetchJSON<{
      bids?: Array<{ price: string }>;
      asks?: Array<{ price: string }>;
    }>(orderBookUrl, signal);

    const topBid = orderBook.bids?.[0]?.price ? parseFloat(orderBook.bids[0].price) : NaN;
    const topAsk = orderBook.asks?.[0]?.price ? parseFloat(orderBook.asks[0].price) : NaN;

    if (Number.isFinite(topBid) && Number.isFinite(topAsk) && topBid > 0 && topAsk > 0) {
      return (topBid + topAsk) / 2;
    }
    if (Number.isFinite(topBid) && topBid > 0) {
      return topBid;
    }
    if (Number.isFinite(topAsk) && topAsk > 0) {
      return topAsk;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch XLM/USD price from Horizon:', error);
    }
  }

  // Fallback price if API fails
  return 0.10;
}

/**
 * Get current asset price in USD from Horizon API
 * For XLM: uses XLM/USDC pair
 * For other tokens: uses TOKEN/XLM pair and multiplies by XLM/USD
 */
export async function getAssetPriceFromHorizon(
  assetCode: string,
  assetIssuer?: string
): Promise<{ priceUsd: number; priceXlm: number; xlmUsdRate: number }> {
  try {
    // Get XLM/USD rate first
    const xlmUsdRate = await getXLMUSDPriceFromHorizon();

    if (assetCode === 'XLM') {
      return {
        priceUsd: xlmUsdRate,
        priceXlm: 1,
        xlmUsdRate
      };
    }

    // For other tokens, get TOKEN/XLM price from trade aggregations
    const aggregations = await getTradeAggregations(
      { code: assetCode, issuer: assetIssuer },
      { code: 'XLM' },
      900000, // 15-minute resolution
      1
    );

    if (aggregations.length > 0) {
      // Close price gives us how many XLM per TOKEN
      const priceXlm = parseFloat(aggregations[0].close);
      const priceUsd = priceXlm * xlmUsdRate;

      return {
        priceUsd,
        priceXlm,
        xlmUsdRate
      };
    }
  } catch (error) {
    console.error('Failed to fetch asset price from Horizon:', error);
  }

  // Fallback
  return {
    priceUsd: 0,
    priceXlm: 0,
    xlmUsdRate: 0.10
  };
}

export { USDC_ISSUER };
