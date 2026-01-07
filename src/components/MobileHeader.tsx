'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function MobileHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();

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
    <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-[var(--text-primary)] font-semibold text-[14px]">
            Stellar<span className="text-[var(--primary)]">Chain</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Theme Toggle - Compact */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-9 h-9 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            {searchOpen ? (
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {searchOpen && (
        <div className="px-4 pb-3 animate-in slide-in-from-top duration-200">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search address, tx, ledger..."
                autoFocus
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded py-2.5 pl-10 pr-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] text-[13px] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-muted)]"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
