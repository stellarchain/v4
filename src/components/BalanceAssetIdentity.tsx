'use client';

import Badge from '@/components/ui/Badge';
import type { AssetDetails } from '@/lib/stellar';
import { shortenAddress } from '@/lib/stellar';
import { buildBalanceAssetPresentation, buildBalanceAssetSubtitle } from '@/lib/shared/assetBalancePresentation';

type BalanceAsset = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
};

type BalanceAssetIdentityProps = {
  balance: BalanceAsset;
  details?: AssetDetails;
  size?: 'sm' | 'md';
};

export default function BalanceAssetIdentity({ balance, details, size = 'md' }: BalanceAssetIdentityProps) {
  const asset = buildBalanceAssetPresentation(balance, details);
  const iconSize = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
  const detailText = buildBalanceAssetSubtitle(asset, shortenAddress);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`${iconSize} relative shrink-0 overflow-hidden rounded-full border border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-300`}>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {asset.code.slice(0, 2)}
        </span>
        {asset.image && (
          <img
            src={asset.image}
            alt={`${asset.name} logo`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{asset.name}</span>
          {asset.code !== asset.name && (
            <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">{asset.code}</span>
          )}
          {asset.verified && (
            <Badge variant="success" className="shrink-0 gap-1 px-1.5 py-0 text-[9px]">
              <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Verified
            </Badge>
          )}
        </div>
        <div
          className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]"
          title={asset.issuer || asset.domain}
        >
          {detailText}
        </div>
      </div>
    </div>
  );
}
