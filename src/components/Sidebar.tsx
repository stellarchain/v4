'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Network Explorer', href: '/', icon: 'explore' },
  { name: 'Smart Contracts', href: '/contracts', icon: 'contract' },
  { name: 'Wallet Tracker', href: '/graph', icon: 'account_balance_wallet' },
];

// Inline icons to match the design style (Material Symbols look-alike)
const icons: Record<string, React.ReactNode> = {
  analytics: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
  ),
  explore: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg> // Network Explorer icon
  ),
  account_balance_wallet: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
  ),
  contract: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
  )
};

export default function Sidebar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

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
    <aside className="w-64 bg-[#0A111E] flex flex-col flex-shrink-0 h-screen border-r border-[#1E293B] shadow-2xl transition-all font-sans sticky top-0">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-3 mb-2 group">
          <div className="w-9 h-9 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg flex items-center justify-center text-[#10b981]">
            {icons.analytics}
          </div>
          <div>
            <h1 className="font-sans font-bold text-sm text-[#F8FAFC] tracking-wider uppercase">STELLARCHAIN</h1>
            <p className="text-[10px] text-[#94A3B8] font-mono tracking-[0.15em]">Blockchain Explorer</p>
          </div>
        </Link>

        {/* Divider */}
        <div className="h-px w-full bg-[#1E293B] my-6"></div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
            {icons.search}
          </span>
          <input
            className="w-full py-2 pl-10 pr-3 text-xs font-mono rounded-md border border-[#1E293B] bg-[#141C2B] text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:ring-1 focus:ring-[#10b981]/50 focus:border-[#10b981]/50 outline-none transition-all"
            placeholder="0x_address_or_hash"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <div className="px-4 mb-3 mt-2 text-[10px] font-bold text-[#94A3B8]/60 uppercase tracking-[0.2em] font-sans">System Hub</div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2.5 text-sm font-sans font-medium rounded-md transition-all group tracking-wide ${isActive
                ? 'bg-white/5 border-l-2 border-[#10b981] text-[#F8FAFC]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
                }`}
            >
              <span className={`mr-3 opacity-70 group-hover:opacity-100 ${isActive ? 'text-[#10b981]' : ''}`}>
                {icons[item.icon]}
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 bg-[#141C2B]/40 border-t border-[#1E293B]">
        {/* Network Status */}
        <div className="bg-[#0A111E] border border-[#1E293B] rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]"></div>
            <span className="text-[10px] font-mono text-[#F8FAFC] uppercase tracking-widest">Mainnet_01</span>
          </div>
          <span className="text-[9px] font-mono font-bold text-[#10b981]">SYNCHRONIZED</span>
        </div>
      </div>
    </aside>
  );
}
