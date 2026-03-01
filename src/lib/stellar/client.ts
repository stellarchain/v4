// Stellar Horizon API Service Layer
import { xdr, Address, Asset, Horizon } from '@stellar/stellar-sdk';
import { apiEndpoints, getApiData, getApiV1Data } from '@/services/api';
import { createHorizonServer, getHorizonBaseUrl } from '@/services/horizon';
import { DEFAULT_NETWORK, NETWORK_COOKIE_NAME, isNetworkType, type NetworkType } from '../network/config';
import { getCurrentNetwork, setCurrentNetwork } from '../network/state';

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
  ContractFunctionType,
  StellarAccount,
  V1AccountMetric,
  V1AccountRecord,
  V1CollectionResponse,
  TradePage,
  StellarCoinApiResponse,
  NormalizedStellarchainAsset,
} from '../shared/interfaces';

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
} from '../shared/interfaces';

export function setNetwork(network: NetworkType) {
  setCurrentNetwork(network);
}

export function getNetwork(): NetworkType {
  return getCurrentNetwork();
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
    if (networkCookie && isNetworkType(networkCookie.value)) {
      return networkCookie.value;
    }
  } catch {
    // cookies() throws when called outside of server context
  }
  return null;
}

// Get base URL - checks cookie first (server), then module state (client)
export function getBaseUrl(): string {
  return getHorizonBaseUrl();
}

// Async version for server components - reads from cookie
async function getBaseUrlAsync(): Promise<string> {
  const cookieNetwork = await getNetworkFromCookie();
  if (cookieNetwork) {
    return getHorizonBaseUrl(cookieNetwork);
  }
  return getHorizonBaseUrl();
}

// API Functions
function toHorizonAsset(asset: { code: string; issuer?: string }): Asset | null {
  if (asset.code === 'XLM' && !asset.issuer) {
    return Asset.native();
  }
  if (!asset.issuer) {
    return null;
  }
  try {
    return new Asset(asset.code, asset.issuer);
  } catch {
    return null;
  }
}

function getHorizonServer(): Horizon.Server {
  return createHorizonServer();
}

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const options: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      'Accept': 'application/json',
    },
    signal,
  };

  // Only use Next.js caching on server-side
  if (typeof window === 'undefined') {
    options.next = { revalidate: 10 };
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
  const horizonAssetA = toHorizonAsset(assetA);
  const horizonAssetB = toHorizonAsset(assetB);
  if (!horizonAssetA || !horizonAssetB) {
    return null;
  }

  try {
    const server = createHorizonServer();
    const response = await server
      .liquidityPools()
      .forAssets(horizonAssetA, horizonAssetB)
      .limit(1)
      .call();
    const records = response.records as unknown as LiquidityPool[];
    return records.length > 0 ? records[0] : null;
  } catch {
    return null;
  }
}

