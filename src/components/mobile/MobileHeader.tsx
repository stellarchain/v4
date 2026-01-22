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
  if (pathname?.startsWith('/asset/')) return null;
  if (pathname?.startsWith('/transaction/')) return null;

  // Simplified Header for non-homepage
  if (!isHomePage) {
    return (
      <header className="bg-[#050b20] text-white pt-8 pb-5 px-4 rounded-b-3xl shadow-lg relative z-10 md:hidden">
        {/* Top: Logo & Icons */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">StellarChain</span>
          </Link>
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050b20]"></span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
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
      </header>
    );
  }

  // Full Header for Homepage
  return (
    <header className="bg-[#050b20] text-white pt-6 pb-6 px-4 rounded-b-3xl shadow-lg relative z-10 md:hidden">
      {/* Top Bar: Logo & Icons */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">StellarChain</span>
        </Link>
        <div className="flex items-center space-x-3">
          {/* Chart/Analytics Icon */}
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </button>
          {/* Notification Bell with Red Dot */}
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050b20]"></span>
          </button>
        </div>
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
      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 uppercase tracking-widest font-bold">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>XLM: <span className="text-white ml-0.5">${xlmPrice > 0 ? xlmPrice.toFixed(4) : '0.0000'}</span></span>
        </div>
        <div>
          <span>Network Fee: <span className="text-white ml-0.5">{(baseFee / 10000000).toFixed(5)} XLM</span></span>
        </div>
      </div>
    </header>
  );
}
