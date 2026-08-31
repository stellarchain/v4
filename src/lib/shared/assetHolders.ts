import type { AssetHolder, StellarAccount } from './interfaces';

export interface AssetHolderBatch {
  holders: AssetHolder[];
  lastProcessedCursor: string | null;
  processedAccounts: number;
  targetReached: boolean;
}

export function extractFundedAssetHolder(
  account: StellarAccount,
  assetCode: string,
  assetIssuer: string
): AssetHolder | null {
  const assetBalance = account.balances.find(
    balance => balance.asset_code === assetCode && balance.asset_issuer === assetIssuer
  );
  const balance = assetBalance?.balance || '0';
  if (parseFloat(balance) <= 0) return null;

  return {
    account_id: account.account_id,
    balance,
    paging_token: account.paging_token || account.id,
  };
}

export function extractFundedAssetHolders(
  accounts: StellarAccount[],
  assetCode: string,
  assetIssuer: string
): AssetHolder[] {
  const holders: AssetHolder[] = [];

  for (const account of accounts) {
    const holder = extractFundedAssetHolder(account, assetCode, assetIssuer);
    if (holder) holders.push(holder);
  }

  return holders;
}

export function sortAssetHoldersByBalance(holders: AssetHolder[]): AssetHolder[] {
  return [...holders].sort(
    (left, right) => parseFloat(right.balance) - parseFloat(left.balance)
  );
}

export function collectFundedAssetHolderBatch(
  accounts: StellarAccount[],
  assetCode: string,
  assetIssuer: string,
  targetHolderCount: number
): AssetHolderBatch {
  const holders: AssetHolder[] = [];
  let lastProcessedCursor: string | null = null;
  let processedAccounts = 0;

  for (const account of accounts) {
    processedAccounts += 1;
    lastProcessedCursor = account.paging_token || account.id || null;

    const holder = extractFundedAssetHolder(account, assetCode, assetIssuer);
    if (holder) holders.push(holder);
    if (holders.length >= targetHolderCount) break;
  }

  return {
    holders,
    lastProcessedCursor,
    processedAccounts,
    targetReached: holders.length >= targetHolderCount,
  };
}