export async function getLiquidityPools(
  limit: number = 20,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<PaginatedResponse<LiquidityPool>> {
  const builder = getHorizonServer().liquidityPools().limit(limit).order(order);
  if (cursor) {
    builder.cursor(cursor);
  }
  const response = await builder.call();
  return response as unknown as PaginatedResponse<LiquidityPool>;
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
  const pair = resolveAssetPair(assetCode, assetIssuer);
  if (!pair) {
    throw new Error(`Cannot fetch trades for ${assetCode} without issuer`);
  }

  const builder = getHorizonServer()
    .trades()
    .forAssetPair(pair.base, pair.counter)
    .limit(limit)
    .order(order);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<AssetTrade>;
}

export function resolveAssetPair(
  assetCode: string,
  assetIssuer?: string
): { base: Asset; counter: Asset } | null {
  const isNative = assetCode === 'XLM' && (!assetIssuer || assetIssuer === '');

  if (isNative) {
    return {
      base: Asset.native(),
      counter: new Asset('USDC', USDC_ISSUER),
    };
  }

  if (!assetIssuer) {
    return null;
  }

  return {
    base: new Asset(assetCode, assetIssuer),
    counter: Asset.native(),
  };
}

export function startAssetTradeStream(options: {
  assetCode: string;
  assetIssuer?: string;
  onmessage: (trade: Horizon.ServerApi.TradeRecord) => void;
  onerror?: (err: unknown) => void;
  cursor?: string;
}) {
  const pair = resolveAssetPair(options.assetCode, options.assetIssuer);
  if (!pair) {
    throw new Error('Invalid asset pair for trade stream');
  }

  return getHorizonServer()
    .trades()
    .forAssetPair(pair.base, pair.counter)
    .order('desc')
    .cursor(options.cursor || 'now')
    .stream({
      onmessage: options.onmessage,
      onerror: options.onerror,
    });
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
  const builder = getHorizonServer().transactions().forLedger(sequence).limit(limit).order(order);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Transaction>;
}

// Fetch ledger transactions with display info (batch operations fetch)
export async function getLedgerTransactionsWithDisplayInfo(
  sequence: number,
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<Transaction[]> {
  const txResponse = await getLedgerTransactions(sequence, limit, order, cursor);
  const transactions = txResponse.records;

  // Fetch operations for each transaction in parallel
  const transactionsWithOps = await Promise.all(
    transactions.map(async (tx) => {
      try {
        const opsResponse = await getTransactionOperations(tx.hash, 20); // slightly higher limit to catch more complex ops
        const operations = opsResponse.records;
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
  const builder = getHorizonServer().operations().forLedger(sequence).limit(limit).order(order);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Operation>;
}

// Transaction endpoints
export async function getTransactions(
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string,
  includeFailed?: boolean
): Promise<PaginatedResponse<Transaction>> {
  const builder = getHorizonServer().transactions().limit(limit).order(order);
  if (typeof includeFailed === 'boolean') builder.includeFailed(includeFailed);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Transaction>;
}

export async function getTransactionOperations(
  hash: string,
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<Operation>> {
  const response = await getHorizonServer()
    .operations()
    .forTransaction(hash)
    .limit(limit)
    .order(order)
    .call();
  return response as unknown as PaginatedResponse<Operation>;
}

export async function getPayments(
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string,
  includeFailed?: boolean
): Promise<PaginatedResponse<Operation>> {
  const builder = getHorizonServer().payments().limit(limit).order(order);
  if (typeof includeFailed === 'boolean') builder.includeFailed(includeFailed);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Operation>;
}

export async function getLedgers(
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<PaginatedResponse<Ledger>> {
  const builder = getHorizonServer().ledgers().limit(limit).order(order);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Ledger>;
}

export async function getOperations(
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string,
  includeFailed?: boolean
): Promise<PaginatedResponse<Operation>> {
  const builder = getHorizonServer().operations().limit(limit).order(order);
  if (typeof includeFailed === 'boolean') builder.includeFailed(includeFailed);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Operation>;
}

export async function getTransactionEffects(
  hash: string,
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<Effect>> {
  const response = await getHorizonServer()
    .effects()
    .forTransaction(hash)
    .limit(limit)
    .order(order)
    .call();
  return response as unknown as PaginatedResponse<Effect>;
}

export async function getAccountOperations(
  accountId: string,
  limit: number = 50,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string,
  includeFailed?: boolean
): Promise<PaginatedResponse<Operation>> {
  const builder = getHorizonServer().operations().forAccount(accountId).limit(limit).order(order);
  if (typeof includeFailed === 'boolean') builder.includeFailed(includeFailed);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Operation>;
}

export async function getAccountTransactions(
  accountId: string,
  limit: number = 50,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string,
  includeFailed?: boolean
): Promise<PaginatedResponse<Transaction>> {
  const builder = getHorizonServer().transactions().forAccount(accountId).limit(limit).order(order);
  if (typeof includeFailed === 'boolean') builder.includeFailed(includeFailed);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Transaction>;
}

export async function getAccountEffects(
  accountId: string,
  limit: number = 50,
  order: 'asc' | 'desc' = 'desc',
  cursor?: string
): Promise<PaginatedResponse<Effect>> {
  const builder = getHorizonServer().effects().forAccount(accountId).limit(limit).order(order);
  if (cursor) builder.cursor(cursor);
  const response = await builder.call();
  return response as unknown as PaginatedResponse<Effect>;
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
    let functionName = typeof primaryOp.function === 'string' ? primaryOp.function : 'Contract Call';

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
    const sourceAmountRaw = primaryOp.source_amount;
    const sourceAssetType = primaryOp.source_asset_type;
    const sourceAssetCode = primaryOp.source_asset_code;
    const rawAmount = primaryOp.amount ? parseFloat(primaryOp.amount) : 0;
    const amount = formatAmount(rawAmount);
    const asset = primaryOp.asset_type === 'native' ? 'XLM' : (primaryOp.asset_code || 'XLM');

    // Extract source details
    const sourceRawAmount = typeof sourceAmountRaw === 'string' ? parseFloat(sourceAmountRaw) : 0;
    const sourceAmount = formatAmount(sourceRawAmount);
    const sourceAsset = sourceAssetType === 'native' ? 'XLM' : (typeof sourceAssetCode === 'string' ? sourceAssetCode : 'XLM');

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
    const sellingAssetType = offerOp.selling_asset_type;
    const sellingAssetCode = offerOp.selling_asset_code;
    const buyingAssetType = offerOp.buying_asset_type;
    const buyingAssetCode = offerOp.buying_asset_code;
    const price = typeof offerOp.price === 'string' ? offerOp.price : '0';
    const amount = typeof offerOp.amount === 'string' ? offerOp.amount : '0';
    const sellingAsset = sellingAssetType === 'native' ? 'XLM' : (typeof sellingAssetCode === 'string' ? sellingAssetCode : 'XLM');
    const buyingAsset = buyingAssetType === 'native' ? 'XLM' : (typeof buyingAssetCode === 'string' ? buyingAssetCode : 'XLM');

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
    const rawAmount = primaryOp.starting_balance ? parseFloat(primaryOp.starting_balance) : 0;
    const amount = formatAmount(rawAmount);
    return {
      type: 'payment',
      amount,
      rawAmount,
      asset: 'XLM', // Starting balance is always in XLM
      to: typeof primaryOp.account === 'string' ? primaryOp.account : undefined, // Newly created account
    };
  }

  return { type: 'other' };
}

// Operations endpoints
export async function getOperation(id: string): Promise<Operation> {
  const baseUrl = await getBaseUrlAsync();
  const response = await new Horizon.Server(baseUrl).operations().operation(id).call();
  return response as unknown as Operation;
}

export async function getOperationTransactionHash(operationId: string): Promise<string | null> {
  try {
    const baseUrl = await getBaseUrlAsync();
    const response = await fetch(`${baseUrl}/operations/${operationId}`);
    if (!response.ok) return null;
    const operation = await response.json();
    return operation.transaction_hash || null;
  } catch {
    return null;
  }
}

export async function getEffectById(id: string): Promise<Effect> {
  const baseUrl = await getBaseUrlAsync();
  return fetchJSON<Effect>(`${baseUrl}/effects/${id}`);
}


// Get invocations for a specific contract from Horizon
export async function getContractInvocations(
  contractId: string,
  limit: number = 50,
  _startCursor?: string
): Promise<ContractInvocation[]> {
  try {
    // Import the event parser functions
    const { getContractEvents } = await import('../soroban/events');

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
        const data = event.data as Record<string, unknown>;
        if (typeof data.from === 'string') {
          parameters.push({ type: 'Address', value: '', decoded: data.from });
        }
        if (typeof data.to === 'string') {
          parameters.push({ type: 'Address', value: '', decoded: data.to });
        }
        if (typeof data.amount === 'string' || typeof data.amount === 'number') {
          parameters.push({ type: 'I128', value: '', decoded: String(data.amount) });
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
          const effectsData = await getHorizonServer()
            .effects()
            .forOperation(inv.id)
            .limit(10)
            .call();
          const effects = effectsData.records as unknown as Effect[];
          const creditEffect = effects.find((e: Effect) =>
            e.type === 'account_credited' && e.account === inv.sourceAccount
          );
          if (creditEffect) {
            const effectAmount = creditEffect.amount;
            const assetType = creditEffect.asset_type;
            if (assetType === 'native') {
              inv.resultAsset = 'XLM';
            } else {
              inv.resultAsset = typeof creditEffect.asset_code === 'string' ? creditEffect.asset_code : '';
            }
            if (typeof effectAmount === 'string') inv.resultAmount = effectAmount;
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

  const asset = new Asset(assetCode, assetIssuer);
  const builder = getHorizonServer().accounts().forAsset(asset).limit(limit).order('desc');
  if (cursor) builder.cursor(cursor);
  const response = await builder.call() as unknown as PaginatedResponse<StellarAccount>;
  const accounts = response.records;

  // Extract the balance for the specific asset from each account
  const holders: AssetHolder[] = accounts.map(account => {
    const assetBalance = account.balances.find(
      b => b.asset_code === assetCode && b.asset_issuer === assetIssuer
    );
    return {
      account_id: account.account_id,
      balance: assetBalance?.balance || '0',
      paging_token: account.paging_token || account.id,
    };
  }).filter(h => parseFloat(h.balance) > 0);

  // Sort by balance descending (accounts endpoint doesn't sort by balance)
  holders.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

  // Get next cursor from the last account
  const lastAccount = accounts[accounts.length - 1];
  const nextCursor = accounts.length === limit ? (lastAccount?.paging_token || lastAccount?.id || null) : null;

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

  try {
    // Fetch multiple pages to get more trades
    let allTrades: AssetTrade[] = [];
    let currentPage = await getHorizonServer().trades().limit(200).order('desc').call() as unknown as TradePage;
    const maxPages = 5; // Fetch up to 5 pages (1000 trades)

    for (let pageCount = 0; pageCount < maxPages; pageCount++) {
      allTrades = [...allTrades, ...(currentPage.records || [])];
      if (pageCount === maxPages - 1 || typeof currentPage.next !== 'function') {
        break;
      }
      currentPage = await currentPage.next();
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

function parseStellarchainV1AssetData(payload: unknown): NormalizedStellarchainAsset | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const marketNode = (root.market as Record<string, unknown>) || {};
  const stellarData = (root.stellarData as Record<string, unknown>) || {};
  const stats = Array.isArray(root.statisticHistory) ? root.statisticHistory as Record<string, unknown>[] : [];
  const latest = stats.length > 0 ? stats[stats.length - 1] : null;
  const first = stats.length > 0 ? stats[0] : null;
  const decimals = Number(stellarData.decimals ?? 7) || 7;
  const scalar = 10 ** decimals;

  const latestPrice = Number(latest?.price ?? stellarData.price ?? 0);
  const firstPrice = Number(first?.price ?? latestPrice ?? 0);
  const priceChange = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  const rawSupply = Number(marketNode.supply ?? latest?.supply ?? stellarData.supply ?? 0);
  const supply = rawSupply > 0 ? rawSupply / scalar : 0;

  const volume7dRaw = Number(stellarData.volume7d ?? 0);
  const volume7d = volume7dRaw > 0 ? volume7dRaw / scalar : 0;
  const volumeXlm24hRaw = Number(marketNode.volume_xlm_24h ?? marketNode.volumeXlm24h ?? 0);
  const volumeXlm24h = volumeXlm24hRaw > 0 ? (volumeXlm24hRaw / 1e7) : 0;
  const volume24hUsd = volume7d > 0 && latestPrice > 0 ? (volume7d / 7) * latestPrice : 0;

  const ratingFromStats = Number(latest?.ratingAverage ?? 0);
  const ratingNode = (stellarData.rating as Record<string, unknown>) || {};
  const ratingFromStellar = Number(ratingNode.average ?? 0);
  const ratingFromMarket = Number(marketNode.score ?? 0);
  const rating = ratingFromMarket || ratingFromStats || ratingFromStellar || 0;

  const toml = ((root.tomlInfo as Record<string, unknown>) || (stellarData.toml_info as Record<string, unknown>) || {});
  const image = (root.imageUrl || toml.image || toml.orgLogo) as string | undefined;
  const description = (toml.desc || toml.description || '') as string;
  const name = (toml.name || root.code || toml.code || '') as string;
  const homeUrl = (root.homeUrl || toml.home_url || toml.url || '') as string;
  const rank = Number(marketNode.rank ?? marketNode.rankPosition ?? 0) || 0;
  const priceXlm = Number(marketNode.price_xlm ?? marketNode.priceXlm ?? 0);
  const change1h = Number(marketNode.price_change_1h ?? marketNode.priceChange1h ?? 0);
  const change24h = Number(marketNode.price_change_24h ?? marketNode.priceChange24h ?? 0);
  const change7d = Number(marketNode.price_change_7d ?? marketNode.priceChange7d ?? 0);
  const rawSparkline = Array.isArray(marketNode.sparkline_1h) ? marketNode.sparkline_1h : [];
  const sparkline = rawSparkline.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const trustlines = (stellarData.trustlines as Record<string, unknown>) || {};
  const holders = Number(marketNode.trustlines_total ?? marketNode.trustlinesTotal ?? latest?.trustlinesTotal ?? trustlines.total ?? 0);
  const trades24h = Number(marketNode.trades_24h ?? marketNode.trades24h ?? latest?.trades ?? stellarData.trades ?? 0);

  return {
    code: (root.code || toml.code) as string | undefined,
    name: name || undefined,
    description: description || undefined,
    domain: (root.homeDomain || stellarData.home_domain || toml.home_domain) as string | undefined,
    home_url: homeUrl || undefined,
    image,
    rank,
    holders,
    trades_24h: trades24h,
    payments_24h: Number(latest?.payments ?? stellarData.payments ?? 0),
    price_usd: latestPrice,
    price_xlm: priceXlm > 0 ? priceXlm : undefined,
    change_1h: Number.isFinite(change1h) ? change1h : undefined,
    change_24h: Number.isFinite(change24h) ? change24h : undefined,
    change_7d: Number.isFinite(change7d) ? change7d : undefined,
    price_usd_change: Number.isFinite(change24h) && change24h !== 0 ? change24h : priceChange,
    volume_usd: volume24hUsd,
    volume_xlm_24h: volumeXlm24h > 0 ? volumeXlm24h : undefined,
    supply,
    rating,
    sparkline,
  };
}

const STELLAR_COIN_API_TTL_MS = 60_000;
const stellarCoinApiCache: {
  data: StellarCoinApiResponse | null;
  expiresAt: number;
  inFlight: Promise<StellarCoinApiResponse | null> | null;
} = {
  data: null,
  expiresAt: 0,
  inFlight: null,
};

function getCachedStellarCoinApiData(): StellarCoinApiResponse | null {
  const now = Date.now();
  if (stellarCoinApiCache.data && stellarCoinApiCache.expiresAt > now) {
    return stellarCoinApiCache.data;
  }
  return null;
}

function setCachedStellarCoinApiData(payload: StellarCoinApiResponse | null): void {
  if (!payload) return;
  stellarCoinApiCache.data = payload;
  stellarCoinApiCache.expiresAt = Date.now() + STELLAR_COIN_API_TTL_MS;
}

async function requestStellarCoinApiData(cursor?: number): Promise<StellarCoinApiResponse | null> {
  try {
    const isPagedRequest = typeof cursor === 'number' && cursor > 0;
    const path = isPagedRequest
      ? apiEndpoints.coins.stellar({ cursor })
      : apiEndpoints.coins.stellar();
    return await getApiData(path) as StellarCoinApiResponse;
  } catch {
    return null;
  }
}

async function getStellarCoinApiData(cursor: number = 0): Promise<StellarCoinApiResponse | null> {
  // Cursor-based pagination should always bypass cache.
  if (cursor > 0) {
    return requestStellarCoinApiData(cursor);
  }

  const cached = getCachedStellarCoinApiData();
  if (cached) {
    return cached;
  }

  if (stellarCoinApiCache.inFlight) {
    return stellarCoinApiCache.inFlight;
  }

  stellarCoinApiCache.inFlight = requestStellarCoinApiData();
  try {
    const json = await stellarCoinApiCache.inFlight;
    setCachedStellarCoinApiData(json);
    return json;
  } finally {
    stellarCoinApiCache.inFlight = null;
  }
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

// Fetch market data (legacy cursor signature kept for compatibility)
export async function getMarketAssets(cursor: number = 0): Promise<{ assets: MarketAsset[], hasNext: boolean, nextCursor: number | null }> {
  try {
    const page = cursor > 0 ? cursor : 1;
    const { assets, hasNext } = await getMarketAssetsFromMarketV1(page, 100);
    return {
      assets,
      hasNext,
      nextCursor: hasNext ? page + 1 : null,
    };
  } catch (error) {
    console.error('Error fetching market assets:', error);
    return { assets: [], hasNext: false, nextCursor: null };
  }
}

// Fetch individual asset detail to get stellarData (price7d, volume7d)
async function fetchAssetDetail(assetKey: string): Promise<any> {
  try {
    return await getApiV1Data(`/assets/${assetKey}`);
  } catch {
    return null;
  }
}

// Fetch market assets from v1 API with proper pagination
export async function getMarketAssetsFromV1(page: number = 1, xlmUsdPrice: number = 0): Promise<{ assets: MarketAsset[], totalPages: number, totalItems: number }> {
  try {
    const url = apiEndpoints.v1.assets({ page, 'order[ratingAverage]': 'desc' });
    const data = await getApiV1Data(url);
    const members = data.member || [];
    const totalItems = data.totalItems || 0;

    // Parse total pages from view.last
    let totalPages = 1;
    if (data.view?.last) {
      const lastMatch = data.view.last.match(/page=(\d+)/);
      if (lastMatch) totalPages = parseInt(lastMatch[1], 10);
    }

    // Fetch individual asset details in parallel to get price7d
    const detailPromises = members.map((item: any) =>
      fetchAssetDetail(item.assetKey || `${item.code}-${item.issuer}-1`)
    );
    const details = await Promise.allSettled(detailPromises);

    const assets: MarketAsset[] = members.map((item: any, index: number) => {
      const stat = item.latestStatistic || {};
      const toml = item.tomlInfo || {};

      // Get stellarData from individual asset detail
      const detail = details[index]?.status === 'fulfilled' ? details[index].value : null;
      const stellarData = detail?.stellarData || {};

      // Price from API is already in USD
      const priceUsd = parseFloat(stat.price) || 0;
      const priceInXlm = xlmUsdPrice > 0 ? priceUsd / xlmUsdPrice : 0;

      // Supply and tradedAmount from the API are in stroops (7 decimal places)
      const supply = (parseFloat(stat.supply) || 0) / 1e7;
      const tradedAmount = (parseFloat(stat.tradedAmount) || 0) / 1e7;
      // tradedAmount is in token units after stroops conversion, multiply by price for USD volume
      const volumeUsd = tradedAmount * priceUsd;

      const marketCap = supply * priceUsd;

      // For native XLM asset
      const isNative = item.native === true;
      const code = isNative ? 'XLM' : (item.code || 'Unknown');
      const issuer = isNative ? '' : (item.issuer || '');

      // Parse price7d for sparkline and change calculations
      const price7d: [number, number][] = Array.isArray(stellarData.price7d) ? stellarData.price7d : [];
      const sparklineData = price7d.map((p: [number, number]) => p[1]);
      const currentPrice7d = price7d.length > 0 ? price7d[price7d.length - 1][1] : 0;
      const oldestPrice7d = price7d.length > 0 ? price7d[0][1] : 0;
      const change7d = oldestPrice7d > 0 ? ((currentPrice7d - oldestPrice7d) / oldestPrice7d) * 100 : 0;

      // Calculate 24h change from price7d (last 2 data points are ~1 day apart)
      const price24hAgo = price7d.length >= 2 ? price7d[Math.max(0, price7d.length - 2)][1] : 0;
      const change24h = price24hAgo > 0 ? ((currentPrice7d - price24hAgo) / price24hAgo) * 100 : 0;

      return {
        rank: (page - 1) * 30 + index + 1,
        code,
        issuer,
        name: toml.name || code,
        image: toml.image || undefined,
        price_usd: priceUsd,
        price_xlm: isNative ? 1 : priceInXlm,
        change_1h: 0,
        change_24h: change24h,
        change_7d: change7d,
        volume_24h: volumeUsd,
        market_cap: marketCap,
        circulating_supply: supply,
        sparkline: sparklineData,
      };
    });

    // Sort by market cap descending within the page
    assets.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));

    // Re-assign ranks after sorting
    assets.forEach((asset, i) => {
      asset.rank = (page - 1) * 30 + i + 1;
    });

    return { assets, totalPages, totalItems };
  } catch (error) {
    console.error('Error fetching v1 market assets:', error);
    return { assets: [], totalPages: 1, totalItems: 0 };
  }
}

type MarketAssetsV1Record = {
  id?: number;
  '@id'?: string;
  '@type'?: string;
  asset?: string;
  network?: number;
  rankPosition?: number | string | null;
  assetKey?: string;
  asset_key?: string;
  code?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  issuer?: string;
  rank?: number;
  score?: string;
  priceXlm?: string | null;
  price_xlm?: string | null;
  priceChange1h?: string | null;
  price_change_1h?: string | null;
  priceChange24h?: string | null;
  price_change_24h?: string | null;
  priceChange7d?: string | null;
  price_change_7d?: string | null;
  volumeXlm24h?: string | null;
  volume_xlm_24h?: string | null;
  trades24h?: number | null;
  trades_24h?: number | null;
  trustlinesTotal?: number | null;
  trustlines_total?: number | null;
  supply?: string | null;
  sparkline1h?: Array<string | number> | null;
  updatedAt?: string;
  updated_at?: string;
  tomlInfo?: {
    name?: string;
    code?: string;
    image?: string;
    home_url?: string;
    home_domain?: string;
    documentation?: {
      ORG_NAME?: string;
    };
  };
};

type MarketAssetsV1Response = {
  totalItems?: number;
  view?: {
    next?: string;
  };
  member?: MarketAssetsV1Record[];
  meta?: {
    network?: string;
    limit?: number;
    next_cursor?: string | null;
    count?: number;
  };
  market?: MarketAssetsV1Record[];
};

export async function getMarketAssetsFromMarketV1(
  page: number = 1,
  itemsPerPage: number = 30,
  filters: Record<string, string | number | undefined> = {}
): Promise<{ assets: MarketAsset[]; hasNext: boolean; totalItems: number; totalPages: number; xlmPrice: number }> {
  try {
    const payload = await getApiV1Data(
      apiEndpoints.v1.marketAssets({ page, itemsPerPage, ...filters })
    ) as MarketAssetsV1Response;

    const market = Array.isArray(payload.member)
      ? payload.member
      : (Array.isArray(payload.market) ? payload.market : []);
    const stats = await getXLMStats();
    const xlmUsdPrice = Number(stats?.usd || 0);
    const fxRate = xlmUsdPrice > 0 ? xlmUsdPrice : 1;

    const assets: MarketAsset[] = market.map((item, index) => {
      const priceXlm = Number(item.priceXlm ?? item.price_xlm ?? 0);
      const priceUsd = priceXlm * fxRate;
      const supplyRaw = Number(item.supply || 0);
      const circulatingSupply = supplyRaw / 1e7;
      const volumeXlmRaw = Number(item.volumeXlm24h ?? item.volume_xlm_24h ?? 0);
      const volumeXlm = volumeXlmRaw > 0 ? (volumeXlmRaw / 1e7) : 0;
      const volumeUsd = volumeXlm * fxRate;
      const rank = Number(item.rankPosition ?? item.rank ?? ((page - 1) * itemsPerPage + index + 1));
      const code = item.code || 'UNKNOWN';
      const issuer = item.issuer || '';
      const defaultName = code || 'Unknown Asset';
      const name = item.tomlInfo?.documentation?.ORG_NAME || item.tomlInfo?.name || defaultName;
      const image = item.imageUrl || item.image_url || item.tomlInfo?.image || undefined;
      const rawSparkline = Array.isArray(item.sparkline1h) ? item.sparkline1h : [];
      const sparkline = rawSparkline
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      return {
        rank,
        code,
        issuer,
        name,
        image,
        price_usd: priceUsd,
        price_xlm: priceXlm,
        change_1h: Number(item.priceChange1h ?? item.price_change_1h ?? 0),
        change_24h: Number(item.priceChange24h ?? item.price_change_24h ?? 0),
        change_7d: Number(item.priceChange7d ?? item.price_change_7d ?? 0),
        volume_24h: volumeUsd,
        market_cap: circulatingSupply * priceUsd,
        circulating_supply: circulatingSupply,
        sparkline,
      };
    });

    const pageCount = Number(payload.meta?.count || assets.length);
    const hasHydraNext = Boolean(payload.view?.next);
    const hasLegacyNext = Boolean(payload.meta?.next_cursor);
    const totalItemsFromPayload = Number(payload.totalItems || 0);
    // Prefer Hydra totalItems, then fallback to legacy cursor-based estimate.
    const totalItems = totalItemsFromPayload > 0
      ? totalItemsFromPayload
      : ((hasHydraNext || hasLegacyNext) ? (page * itemsPerPage) + 1 : ((page - 1) * itemsPerPage) + pageCount);
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const hasNext = hasHydraNext || hasLegacyNext || page < totalPages;

    return {
      assets,
      hasNext,
      totalItems,
      totalPages,
      xlmPrice: fxRate,
    };
  } catch (error) {
    console.error('Error fetching market assets from v1 market endpoint:', error);
    return { assets: [], hasNext: false, totalItems: 0, totalPages: 1, xlmPrice: 0 };
  }
}

export async function getMarketAssetRankPosition(code: string, issuer?: string): Promise<number> {
  try {
    const assetKey = issuer ? `${code}-${issuer}` : `${code}-native`;
    const payload = await getApiV1Data(
      apiEndpoints.v1.marketAssets({
        page: 1,
        itemsPerPage: 1,
        'asset.assetKey': assetKey,
      })
    ) as MarketAssetsV1Response;

    const first = Array.isArray(payload.member) ? payload.member[0] : null;
    return Number(first?.rankPosition ?? first?.rank ?? 0) || 0;
  } catch (error) {
    console.error('Error fetching market asset rank:', error);
    return 0;
  }
}

function isExpectedAssetV1LookupError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status);
  const message = String((error as any)?.message || '').toLowerCase();
  const title = String((error as any)?.response?.title || '').toLowerCase();

  return (
    status === 400 ||
    status === 404 ||
    message.includes('not found') ||
    message.includes('bad request') ||
    title.includes('not found') ||
    title.includes('bad request')
  );
}

async function getHorizonAssetFallbackSummary(
  code: string,
  issuer?: string
): Promise<{ supply: number; holders: number } | null> {
  if (!issuer) {
    return null;
  }

  try {
    const response = await getHorizonServer().assets().forCode(code).forIssuer(issuer).call();
    const records = Array.isArray((response as any)?.records)
      ? (response as any).records
      : (Array.isArray((response as any)?._embedded?.records) ? (response as any)._embedded.records : []);
    const record = records[0];
    if (!record) {
      return null;
    }

    const balances = (record.balances as Record<string, unknown> | undefined) || {};
    const accounts = (record.accounts as Record<string, unknown> | undefined) || {};

    const authorizedBalance = Number(balances.authorized || 0);
    const maintainBalance = Number(balances.authorized_to_maintain_liabilities || 0);
    const unauthorizedBalance = Number(balances.unauthorized || 0);
    const totalSupply = authorizedBalance + maintainBalance + unauthorizedBalance;

    const authorizedAccounts = Number(accounts.authorized || 0);
    const maintainAccounts = Number(accounts.authorized_to_maintain_liabilities || 0);
    const unauthorizedAccounts = Number(accounts.unauthorized || 0);
    const totalHolders = authorizedAccounts + maintainAccounts + unauthorizedAccounts;

    return {
      supply: totalSupply,
      holders: totalHolders,
    };
  } catch {
    return null;
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
  let stellarChainData: NormalizedStellarchainAsset | null = null;
  let v1AssetPayload: Record<string, unknown> | null = null;
  let v1NotFound = false;

  // 1. Try fetching from Stellarchain v1 API first
  // It provides asset-level stats and metadata for most issued assets.
  try {
    const json = await getApiV1Data(apiEndpoints.v1.assetById(assetId));
    if (json && typeof json === 'object') {
      v1AssetPayload = json as Record<string, unknown>;
    }
    stellarChainData = parseStellarchainV1AssetData(json);
  } catch (e) {
    v1NotFound = Number((e as any)?.response?.status) === 404;
    if (!isExpectedAssetV1LookupError(e)) {
      console.error('Error fetching from Stellarchain.io v1:', e);
    }
  }

  const latestStatisticNode = (v1AssetPayload?.latestStatistic as Record<string, unknown>) || null;
  const marketNode = (v1AssetPayload?.market as Record<string, unknown>) || null;
  const metaFromV1 = {
    assetKey: String(v1AssetPayload?.assetKey || '') || undefined,
    network: Number(v1AssetPayload?.network || 0) || undefined,
    native: typeof v1AssetPayload?.native === 'boolean' ? (v1AssetPayload.native as boolean) : undefined,
    homeUrl: String(v1AssetPayload?.homeUrl || '') || undefined,
    homeDomain: String(v1AssetPayload?.homeDomain || '') || undefined,
    createdAt: String(v1AssetPayload?.createdAt || '') || undefined,
    updatedAt: String(v1AssetPayload?.updatedAt || '') || undefined,
    marketUpdatedAt: String(marketNode?.updated_at || '') || undefined,
    ratingAverage: Number(v1AssetPayload?.ratingAverage ?? latestStatisticNode?.ratingAverage ?? 0) || undefined,
    latestStatistic: latestStatisticNode ? {
      price: Number(latestStatisticNode.price || 0),
      supply: Number(latestStatisticNode.supply || 0),
      trades: Number(latestStatisticNode.trades || 0),
      tradedAmount: Number(latestStatisticNode.tradedAmount || 0),
      trustlinesTotal: Number(latestStatisticNode.trustlinesTotal || 0),
      trustlinesAuthorized: Number(latestStatisticNode.trustlinesAuthorized || 0),
      trustlinesFunded: Number(latestStatisticNode.trustlinesFunded || 0),
      recordedAt: String(latestStatisticNode.recordedAt || '') || undefined,
    } : undefined,
  };

  // 2. Fallback/Concurrent Fetch to Stellar Expert & CoinGecko (for XLM)
  try {
    const coinApiData = await getStellarCoinApiData();
    const xlmPrice = Number(coinApiData?.coingecko_stellar?.market_data?.current_price?.usd || 0) || 0.1;

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
          rank: stellarChainData?.rank || statsResponse.rank,
          code: 'XLM',
          issuer: '',
          name: 'Stellar Lumens',
        description: 'Stellar is an open-source, distributed payments infrastructure. Stellar Lumens (XLM) is the native cryptocurrency of the Stellar network, used to facilitate cross-border transactions and connect financial institutions.',
        domain: 'stellar.org',
        image: 'https://stellar.org/favicon.ico',
        price_usd: currentPrice,
        price_xlm: 1,
          change_1h: stellarChainData?.change_1h || 0,
          change_24h: stellarChainData?.change_24h || stellarChainData?.price_usd_change || statsResponse.priceChange24h,
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
          sparkline: stellarChainData?.sparkline?.length ? stellarChainData.sparkline : (statsResponse.sparkline.length > 0 ? statsResponse.sparkline : sparklineUSD),
        price_history: priceHistory,
        volume_history: [],
        ...metaFromV1,
      };
    }

    const cachedAsset = coinApiData?.stellar_expert?._embedded?.records?.find((record) => {
      const recordAsset = String(record.asset || '');
      if (!recordAsset) return false;
      if (recordAsset === assetId) return true;
      // Some records append a suffix like "-1" / "-2"; match by CODE-ISSUER prefix.
      return parsedIssuer ? recordAsset.startsWith(`${parsedCode}-${parsedIssuer}`) : recordAsset === parsedCode;
    }) as Record<string, unknown> | undefined;

    if (!cachedAsset) {
      if (stellarChainData) {
        const fallbackPriceUsd = Number(stellarChainData.price_usd || 0) > 0
          ? Number(stellarChainData.price_usd || 0)
          : (Number(stellarChainData.price_xlm || 0) > 0 ? Number(stellarChainData.price_xlm || 0) * xlmPrice : 0);
        // No asset payload from our coins API. Return only Stellarchain-side data.
        return {
          rank: stellarChainData.rank || stellarChainData.rating || 0,
          code: parsedCode,
          issuer: parsedIssuer || '',
          name: stellarChainData.name || stellarChainData.code || code,
          description: stellarChainData.description || '',
          domain: stellarChainData.domain,
          image: stellarChainData.image,
          price_usd: fallbackPriceUsd,
          price_xlm: stellarChainData.price_xlm || 0,
          change_1h: stellarChainData.change_1h || 0,
          change_24h: stellarChainData.change_24h || stellarChainData.price_usd_change || 0,
          change_7d: stellarChainData.change_7d || 0,
          volume_24h: stellarChainData.volume_usd || (stellarChainData.volume_xlm_24h || 0) * xlmPrice,
          market_cap: Number(stellarChainData.supply || 0) * fallbackPriceUsd,
          circulating_supply: Number(stellarChainData.supply) || 0,
          total_supply: Number(stellarChainData.supply) || 0,
          holders: stellarChainData.holders || 0,
          payments_24h: 0,
          trades_24h: stellarChainData.trades_24h || 0,
          price_high_24h: 0,
          price_low_24h: 0,
          all_time_high: 0,
          all_time_low: 0,
          rating: stellarChainData.rating,
          sparkline: stellarChainData.sparkline || [],
          price_history: [],
          volume_history: [],
          ...metaFromV1,
        }
      }

      if (v1NotFound) {
        const horizonSummary = await getHorizonAssetFallbackSummary(parsedCode, parsedIssuer);
        if (horizonSummary) {
          return {
            rank: 0,
            code: parsedCode,
            issuer: parsedIssuer || '',
            name: parsedCode,
            description: '',
            domain: '',
            image: undefined,
            price_usd: 0,
            price_xlm: 0,
            change_1h: 0,
            change_24h: 0,
            change_7d: 0,
            volume_24h: 0,
            market_cap: 0,
            circulating_supply: horizonSummary.supply,
            total_supply: horizonSummary.supply,
            holders: horizonSummary.holders,
            payments_24h: 0,
            trades_24h: 0,
            price_high_24h: 0,
            price_low_24h: 0,
            all_time_high: undefined,
            all_time_low: undefined,
            rating: 0,
            sparkline: [],
            price_history: [],
            volume_history: [],
            ...metaFromV1,
          };
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

    // Price sourcing: use Horizon data when available, fallback to unified API price.
    let currentPrice = Number(stellarChainData?.price_usd || asset.price || 0);
    if (currentPrice <= 0 && Number(stellarChainData?.price_xlm || 0) > 0 && xlmPrice > 0) {
      currentPrice = Number(stellarChainData?.price_xlm || 0) * xlmPrice;
    }
    let priceInXlm = 0;
    const isNativeAsset = parsedCode === 'XLM' && !parsedIssuer;

    try {
      const xlmUsdRate = await getXLMUSDPriceFromHorizon();

      if (isNativeAsset) {
        currentPrice = xlmUsdRate;
        priceInXlm = 1;
      } else {
        const aggregations = await getTradeAggregations(
          { code: parsedCode, issuer: parsedIssuer },
          { code: 'XLM' },
          900000,
          1
        );

        if (aggregations.length > 0) {
          priceInXlm = parseFloat(aggregations[0].close) || 0;
          if (priceInXlm > 0 && xlmUsdRate > 0) {
            currentPrice = priceInXlm * xlmUsdRate;
          }
        } else if (currentPrice > 0 && xlmUsdRate > 0) {
          priceInXlm = currentPrice / xlmUsdRate;
        }
      }
    } catch {
      // Keep fallback prices from the unified API payload.
    }

    const supply = stellarChainData?.supply !== undefined ? Number(stellarChainData.supply) : ((Number(asset.supply) || 0) / 1e7);
    // Note: StellarExpert volume is 7d in stroops, SC is 24h USD. We prefer SC volume if available.
    const volume7d = (Number(asset.volume7d) || 0) / 1e7;
    const volume24h = stellarChainData?.volume_usd !== undefined
      ? Number(stellarChainData.volume_usd)
      : ((stellarChainData?.volume_xlm_24h !== undefined ? Number(stellarChainData.volume_xlm_24h) * xlmPrice : (volume7d / 7)));
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
      rank: Number(stellarChainData?.rank || stellarChainData?.rating || asset.rating) || 0,
      code: parsedCode,
      issuer: parsedIssuer || '',
      name: String(stellarChainData?.name || toml.name || code),
      description: String(stellarChainData?.description || toml.desc || ''),
      domain: String(stellarChainData?.domain || asset.domain || toml.orgName || ''),
      image: stellarChainData?.image || (toml.image ? String(toml.image) : undefined),
      price_usd: currentPrice,
      price_xlm: priceInXlm || Number(stellarChainData?.price_xlm || 0),
      change_1h: Number(stellarChainData?.change_1h || 0),
      change_24h: Number(stellarChainData?.change_24h ?? change24h),
      change_7d: Number(stellarChainData?.change_7d ?? change7d),
      volume_24h: volume24h,
      market_cap: supply * currentPrice,
      circulating_supply: supply,
      total_supply: supply,
      holders: stellarChainData?.holders || Number(trustlines[0]) || Number(asset.accounts) || 0,
      payments_24h: Number(asset.payments) || 0,
      trades_24h: Number(stellarChainData?.trades_24h || asset.trades || 0),
      price_high_24h: high24h,
      price_low_24h: low24h,
      all_time_high: allTimeHigh,
      all_time_low: allTimeLow,
      rating: Number(stellarChainData?.rating || asset.rating) || 0,
      sparkline: stellarChainData?.sparkline?.length ? stellarChainData.sparkline : priceHistory.slice(-24).map(p => p[1]),
      price_history: priceHistory,
      volume_history: [],
      ...metaFromV1,
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
    const data = await getApiV1Data(
      apiEndpoints.v1.accounts({ page, 'order[accountMetric.rankPosition]': 'asc' })
    ) as V1CollectionResponse<V1AccountRecord>;
    const records = data.member || [];

    const holders: AssetHolder[] = records.map((record) => ({
      account_id: record.address || '',
      balance: record.accountMetric?.nativeBalance?.toString() || '0',
      paging_token: (page + 1).toString(), // generic token
    })).filter((holder) => holder.account_id.length > 0);

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

function getAccountMetricTransactions(metric?: V1AccountMetric): number {
  if (!metric) return 0;
  return Number(metric.totalTransactions ?? metric.transactionsPerHour ?? 0) || 0;
}

export async function getRichList(
  page: number = 1,
  _limit: number = 50
): Promise<RichListAccount[]> {
  try {
    const data = await getApiV1Data(
      apiEndpoints.v1.accounts({ page, 'order[accountMetric.rankPosition]': 'asc' })
    ) as V1CollectionResponse<V1AccountRecord>;
    return (data.member || []).map((record) => ({
      rank: Number(record.accountMetric?.rankPosition || 0),
      account: record.address || '',
      balance: Number(record.accountMetric?.nativeBalance || 0),
      percent_of_coins: '0', // Not available in new API
      transactions: getAccountMetricTransactions(record.accountMetric),
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
      const json = await getApiV1Data(apiEndpoints.v1.accounts({ page })) as V1CollectionResponse<V1AccountRecord>;
      const data = json.member || [];

      // Transform new API format to old LabeledAccount format
      const transformedData = data.map((record) => ({
        account: record.address || '',
        org_name: null, // Not available in new API
        label: record.label ? {
          name: record.label,
          description: null, // Not available in new API
          verified: record.verified ? 1 : 0
        } : null,
        balance: Number(record.accountMetric?.nativeBalance || 0),
        transactions: String(getAccountMetricTransactions(record.accountMetric)),
        rank: Number(record.accountMetric?.rankPosition || 0)
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

// Batch fetch labels for multiple accounts
export async function getAccountLabels(
  addresses: string[]
): Promise<Map<string, AccountLabel>> {
  const result = new Map<string, AccountLabel>();

  if (addresses.length === 0) {
    return result;
  }

  const uniqueAddresses = Array.from(new Set(addresses.filter(Boolean)));

  // Direct lookup endpoint (fresh + precise) — single request for all addresses.
  try {
    const params = new URLSearchParams();
    for (const address of uniqueAddresses) {
      params.append('address[]', address);
    }
    params.append('network', getCurrentNetwork() || DEFAULT_NETWORK);
    const payload = await getApiV1Data(`/accounts?${params.toString()}`);
    const accounts = payload.member || [];

    for (const account of accounts) {
      if (account.label) {
        result.set(account.address, {
          name: account.label,
          verified: account.verified === true,
          org_name: null,
          description: null,
        });
      }
    }

    // Direct lookup succeeded — return whatever we found (even if empty).
    return result;
  } catch {
    // Direct lookup failed — fall back to cached directory.
  }

  // Fallback: get all labeled accounts from cache (paginated, expensive).
  const allLabels = await getCachedLabels();

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
export function normalizeTransactions(records: unknown[]): Transaction[] {
  const txRecords = records as Array<Record<string, unknown>>;
  return txRecords.map((tx) => ({
    ...(tx as unknown as Transaction),
    ledger_attr: typeof tx.ledger_attr === 'number'
      ? tx.ledger_attr
      : (typeof tx.ledger === 'number' ? tx.ledger : 0),
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
  limit: number = 20,
  network?: NetworkType
): Promise<OrderBook> {
  const ORDER_BOOK_CACHE_TTL_MS = 60_000;
  const ORDER_BOOK_ERROR_COOLDOWN_MS = 120_000;
  type OrderBookCacheEntry = { expiresAt: number; data: OrderBook };

  const cacheStore = (globalThis as unknown as {
    __stellarOrderBookCache?: Map<string, OrderBookCacheEntry>;
    __stellarOrderBookInFlight?: Map<string, Promise<OrderBook>>;
    __stellarOrderBookErrorCooldown?: Map<string, number>;
  });

  if (!cacheStore.__stellarOrderBookCache) {
    cacheStore.__stellarOrderBookCache = new Map<string, OrderBookCacheEntry>();
  }
  if (!cacheStore.__stellarOrderBookInFlight) {
    cacheStore.__stellarOrderBookInFlight = new Map<string, Promise<OrderBook>>();
  }
  if (!cacheStore.__stellarOrderBookErrorCooldown) {
    cacheStore.__stellarOrderBookErrorCooldown = new Map<string, number>();
  }

  const cache = cacheStore.__stellarOrderBookCache;
  const inFlight = cacheStore.__stellarOrderBookInFlight;
  const errorCooldown = cacheStore.__stellarOrderBookErrorCooldown;

  const selling = toHorizonAsset(sellingAsset);
  const buying = toHorizonAsset(buyingAsset);
  if (!selling || !buying) {
    throw new Error('Invalid assets for order book request');
  }

  const networkKey = network || getNetwork();
  const key = [
    networkKey,
    sellingAsset.code || '',
    sellingAsset.issuer || 'native',
    buyingAsset.code || '',
    buyingAsset.issuer || 'native',
    String(limit),
  ].join('|');
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const blockedUntil = errorCooldown.get(key) || 0;
  if (blockedUntil > now) {
    throw new Error('Order book temporarily throttled after repeated failures');
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const server = createHorizonServer(network);
      const response = await server.orderbook(selling, buying).limit(limit).call();
      const data = response as unknown as OrderBook;
      cache.set(key, { data, expiresAt: Date.now() + ORDER_BOOK_CACHE_TTL_MS });
      errorCooldown.delete(key);
      return data;
    } catch (error) {
      errorCooldown.set(key, Date.now() + ORDER_BOOK_ERROR_COOLDOWN_MS);
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}

export function startOrderBookStream(options: {
  sellingAsset: { code: string; issuer?: string };
  buyingAsset: { code: string; issuer?: string };
  cursor?: string;
  onmessage: (book: OrderBook) => void;
  onerror?: (err: unknown) => void;
}) {
  const selling = toHorizonAsset(options.sellingAsset);
  const buying = toHorizonAsset(options.buyingAsset);
  if (!selling || !buying) {
    throw new Error('Invalid assets for order book stream');
  }

  type RawOrderbookAsset = { asset_type?: string; asset_code?: string; asset_issuer?: string };
  const isSdkAsset = (asset: Asset | RawOrderbookAsset): asset is Asset =>
    typeof (asset as Asset).getAssetType === 'function'
    && typeof (asset as Asset).getCode === 'function'
    && typeof (asset as Asset).getIssuer === 'function';

  const normalizeAsset = (asset: Asset | RawOrderbookAsset) => {
    if (isSdkAsset(asset)) {
      return {
        asset_type: asset.getAssetType(),
        asset_code: asset.getCode() || 'XLM',
        asset_issuer: asset.getIssuer() || '',
      };
    }

    return {
      asset_type: asset.asset_type || 'native',
      asset_code: asset.asset_code || 'XLM',
      asset_issuer: asset.asset_issuer || '',
    };
  };

  const normalizeRecord = (record: Horizon.ServerApi.OrderbookRecord): OrderBook => ({
    bids: record.bids.map((entry) => ({
      price: entry.price,
      amount: entry.amount,
      price_r: {
        n: entry.price_r.n,
        d: entry.price_r.d,
      },
    })),
    asks: record.asks.map((entry) => ({
      price: entry.price,
      amount: entry.amount,
      price_r: {
        n: entry.price_r.n,
        d: entry.price_r.d,
      },
    })),
    base: normalizeAsset(record.base),
    counter: normalizeAsset(record.counter),
  });

  return createHorizonServer()
    .orderbook(selling, buying)
    .cursor(options.cursor ?? 'now')
    .stream({
      onmessage: (record: Horizon.ServerApi.OrderbookRecord) => {
        options.onmessage(normalizeRecord(record));
      },
      onerror: options.onerror,
    });
}

// Fetch OHLC Data
export async function getTradeAggregations(
  baseAsset: { code: string; issuer?: string },
  counterAsset: { code: string; issuer?: string },
  resolution: number, // e.g. 900000 (15m), 3600000 (1h), 86400000 (1d)
  limit: number = 100,
  startTime?: number,
  endTime?: number,
  signal?: AbortSignal,
  network?: NetworkType
): Promise<TradeAggregation[]> {
  const base = toHorizonAsset(baseAsset);
  const counter = toHorizonAsset(counterAsset);
  if (!base || !counter) {
    return [];
  }

  // SDK call builder does not support AbortSignal directly.
  if (signal?.aborted) {
    return [];
  }

  const now = Date.now();
  const effectiveEnd = endTime ?? now;
  const defaultWindow = Math.max(resolution * limit, resolution);
  const effectiveStart = startTime ?? Math.max(effectiveEnd - defaultWindow, 0);
  const order: 'asc' | 'desc' = startTime ? 'asc' : 'desc';

  const server = createHorizonServer(network);
  try {
    const response = await server
      .tradeAggregation(base, counter, effectiveStart, effectiveEnd, resolution, 0)
      .limit(limit)
      .order(order)
      .call();

    return response.records as unknown as TradeAggregation[];
  } catch (error) {
    const status = Number((error as any)?.response?.status || (error as any)?.status);
    const message = String((error as any)?.message || '').toLowerCase();
    const aborted = signal?.aborted || (error as any)?.name === 'AbortError';

    // No trades in selected window/pair often returns 404 from Horizon.
    if (aborted || status === 404 || message.includes('not found')) {
      return [];
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch trade aggregations:', error);
    }
    return [];
  }
}

// USDC issuer on Stellar mainnet (Centre/Circle)
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

/**
 * Get current XLM/USD price from Horizon API using XLM/USDC trade aggregations
 * Uses the most recent 15-minute aggregation to get the close price
 */
export async function getXLMUSDPriceFromHorizon(signal?: AbortSignal, priceNetwork?: NetworkType): Promise<number> {
  try {
    const aggregations = await getTradeAggregations(
      { code: 'XLM' }, // base asset
      { code: 'USDC', issuer: USDC_ISSUER }, // counter asset (USDC ≈ USD)
      900000, // 15-minute resolution
      1, // just need the most recent one
      undefined,
      undefined,
      signal,
      priceNetwork
    );

    if (aggregations.length > 0) {
      // Close price gives us XLM price in USDC (≈ USD)
      return parseFloat(aggregations[0].close);
    }

    // Fallback: use current order book midpoint/first quote if there were no recent trades
    const orderBook = await getOrderBook(
      { code: 'XLM' },
      { code: 'USDC', issuer: USDC_ISSUER },
      5,
      priceNetwork
    );

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

export { USDC_ISSUER };
