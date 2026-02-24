'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAssetDetails } from '@/lib/stellar';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';
import MobileHeader from '@/components/mobile/MobileHeader';
import AssetLoadingShell from '@/components/ui/AssetLoadingShell';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { useNetwork, NETWORK_CONFIGS, type NetworkType } from '@/contexts/NetworkContext';
import { persistNetwork } from '@/lib/network/state';
import { apiEndpoints, getApiV1Data } from '@/services/api';


function parseAssetSlug(slug: string): { code: string; issuer?: string } | null {
  const decoded = decodeURIComponent(slug);
  const idx = decoded.lastIndexOf('-');
  if (idx <= 0) return null;
  const code = decoded.slice(0, idx);
  const issuer = decoded.slice(idx + 1);
  if (!code) return null;
  if (!issuer) return null;
  if (issuer === 'native') return { code, issuer: undefined };
  return { code, issuer };
}

function isAssetNotFoundError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status);
  const title = String((error as any)?.response?.title || '').toLowerCase();
  const message = String((error as any)?.message || '').toLowerCase();

  return status === 404 || title.includes('not found') || message.includes('not found');
}

export default function AssetDetailsRoute() {
  const { network: activeNetwork } = useNetwork();
  const params = useParams<{ asset?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const asset = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    routeParam: params.asset,
    aliases: ['/assets'],
  });

  const [details, setDetails] = useState<any>(null);
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
    const otherNetworks = (Object.keys(NETWORK_CONFIGS) as NetworkType[]).filter(
      (network) => network !== currentNetwork
    );

    if (!assetId || otherNetworks.length === 0) return [];

    const checks = await Promise.all(
      otherNetworks.map(async (network) => {
        try {
          await getApiV1Data(apiEndpoints.v1.assetById(assetId, { network }));
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
        const parsed = parseAssetSlug(asset);
        const assetId = parsed ? `${parsed.code}-${parsed.issuer || 'native'}` : '';
        if (!assetId) return;
        setCheckingOtherNetworks(true);
        const networksWithAsset = await checkOtherNetworksForAsset(assetId, activeNetwork);
        setAvailableNetworks(networksWithAsset);
        setCheckingOtherNetworks(false);
      };

      try {
        setIsLoading(true);
        setError(null);
        setAvailableNetworks([]);
        setCheckingOtherNetworks(false);
        const parsed = parseAssetSlug(asset);
        if (!parsed) {
          setError('Invalid asset format');
          return;
        }

        const code = parsed.code;
        const issuer = parsed.issuer;

        // Normalize native asset to the canonical slug.
        if (code.toUpperCase() === 'XLM' && !issuer && asset !== 'XLM-native') {
          router.replace('/assets/XLM-native');
          return;
        }

        const assetDetails = await getAssetDetails(code, issuer);

        if (!assetDetails) {
          setError('Asset not found');
          await runCrossNetworkCheck();
          return;
        }

        setDetails(assetDetails);
        setRank(Number(assetDetails.rank || 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset details.');
        if (isAssetNotFoundError(err)) {
          await runCrossNetworkCheck();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeNetwork, asset, checkOtherNetworksForAsset, router]);

  if (isLoading) {
    return <AssetLoadingShell />;
  }

  if (error || !details) {
    const hasNetworkMatch = availableNetworks.length > 0;
    const title = hasNetworkMatch ? 'Asset Found On Another Network' : 'Asset Not Found';
    const description = hasNetworkMatch
      ? 'This asset is not available on the currently selected network.'
      : 'We could not find this asset on other available networks.';
    const fallbackHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <MobileHeader forceShow />
        <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full mx-auto my-auto">
        <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-4 ${hasNetworkMatch ? 'bg-amber-500/12' : 'bg-yellow-500/12'}`}>
          <svg className={`w-12 h-12 ${hasNetworkMatch ? 'text-amber-500' : 'text-yellow-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-4.418 0-8 1.79-8 4s3.582 4 8 4 8-1.79 8-4-3.582-4-8-4zm0 0V5m0 14v-3m-3-4h6" />
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
        {!checkingOtherNetworks && hasNetworkMatch && (
          <div className="mb-4 text-sm text-[var(--text-secondary)]">
            Available on: {availableNetworks.map((network) => NETWORK_CONFIGS[network].displayName).join(', ')}
          </div>
        )}
        {!checkingOtherNetworks && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {availableNetworks.map((network) => (
              <a
                key={network}
                href={fallbackHref}
                onClick={(event) => {
                  event.preventDefault();
                  switchNetworkAndReload(network);
                }}
                className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Open asset on {NETWORK_CONFIGS[network].displayName}
              </a>
            ))}
            <Link
              href="/markets"
              className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Go to Markets
            </Link>
          </div>
        )}
      </div>
      </div>
      </div>
    );
  }

  return (
    <>
      <div className="block md:hidden">
        <AssetMobileView asset={details} rank={rank} />
      </div>
      <div className="hidden md:block">
        <AssetDesktopView asset={details} rank={rank} />
      </div>
    </>
  );
}
