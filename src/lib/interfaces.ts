// Stellar interfaces and types

export interface Ledger {
  id: string;
  paging_token: string;
  hash: string;
  prev_hash: string;
  sequence: number;
  successful_transaction_count: number;
  failed_transaction_count: number;
  operation_count: number;
  tx_set_operation_count: number;
  closed_at: string;
  total_coins: string;
  fee_pool: string;
  base_fee_in_stroops: number;
  base_reserve_in_stroops: number;
  max_tx_set_size: number;
  protocol_version: number;
  header_xdr: string;
}

export interface TransactionDisplayInfo {
  type: 'payment' | 'contract' | 'other' | 'manage_offer' | 'multi_send' | 'bulk_send';
  amount?: string;
  rawAmount?: number; // For sorting
  asset?: string;
  functionName?: string;
  // Payment specific
  to?: string; // Recipient address
  // Swap specific
  isSwap?: boolean;
  sourceAmount?: string;
  sourceAsset?: string;
  destinationAsset?: string;
  // Contract effect (received/sent from effects)
  effectType?: 'received' | 'sent';
  effectAmount?: string;
  effectAsset?: string;
  // Multi/Bulk Send specific
  elementCount?: number;
  // Offer specific
  offerDetails?: {
    sellingAsset: string;
    buyingAsset: string;
    price: string;
    amount: string;
  };
}

export interface Transaction {
  id: string;
  paging_token: string;
  successful: boolean;
  hash: string;
  ledger: number;
  ledger_attr: number;
  created_at: string;
  source_account: string;
  source_account_sequence: string;
  fee_account: string;
  fee_charged: string;
  max_fee: string;
  operation_count: number;
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr: string;
  fee_meta_xdr: string;
  memo_type: string;
  memo?: string;
  signatures: string[];
  // Enhanced fields for display (populated by client)
  displayInfo?: TransactionDisplayInfo;
}

export interface Operation {
  id: string;
  paging_token: string;
  transaction_successful: boolean;
  source_account: string;
  type: string;
  type_i: number;
  created_at: string;
  transaction_hash: string;
  // Payment specific
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  from?: string;
  to?: string;
  amount?: string;
  // Create account specific
  account?: string;
  starting_balance?: string;
  funder?: string;
  // Smart Contract specific
  function?: string;
  parameters?: { value: string; type: string }[];
  // Other operation-specific fields
  [key: string]: unknown;
}

export interface KnownAccount {
  address: string;
  name: string;
  domain?: string;
  tags?: string[];
  paging_token: string;
}

export interface Effect {
  id: string;
  paging_token: string;
  account: string;
  type: string;
  type_i: number;
  created_at: string;
  [key: string]: unknown;
}

export interface MarketAsset {
  rank: number;
  code: string;
  issuer: string;
  name: string;
  image?: string;
  price_usd: number;
  price_xlm: number;
  change_1h: number;
  change_24h: number;
  change_7d: number;
  change_30d?: number;
  change_90d?: number;
  change_1y?: number;
  volume_24h: number;
  market_cap: number;
  circulating_supply: number;
  sparkline: number[];
}

export interface AssetDetails extends MarketAsset {
  description?: string;
  domain?: string;
  image?: string;
  total_supply: number;
  holders: number;
  payments_24h: number;
  trades_24h: number;
  price_high_24h: number;
  price_low_24h: number;
  all_time_high?: number;
  all_time_low?: number;
  rating: number;
  price_history: [number, number][];
  volume_history: [number, number][];
}

export interface PaginatedResponse<T> {
  _links: {
    self: { href: string };
    next: { href: string };
    prev: { href: string };
  };
  _embedded: {
    records: T[];
  };
}

export interface NetworkStats {
  ledger_count: number;
  latest_ledger: Ledger;
  total_coins: string;
  fee_pool: string;
  base_fee: number;
  base_reserve: number;
  protocol_version: number;
  // Extended stats
  ledger_capacity_usage?: number;
  avg_fee?: number;
  max_tx_set_size?: number;
}

export interface LiquidityPool {
  id: string;
  paging_token: string;
  fee_bp: number;
  type: string;
  total_trustlines: number;
  total_shares: string;
  reserves: {
    asset: string;
    amount: string;
  }[];
  last_modified_ledger: number;
  last_modified_time: string;
  _links?: {
    self: { href: string };
    transactions: { href: string; templated: boolean };
    operations: { href: string; templated: boolean };
  };
}

export interface LiquidityPoolTrade {
  id: string;
  paging_token: string;
  ledger_close_time: string;
  trade_type: string;
  liquidity_pool_fee_bp: number;
  base_offer_id?: string;
  base_account?: string;
  base_amount: string;
  base_asset_type: string;
  base_asset_code?: string;
  base_asset_issuer?: string;
  counter_liquidity_pool_id?: string;
  counter_amount: string;
  counter_asset_type: string;
  counter_asset_code?: string;
  counter_asset_issuer?: string;
  price: {
    n: number;
    d: number;
  };
  // Added for linking to transactions
  transaction_hash?: string;
  _links?: {
    self: { href: string };
    base?: { href: string };
    counter?: { href: string };
    operation?: { href: string };
  };
}

