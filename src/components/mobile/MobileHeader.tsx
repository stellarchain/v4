'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { NetworkBadge } from '@/components/NetworkSwitcher';
import { getXLMStats, getTradeAggregations, USDC_ISSUER } from '@/lib/stellar';
import { getRouteFromSearchQuery } from '@/lib/searchRouting';

interface MobileHeaderProps {
  forceShow?: boolean;
}

export default function MobileHeader({ forceShow = false }: MobileHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [xlmPrice, setXlmPrice] = useState(0);
  const [xlmChange24h, setXlmChange24h] = useState<number | null>(null);
  const pathname = usePathname();

  // Fetch XLM Price and 24h change
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Direct fetch from internal API
        const data = await getXLMStats();
        if (data) {
          setXlmPrice(data.usd || 0);
          setXlmChange24h(data.usd_24h_change || 0);
        }
      } catch (e) {
        console.error('Failed to fetch header stats', e);
        // Fallback to Horizon for price only
        try {
          const priceData = await getTradeAggregations(
            { code: 'XLM' },
            { code: 'USDC', issuer: USDC_ISSUER },
            900000,
            1
          );
          if (priceData.length > 0) {
            setXlmPrice(parseFloat(priceData[0].close));
          }
        } catch (e2) {
          console.error('Fallback price fetch failed', e2);
        }
      }
    };
    fetchStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const route = getRouteFromSearchQuery(searchQuery);
    if (!route) return;
    window.location.href = route;
    setSearchQuery('');
  };

  // Hide header on pages that have their own custom header
  if (!forceShow) {
    if (pathname?.startsWith('/address/')) return null;
    if (pathname?.startsWith('/markets')) return null;
    // Asset pages have their own dedicated mobile header (with price/stats)
    if (pathname?.startsWith('/assets/')) return null;
    if (pathname?.startsWith('/asset/')) return null;
    // Keep the global header visible on contract detail pages (including fallback states)
    if (pathname?.startsWith('/liquidity-pool/')) return null;
  }

  // Same header for all pages (with stats)
  return (
    <header className="bg-[var(--header-bg)] text-white pt-4 pb-4 px-4 rounded-b-3xl shadow-lg relative z-10 md:hidden">
      {/* Top Bar: Logo + Network Badge */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Image
            src="/stellarchain-logo.svg"
            alt="StellarChain Explorer"
            width={200}
            height={56}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <NetworkBadge />
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <form onSubmit={handleSearch}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 pointer-events-none">
            <svg className="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-400 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            placeholder="Search hash, ledger, account..."
          />
        </form>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 uppercase tracking-widest font-bold">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>XLM: <span className="text-white ml-0.5">${xlmPrice > 0 ? xlmPrice.toFixed(4) : '0.0000'}</span></span>
        </div>
        <div>
          <span>24h: <span className={`ml-0.5 ${xlmChange24h !== null && xlmChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {xlmChange24h !== null ? `${xlmChange24h >= 0 ? '+' : ''}${xlmChange24h.toFixed(2)}%` : '--'}
          </span></span>
        </div>
      </div>
    </header>
  );
}
