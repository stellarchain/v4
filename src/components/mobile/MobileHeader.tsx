'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function MobileHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const [xlmPrice, setXlmPrice] = useState(0);
  const [xlmChange24h, setXlmChange24h] = useState<number | null>(null);
  const pathname = usePathname();

  // Fetch XLM Price and 24h change
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch XLM Price and 24h change from CoinGecko
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true');
        const data = await res.json();
        if (data.stellar) {
          setXlmPrice(data.stellar.usd || 0);
          setXlmChange24h(data.stellar.usd_24h_change || 0);
        }
      } catch (e) {
        console.error('Failed to fetch header stats', e);
        // Fallback to Horizon for price only
        try {
          const priceRes = await fetch('https://horizon.stellar.org/trade_aggregations?base_asset_type=native&counter_asset_type=credit_alphanum4&counter_asset_code=USDC&counter_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN&resolution=900000&limit=1&order=desc');
          const priceData = await priceRes.json();
          if (priceData._embedded.records.length > 0) {
            setXlmPrice(parseFloat(priceData._embedded.records[0].close));
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
    const query = searchQuery.trim();
    if (!query) return;

    const upperQuery = query.toUpperCase();

    // Contract ID (starts with C, 56 chars) - case insensitive
    if (query.length === 56 && upperQuery.startsWith('C')) {
      window.location.href = `/contract/${upperQuery}`;
    }
    // Account ID (starts with G, 56 chars) - case insensitive
    else if (query.length === 56 && upperQuery.startsWith('G')) {
      window.location.href = `/account/${upperQuery}`;
    }
    // Transaction hash (64 chars hex)
    else if (query.length === 64) {
      window.location.href = `/transaction/${query.toLowerCase()}`;
    }
    // Ledger sequence (all digits)
    else if (/^\d+$/.test(query)) {
      window.location.href = `/ledger/${query}`;
    }
    // Default to account search
    else {
      window.location.href = `/account/${query}`;
    }
    setSearchQuery('');
  };

  // Hide header on pages that have their own custom header
  if (pathname?.startsWith('/account/')) return null;
  if (pathname?.startsWith('/markets')) return null;
  if (pathname?.startsWith('/asset/')) return null;
  if (pathname?.startsWith('/transaction/')) return null;
  if (pathname?.startsWith('/contract/')) return null;
  if (pathname?.startsWith('/liquidity-pool/')) return null;

  // Same header for all pages (with stats)
  return (
    <header className="bg-[var(--header-bg)] text-white pt-6 pb-6 px-4 rounded-b-3xl shadow-lg relative z-10 md:hidden">
      {/* Top Bar: Logo */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/">
          <Image
            src="/bunn.png"
            alt="StellarChain Explorer"
            width={200}
            height={42}
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <form onSubmit={handleSearch}>
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-400 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
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
