'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const mainNavItems = [
  { name: 'Home', href: '/', icon: 'home' },
  { name: 'Txns', href: '/transactions', icon: 'arrows' },
  { name: 'Markets', href: '/markets', icon: 'chart' },
];

// Menu structure with categories
interface MenuItem {
  name: string;
  href: string;
  icon: string;
  description: string;
  badge?: string;
}

interface MenuCategory {
  name: string;
  icon: string;
  items?: MenuItem[];
  href?: string; // Direct link (no submenu)
}

const menuCategories: MenuCategory[] = [
  {
    name: 'Blockchain',
    icon: 'blockchain',
    items: [
      { name: 'Ledgers', href: '/ledgers', icon: 'ledger', description: 'Data structures' },
      { name: 'Transactions', href: '/transactions', icon: 'transaction', description: 'Modifies the ledger state' },
      { name: 'Smart Contracts', href: '/contracts', icon: 'contract', description: 'Deployed contracts' },
      { name: 'Liquidity Pools', href: '/liquidity-pools', icon: 'pool', description: 'Assets reserves' },
    ],
  },
  {
    name: 'Accounts',
    icon: 'accounts',
    items: [
      { name: 'Top Accounts', href: '/accounts', icon: 'users', description: 'Ranked by XLM holdings' },
      { name: 'Known Accounts', href: '/known-accounts', icon: 'verified', description: 'Labeled accounts directory' },
    ],
  },
  {
    name: 'Market',
    icon: 'market',
    href: '/markets',
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Blockchain', 'Accounts']);
  const { theme, toggleTheme } = useTheme();

  // Close menu when route changes
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (showMore) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMore]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const getCategoryIcon = (icon: string) => {
    const iconClass = "w-5 h-5";
    switch (icon) {
      case 'blockchain':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        );
      case 'accounts':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'market':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'charts':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      case 'projects':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getItemIcon = (icon: string) => {
    const iconClass = "w-5 h-5";
    switch (icon) {
      case 'ledger':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case 'transaction':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h10" />
          </svg>
        );
      case 'operation':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'contract':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'pool':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'users':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'verified':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'stats':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'graph':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getIcon = (icon: string, active: boolean) => {
    const color = "currentColor";

    switch (icon) {
      case 'home':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'arrows':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );
      case 'chart':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'menu':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
      default:
        return null;
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isMoreActive = menuCategories.some(cat =>
    cat.href ? isActive(cat.href) : cat.items?.some(item => isActive(item.href))
  );

  return (
    <>
      {/* Full Screen Menu */}
      {showMore && (
        <div className="fixed inset-0 bottom-[60px] z-40 md:hidden bg-[var(--bg-primary)] flex flex-col">
          {/* Header matching home page style */}
          <header className="bg-[var(--header-bg)] text-white pt-4 pb-4 px-4 rounded-b-3xl shadow-lg flex-shrink-0">
            <div className="flex items-center justify-between">
              <Link href="/" onClick={() => setShowMore(false)} className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight">StellarChain</span>
              </Link>
            </div>
          </header>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-4 py-4 space-y-2">
              {menuCategories.map((category) => (
                <div key={category.name}>
                  {category.href ? (
                    // Direct link (no submenu)
                    <Link
                      href={category.href}
                      onClick={() => setShowMore(false)}
                      className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${
                        isActive(category.href)
                          ? 'text-[var(--primary-blue)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="text-[var(--primary-blue)]">{getCategoryIcon(category.icon)}</span>
                      <span className="font-medium">{category.name}</span>
                    </Link>
                  ) : (
                    // Collapsible category
                    <>
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="flex items-center gap-3 py-3 px-2 w-full text-left rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <span className="text-[var(--primary-blue)]">{getCategoryIcon(category.icon)}</span>
                        <span className="font-medium">{category.name}</span>
                        <svg
                          className={`w-4 h-4 ml-auto transition-transform ${
                            expandedCategories.includes(category.name) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Submenu items */}
                      {expandedCategories.includes(category.name) && category.items && (
                        <div className="ml-2 bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
                          {category.items.map((item, index) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setShowMore(false)}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                index !== category.items!.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
                              } ${
                                isActive(item.href)
                                  ? 'bg-[var(--bg-tertiary)]'
                                  : 'hover:bg-[var(--bg-tertiary)]'
                              }`}
                            >
                              <span className="text-[var(--primary-blue)]">{getItemIcon(item.icon)}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${
                                    isActive(item.href) ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                                  }`}>
                                    {item.name}
                                  </span>
                                  {item.badge && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#2e7d32] rounded">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">{item.description}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </nav>

            {/* Dark Mode Toggle */}
            <div className="px-4 mt-4">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 py-3 px-4 w-full bg-[var(--bg-secondary)] rounded-xl transition-colors"
              >
                <span className="text-[var(--primary-blue)]">
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </span>
                <span className="font-medium text-[var(--text-secondary)]">Dark Mode</span>
                {/* Toggle Switch */}
                <div className="ml-auto">
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      theme === 'dark' ? 'bg-[var(--primary-blue)]' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 mt-4 pb-4 text-center">
              <span className="text-2xl">❤️</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-[var(--bg-secondary)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] pb-safe pt-1 px-4 z-30 md:hidden safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${active
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] active:text-[var(--text-secondary)]'
                  }`}
              >
                <div className={`w-10 h-7 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : ''}`}>
                  {getIcon(item.icon, active)}
                </div>
                <span className={`text-[11px] ${active ? 'font-semibold text-[var(--text-primary)]' : 'font-medium'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMore(!showMore);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${isMoreActive || showMore
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] active:text-[var(--text-secondary)]'
              }`}
          >
            <div className={`w-10 h-7 flex items-center justify-center rounded-lg transition-colors ${(isMoreActive || showMore) ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : ''}`}>
              {getIcon('menu', isMoreActive || showMore)}
            </div>
            <span className={`text-[11px] ${isMoreActive || showMore ? 'font-semibold text-[var(--text-primary)]' : 'font-medium'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
