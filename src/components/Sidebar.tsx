'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const navItems = [
  { name: 'Today', href: '/', icon: 'calendar', count: null },
  { name: 'Projects', href: '/projects', icon: 'compass', count: null },
  { name: 'Ledgers', href: '/ledgers', icon: 'cube', count: null },
  { name: 'Transactions', href: '/transactions', icon: 'arrows', count: null },
  { name: 'Operations', href: '/operations', icon: 'bolt', count: null },
  { name: 'Accounts', href: '/accounts', icon: 'users', count: null },
  { name: 'Markets', href: '/markets', icon: 'coins', count: null },
  { name: 'Statistics', href: '/statistics', icon: 'chart', count: null },
];

const icons: Record<string, ReactNode> = {
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  compass: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  cube: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  arrows: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  ),
  bolt: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  coins: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Detect search type
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
  };

  return (
    <aside className="sidebar-container w-[240px] min-h-screen flex flex-col sticky top-0 h-screen shrink-0">
      {/* Logo */}
      <div className="p-5 pb-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 holo-border flex items-center justify-center">
            <svg className="w-5 h-5 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-white font-semibold text-sm tracking-tight">Stellar<span className="text-[#BFF549]">Chain</span></span>
            <span className="block text-[9px] text-[#555] tracking-widest uppercase">Explorer</span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <form onSubmit={handleSearch}>
          <div className="search-box relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]">
              {icons.search}
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, tx, ledger..."
              className="w-full bg-transparent py-2 pl-9 pr-3 text-white placeholder-[#444] text-xs focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* Section Label */}
      <div className="px-5 pt-4 pb-2">
        <span className="text-[9px] text-[#444] uppercase tracking-widest font-medium">Navigation</span>
      </div>

      {/* Navigation */}
      <nav className="px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                    ? 'nav-item-active'
                    : 'text-[#666] hover:text-white hover:bg-[#111]'
                    }`}
                >
                  <span className={`transition-colors duration-200 ${isActive ? 'text-[#BFF549]' : ''}`}>
                    {icons[item.icon]}
                  </span>
                  <span className="flex-1 text-xs font-medium">{item.name}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-[#BFF549] rounded-full animate-pulse-soft" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* Footer */}
      <div className="p-4 space-y-1">
        <button className="flex items-center gap-3 px-3 py-2 w-full text-[#555] hover:text-white rounded-lg hover:bg-[#111] transition-all duration-200 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="font-medium">Feedback</span>
        </button>

        <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#111] transition-all duration-200 cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
          <div className="flex items-center gap-3 text-[#555] text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span className="font-medium">Dark Mode</span>
          </div>
          <div
            className={`w-8 h-4 rounded-full transition-colors duration-300 ${darkMode ? 'bg-[#BFF549]' : 'bg-[#333]'
              } relative`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-transform duration-300 ${darkMode ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
          </div>
        </div>

        <button className="flex items-center gap-3 px-3 py-2 w-full text-[#555] hover:text-white rounded-lg hover:bg-[#111] transition-all duration-200 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium">Account</span>
        </button>

        {/* Network Status */}
        <div className="mt-4 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#BFF549] rounded-full animate-pulse-soft" />
            <span className="text-[10px] text-[#444]">Mainnet Connected</span>
          </div>
        </div>

        <div className="pt-3 text-center">
          <span className="text-[10px] text-[#333]">© 2024 StellarChain</span>
        </div>
      </div>
    </aside>
  );
}
