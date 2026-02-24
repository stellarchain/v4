'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { getAssetDetails } from '@/lib/stellar';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';
import AssetLoadingShell from '@/components/ui/AssetLoadingShell';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { useNetwork, NETWORK_CONFIGS, type NetworkType } from '@/contexts/NetworkContext';
import { persistNetwork } from '@/lib/network/state';
import { apiEndpoints, getApiV1Data } from '@/services/api';

function isAssetNotFoundError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status);
  const title = String((error as any)?.response?.title || '').toLowerCase();
  const message = String((error as any)?.message || '').toLowerCase();

  return status === 404 || title.includes('not found') || message.includes('not found');
}

function resolveAssetLookupIdentity(rawCode: string, rawIssuer?: string): { code: string; issuer?: string; assetId: string } {
  const decodedCode = decodeURIComponent(rawCode || '');
  let parsedCode = decodedCode;
  let parsedIssuer = rawIssuer;

  if (!parsedIssuer && decodedCode.includes('-')) {
    const parts = decodedCode.split('-');
    if (parts.length === 2 && parts[1].length > 20) {
      parsedCode = parts[0];
      parsedIssuer = parts[1];
    }
  }

  const assetId =
    parsedCode.toUpperCase() === 'XLM' && !parsedIssuer
      ? 'XLM-native'
      : parsedIssuer
        ? `${parsedCode}-${parsedIssuer}`
        : parsedCode;

  return { code: parsedCode, issuer: parsedIssuer, assetId };
}

function toApiNetworkId(network: NetworkType): number {
  if (network === 'mainnet') return 1;
  if (network === 'testnet') return 2;
  return 3;
}

export default function AssetPage() {
  const { network: activeNetwork } = useNetwork();
  const params = useParams<{ code?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const code = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'code',
    routeParam: params.code,
    aliases: ['/asset'],
  });
  const issuer = searchParams.get('issuer') || undefined;

  const [asset, setAsset] = useState<any>(null);
  const [rank, setRank] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOtherNetworks, setCheckingOtherNetworks] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>([]);

  const switchNetworkAndReload = useCallback((targetNetwork: NetworkType) => {
    persistNetwork(targetNetwork);
    const query = searchParams.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    window.location.href = targetUrl;
  }, [pathname, searchParams]);

  const checkOtherNetworksForAsset = useCallback(async (assetId: string, currentNetwork: NetworkType) => {
    const otherNetworks: NetworkType[] = ['mainnet', 'testnet'].filter(
      (network): network is NetworkType => network !== currentNetwork
    );

    if (!assetId || otherNetworks.length === 0) return [];

    const checks = await Promise.all(
      otherNetworks.map(async (network) => {
        try {
          await getApiV1Data(apiEndpoints.v1.assetById(assetId, { network: toApiNetworkId(network) }));
          return network;
        } catch {
          return null;
        }
      })
    );

    return checks.filter((network): network is NetworkType => network !== null);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const runCrossNetworkCheck = async () => {
        if (!code) return;
        setCheckingOtherNetworks(true);
        const lookup = resolveAssetLookupIdentity(code, issuer);
        const networksWithAsset = await checkOtherNetworksForAsset(lookup.assetId, activeNetwork);
        setAvailableNetworks(networksWithAsset);
        setCheckingOtherNetworks(false);
      };

      try {
        setIsLoading(true);
        setError(null);
        setAvailableNetworks([]);
        setCheckingOtherNetworks(false);
        if (!code) {
          setError('Asset code is missing');
          return;
        }
        const lookup = resolveAssetLookupIdentity(code, issuer);
        const assetData = await getAssetDetails(lookup.code, lookup.issuer);

        if (!assetData) {
          setError('Asset not found');
          await runCrossNetworkCheck();
          return;
        }

        setAsset(assetData);
        setRank(Number(assetData.rank || 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset details.');
        if (code && isAssetNotFoundError(err)) {
          await runCrossNetworkCheck();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeNetwork, checkOtherNetworksForAsset, code, issuer]);

  if (isLoading) {
    return <AssetLoadingShell />;
  }

  if (error || !asset) {
    const hasNetworkMatch = availableNetworks.length > 0;
    const title = hasNetworkMatch ? 'Asset Found On Another Network' : 'Asset Not Found';
    const description = hasNetworkMatch
      ? 'This asset is not available on the currently selected network.'
      : 'The asset code or issuer may be invalid, or the asset does not exist.';

    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${hasNetworkMatch ? 'bg-sky-500/10' : 'bg-[var(--bg-tertiary)]'}`}>
          <svg className={`w-10 h-10 ${hasNetworkMatch ? 'text-sky-500' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h1>
        <p className="text-[var(--text-tertiary)] mb-4 text-center">{description}</p>
        <p className="text-[var(--text-muted)] text-sm mb-4 text-center">
          Current network: <span className="font-semibold text-[var(--text-secondary)]">{NETWORK_CONFIGS[activeNetwork].displayName}</span>
        </p>
        {checkingOtherNetworks && (
          <p className="text-[var(--text-muted)] text-sm mb-4">Checking other networks...</p>
        )}
        {!checkingOtherNetworks && availableNetworks.length > 0 && (
          <div className="mb-4 text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">This asset exists on:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {availableNetworks.map((network) => (
                <button
                  key={network}
                  onClick={() => switchNetworkAndReload(network)}
                  className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Switch to {NETWORK_CONFIGS[network].displayName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <AssetMobileView asset={asset} rank={rank} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <AssetDesktopView asset={asset} rank={rank} />
      </div>
    </>
  );
}
