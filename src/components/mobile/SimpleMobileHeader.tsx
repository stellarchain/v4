'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SimpleMobileHeader() {
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <header className="relative bg-[#020617] py-3 px-4 md:hidden">
      <div className="flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight text-base">StellarChain</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-1.5 flex items-center">
            <span className="text-white/50 mr-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-white placeholder-white/40 focus:ring-0 focus:outline-none flex-1 text-sm py-1 w-full"
              placeholder="Search..."
            />
          </div>
        </form>
      </div>
    </header>
  );
}
