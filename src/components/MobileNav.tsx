'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const mainNavItems = [
  { name: 'Home', href: '/', icon: 'home' },
  { name: 'Ledgers', href: '/ledgers', icon: 'cube' },
  { name: 'Txns', href: '/transactions', icon: 'arrows' },
  { name: 'Markets', href: '/markets', icon: 'chart' },
];

const moreItems = [
  { name: 'Operations', href: '/operations', icon: 'bolt' },
  { name: 'Accounts', href: '/accounts', icon: 'users' },
  { name: 'Statistics', href: '/statistics', icon: 'stats' },
  { name: 'Projects', href: '/projects', icon: 'globe' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMore) return;

    const handleClick = () => setShowMore(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showMore]);

  const getIcon = (icon: string, active: boolean) => {
    const color = active ? 'var(--primary)' : 'var(--text-tertiary)';

    switch (icon) {
      case 'home':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'cube':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
      case 'bolt':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'users':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'stats':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'globe':
        return (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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

  const isMoreActive = moreItems.some(item => pathname.startsWith(item.href));

  return (
    <>
      {/* More Menu Popup */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-20 left-4 right-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {moreItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] last:border-0 active:bg-[var(--bg-tertiary)] transition-colors ${
                    active ? 'bg-[var(--bg-tertiary)]' : ''
                  }`}
                  onClick={() => setShowMore(false)}
                >
                  {getIcon(item.icon, active)}
                  <span className={`text-[13px] font-medium ${active ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                    {item.name}
                  </span>
                  {active && (
                    <span className="ml-auto live-indicator" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active ? 'text-[var(--primary)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                {getIcon(item.icon, active)}
                <span className={`text-[10px] mt-1 font-medium ${active ? 'text-[var(--primary)]' : 'text-[var(--text-tertiary)]'}`}>
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
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isMoreActive || showMore ? 'text-[var(--primary)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            {getIcon('menu', isMoreActive || showMore)}
            <span className={`text-[10px] mt-1 font-medium ${isMoreActive || showMore ? 'text-[var(--primary)]' : 'text-[var(--text-tertiary)]'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
