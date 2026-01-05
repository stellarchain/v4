'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (query.length === 56 && query.startsWith('G')) {
      window.location.href = `/account/${query}`;
    } else if (query.length === 64) {
      window.location.href = `/transaction/${query}`;
    } else if (/^\d+$/.test(query)) {
      window.location.href = `/ledger/${query}`;
    } else {
      window.location.href = `/account/${query}`;
    }
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm border-b border-[#1a1a1a] md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#BFF549]/20 to-[#BFF549]/5 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">
            Stellar<span className="text-[#BFF549]">Chain</span>
          </span>
        </Link>

        {/* Search Toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#111] transition-colors"
        >
          {searchOpen ? (
            <svg className="w-5 h-5 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Search Panel */}
      {searchOpen && (
        <div className="px-4 pb-3 animate-in slide-in-from-top duration-200">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search address, tx, ledger..."
                autoFocus
                className="w-full bg-[#111] border border-[#222] rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-[#444] text-sm focus:outline-none focus:border-[#333]"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
