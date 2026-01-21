'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const [baseFee, setBaseFee] = useState(100);
  const [xlmPrice, setXlmPrice] = useState(0);
  const pathname = usePathname();

  const isHomePage = pathname === '/';

  // Fetch base fee & XLM Price
  useEffect(() => {
    if (!isHomePage) return; // Only fetch stats for homepage
    const fetchStats = async () => {
      try {
        // Fetch Base Fee
        const feeRes = await fetch('https://horizon.stellar.org/');
        const feeData = await feeRes.json();
        setBaseFee(feeData.core_latest_ledger.base_fee || 100);

        // Fetch XLM Price (XLM/USDC)
        const priceRes = await fetch('https://horizon.stellar.org/trade_aggregations?base_asset_type=native&counter_asset_type=credit_alphanum4&counter_asset_code=USDC&counter_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN&resolution=900000&limit=1&order=desc');
        const priceData = await priceRes.json();
        if (priceData._embedded.records.length > 0) {
          setXlmPrice(parseFloat(priceData._embedded.records[0].close));
        }
      } catch (e) {
        console.error('Failed to fetch header stats', e);
      }
    };
    fetchStats();
  }, [isHomePage]);

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

  // Simplified Header for non-homepage
  if (!isHomePage) {
    return (
      <header className="relative bg-[#020617] pt-6 pb-6 overflow-hidden md:hidden border-b border-white/5">
        {/* Dot Pattern Background */}
        <div
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10 px-6 mb-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-white tracking-tight text-lg">StellarChain</span>
          </Link>
        </div>

        {/* Bottom: Search Bar */}
        <div className="relative z-10 px-6">
          <form onSubmit={handleSearch}>
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center">
              <span className="pl-3 pr-2 text-white/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-white placeholder-white/40 focus:ring-0 focus:outline-none flex-1 text-sm py-1 w-full"
                placeholder="Search hash, ledger, account..."
              />
            </div>
          </form>
        </div>
      </header>
    );
  }

  // Full Header for Homepage
  return (
    <header className="relative bg-[#020617] pt-safe pt-6 pb-12 overflow-hidden md:hidden">
      {/* Dot Pattern Background */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Top Bar: Logo & Notification */}
      <div className="relative z-10 px-6 flex justify-between items-center mb-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight text-lg">StellarChain</span>
        </Link>
        <div className="flex items-center gap-4">
          <button className="text-white/70 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Glass Search Bar */}
      <div className="relative z-10 px-6">
        <form onSubmit={handleSearch}>
          <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex items-center shadow-2xl">
            <span className="pl-3 pr-2 text-white/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-white placeholder-white/40 focus:ring-0 focus:outline-none flex-1 text-sm py-2 w-full"
              placeholder="Search hash, ledger, account..."
            />
          </div>
        </form>
      </div>

      {/* Inline Stats */}
      <div className="relative z-10 px-8 mt-4 flex gap-6 text-[11px] font-medium tracking-wide uppercase">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-white/50">XLM Price:</span>
          <span className="text-white font-mono">${xlmPrice > 0 ? xlmPrice.toFixed(4) : '...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/50">Fee:</span>
          <span className="text-white font-mono">{(baseFee / 10000000).toFixed(7)} XLM</span>
        </div>
      </div>
    </header>
  );
}