export interface LiquidityPoolEffect {
  id: string;
  paging_token: string;
  account: string;
  type: string;
  type_i: number;
  created_at: string;
  liquidity_pool?: {
    id: string;
    fee_bp: number;
    type: string;
    total_trustlines: number;
    total_shares: string;
    reserves: { asset: string; amount: string }[];
  };
  reserves_deposited?: { asset: string; amount: string }[];
  reserves_received?: { asset: string; amount: string }[];
  shares_received?: string;
  shares_redeemed?: string;
}

// Asset Trades interface (for /trades endpoint)
export interface AssetTrade {
  id: string;
  paging_token: string;
  ledger_close_time: string;
  trade_type: string;
  base_offer_id?: string;
  base_account?: string;
  base_amount: string;
  base_asset_type: string;
  base_asset_code?: string;
  base_asset_issuer?: string;
  counter_offer_id?: string;
  counter_account?: string;
  counter_amount: string;
  counter_asset_type: string;
  counter_asset_code?: string;
  counter_asset_issuer?: string;
  base_is_seller: boolean;
  price: {
    n: number;
    d: number;
  };
  _links?: {
    self: { href: string };
    base: { href: string };
    counter: { href: string };
    operation: { href: string };
  };
}

// Contract invocation record
export interface ContractInvocation {
  id: string;
  txHash: string;
  sourceAccount: string;
  contractId: string;
  functionName: string;
  parameters: Array<{ type: string; value: string; decoded?: string }>;
  createdAt: string;
  ledger: number;
  successful: boolean;
  // Amount credited to source account (from effects) - useful for harvest/claim
  resultAmount?: string;
  resultAsset?: string;
}

// Asset holder interface
export interface AssetHolder {
  account_id: string;
  balance: string;
  paging_token: string;
}

// Trading pair interface
export interface TradingPair {
  baseAsset: { code: string; issuer?: string; type: string };
  counterAsset: { code: string; issuer?: string; type: string };
  price: number;
  baseVolume24h: number;
  counterVolume24h: number;
  tradeCount24h: number;
  totalTradeCount: number;
  priceChange24h: number;
  spread: number;
  lastTradeTime?: string;
}

// Rich List specific types
export interface RichListAccount {
  rank: number;
  account: string;
  balance: number;
  percent_of_coins: string;
  transactions: number;
  label?: {
    name: string;
    verified: boolean;
    description?: string;
  };
}

// Known/Labeled Accounts API types
export interface LabeledAccount {
  account: string;
  org_name: string | null;
  label: {
    name: string;
    description: string | null;
    verified: number;
  } | null;
  balance: number;
  transactions: string;
  rank: number;
}

export interface LabeledAccountsAPIResponse {
  current_page: number;
  total: number;
  per_page: number;
  last_page: number;
  data: LabeledAccount[];
}

// Account Label type for badge display
export interface AccountLabel {
  name: string;
  verified: boolean;
  org_name: string | null;
  description: string | null;
}

// Contracts API types
export interface APIContract {
  id: number;
  contract_id: string;
  contract_code: string | null;
  asset_code: string | null;
  asset_issuer: string | null;
  created_at: string;
  wasm_id: string | null;
  contract_type: number; // 0 = wasm/address, 1 = asset/SAC
  network: string;
  source_code_verified: boolean;
  transactions_count: number;
  create_transaction: {
    hash: string;
    fee: string;
    source_account: string;
    host_functions: string[];
  } | null;
}

// Statistics interfaces
export interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  sparkline: number[];
  prefix?: string;
  suffix?: string;
}

export interface StatisticsData {
  market: {
    price: StatItem;
    rank: StatItem;
    marketCap: StatItem;
    volume: StatItem;
    circulatingSupply: StatItem;
  };
  blockchain: {
    totalLedgers: StatItem;
    tps: StatItem;
    ops: StatItem;
    txPerLedger: StatItem;
    successfulTx: StatItem;
  };
  network: {
    totalAccounts: StatItem;
    totalAssets: StatItem;
    outputValue: StatItem;
    activeAddresses: StatItem;
    contractInvocations: StatItem;
  };
}

// Order Book specific interfaces
export interface TradeAggregation {
  timestamp: number;
  trade_count: number;
  base_volume: string;
  counter_volume: string;
  avg: string;
  high: string;
  high_r: {
    n: number;
    d: number;
  };
  low: string;
  low_r: {
    n: number;
    d: number;
  };
  open: string;
  open_r: {
    n: number;
    d: number;
  };
  close: string;
  close_r: {
    n: number;
    d: number;
  };
}

export interface OrderBook {
  bids: {
    price: string;
    amount: string;
    price_r: {
      n: number;
      d: number;
    };
  }[];
  asks: {
    price: string;
    amount: string;
    price_r: {
      n: number;
      d: number;
    };
  }[];
  base: {
    asset_type: string;
    asset_code: string;
    asset_issuer: string;
  };
  counter: {
    asset_type: string;
    asset_code: string;
    asset_issuer: string;
  };
}
