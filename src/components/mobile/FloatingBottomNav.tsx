'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { shortenAddress } from '@/lib/stellar';
import DonationModal from '@/components/DonationModal';

const navItemsLeft = [
  { name: 'Home', href: '/', icon: 'home' },
  { name: 'News', href: '/news', icon: 'news' },
];

const navItemsRight = [
  { name: 'Markets', href: '/markets', icon: 'markets' },
];

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  description: string;
}

interface MenuCategory {
  name: string;
  icon: string;
  items?: MenuItem[];
  href?: string;
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
];

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  txns: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  ),
  news: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  markets: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  more: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  sun: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  moon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
};

const categoryIcons: Record<string, React.ReactNode> = {
  blockchain: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  accounts: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
};

const itemIcons: Record<string, React.ReactNode> = {
  ledger: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  transaction: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  contract: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  pool: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  verified: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
};

export default function FloatingBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Blockchain', 'Accounts']);
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { favorites } = useFavorites();
  const [showFavoritesList, setShowFavoritesList] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);

  // Only render after mounting to avoid SSR issues with Framer Motion
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMoreOpen(false);
    setShowFavoritesList(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreOpen]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Don't render until mounted to avoid SSR issues with Framer Motion
  if (!mounted) return null;

  return (
    <>
      {/* Full Screen Menu */}
      <AnimatePresence>
        {isMoreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bottom-[76px] z-40 md:hidden bg-[var(--bg-primary)] flex flex-col"
          >
            {/* Header */}
            <header className="bg-[var(--header-bg)] text-white pt-6 pb-4 px-4 rounded-b-3xl shadow-lg flex-shrink-0">
              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setIsMoreOpen(false)}>
                  <Image
                    src="/bunn.png"
                    alt="StellarChain Explorer"
                    width={200}
                    height={42}
                    className="h-10 w-auto"
                  />
                </Link>
              </div>
            </header>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto">
              <nav className="px-4 py-4 space-y-2">
                {menuCategories.map((category) => (
                  <div key={category.name}>
                    {category.href ? (
                      <Link
                        href={category.href}
                        onClick={() => setIsMoreOpen(false)}
                        className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${isActive(category.href)
                          ? 'text-[var(--primary-blue)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                        <span className="text-[var(--primary-blue)]">{categoryIcons[category.icon]}</span>
                        <span className="font-medium">{category.name}</span>
                      </Link>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleCategory(category.name)}
                          className="flex items-center gap-3 py-3 px-2 w-full text-left rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <span className="text-[var(--primary-blue)]">{categoryIcons[category.icon]}</span>
                          <span className="font-medium">{category.name}</span>
                          <svg
                            className={`w-4 h-4 ml-auto transition-transform ${expandedCategories.includes(category.name) ? 'rotate-180' : ''
                              }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {expandedCategories.includes(category.name) && category.items && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ml-2 bg-[var(--bg-secondary)] rounded-xl overflow-hidden"
                          >
                            {category.items.map((item, index) => (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMoreOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 transition-colors ${index !== category.items!.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
                                  } ${isActive(item.href)
                                    ? 'bg-[var(--bg-tertiary)]'
                                    : 'hover:bg-[var(--bg-tertiary)]'
                                  }`}
                              >
                                <span className="text-[var(--primary-blue)]">{itemIcons[item.icon]}</span>
                                <div className="flex-1">
                                  <span className={`font-medium ${isActive(item.href) ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                                    }`}>
                                    {item.name}
                                  </span>
                                  <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                                </div>
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </nav>

              {/* Settings Section */}
              <div className="px-4 mt-6 space-y-2">
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 py-3 px-4 w-full bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]"
                >
                  <span className="text-[var(--primary-blue)]">
                    {theme === 'dark' ? icons.moon : icons.sun}
                  </span>
                  <span className="font-medium text-[var(--text-secondary)]">Dark Mode</span>
                  <div className="ml-auto">
                    <div
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-[var(--primary-blue)]' : 'bg-[var(--bg-tertiary)]'}`}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md ${theme === 'dark' ? 'left-6' : 'left-1'}`}
                      />
                    </div>
                  </div>
                </button>

                {/* Donate Button */}
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    setShowDonationModal(true);
                  }}
                  className="flex items-center gap-3 py-3 px-4 w-full bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]"
                >
                  <span className="text-[var(--primary-blue)]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </span>
                  <span className="font-medium text-[var(--text-secondary)]">Support the Project</span>
                </button>
              </div>

              {/* Footer */}
              <div className="px-4 mt-8 pb-8 text-center">
                <span className="text-2xl">❤️</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Nav Bar */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:hidden safe-area-bottom"
      >
        <div
          className="flex items-center justify-around h-16 rounded-3xl"
          style={{
            background: theme === 'dark'
              ? 'rgba(22, 30, 41, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: theme === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: theme === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          }}
        >
          {/* Left nav items: Home, News */}
          {navItemsLeft.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMoreOpen(false)}
              className="flex flex-col items-center justify-center flex-1 h-full"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`transition-colors duration-200 ${isActive(item.href)
                    ? 'text-[var(--primary-blue)]'
                    : 'text-[var(--text-muted)]'
                    }`}
                >
                  {icons[item.icon]}
                </span>
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${isActive(item.href)
                    ? 'text-[var(--primary-blue)]'
                    : 'text-[var(--text-muted)]'
                    }`}
                >
                  {item.name}
                </span>
              </motion.div>
            </Link>
          ))}

          {/* Favorites Button - CENTER - only show if there are favorites */}
          {favorites.length > 0 && (
            <div className="relative flex flex-col items-center justify-center flex-1 h-full">
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={() => {
                  setIsMoreOpen(false);
                  if (favorites.length === 1) {
                    router.push(`/account/${favorites[0].address}`);
                  } else {
                    setShowFavoritesList(!showFavoritesList);
                  }
                }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-amber-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </span>
                <span className="text-[10px] font-medium text-amber-500">
                  Watchlist
                </span>
              </motion.button>

              {/* Favorites Dropdown - for 2-3 favorites */}
              <AnimatePresence>
                {showFavoritesList && favorites.length > 1 && favorites.length <= 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[200px] rounded-xl shadow-xl overflow-hidden"
                    style={{
                      background: theme === 'dark'
                        ? 'rgba(22, 30, 41, 0.98)'
                        : 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: theme === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Favorites</span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {favorites.map((fav) => (
                        <Link
                          key={fav.address}
                          href={`/account/${fav.address}`}
                          onClick={() => setShowFavoritesList(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${pathname === `/account/${fav.address}`
                            ? 'bg-amber-500/10'
                            : 'hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {fav.label || 'Unnamed'}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)]">
                              {shortenAddress(fav.address, 4)}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Favorites Modal - for 4+ favorites */}
          <AnimatePresence>
            {showFavoritesList && favorites.length > 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bottom-20 z-40 flex items-end justify-center"
                onClick={() => setShowFavoritesList(false)}
              >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/40" />

                {/* Modal */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="relative w-full max-w-lg mx-4 mb-4 rounded-2xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-default)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className="font-semibold text-[var(--text-primary)]">Watchlist</span>
                      <span className="text-xs text-[var(--text-muted)]">({favorites.length})</span>
                    </div>
                    <button
                      onClick={() => setShowFavoritesList(false)}
                      className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* List */}
                  <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
                    {(() => {
                      const bgColors = ['bg-blue-500/10', 'bg-purple-500/10', 'bg-emerald-500/10', 'bg-orange-500/10', 'bg-pink-500/10', 'bg-indigo-500/10'];
                      const textColors = ['text-blue-500', 'text-purple-500', 'text-emerald-500', 'text-orange-500', 'text-pink-500', 'text-indigo-500'];

                      return favorites.map((fav) => {
                        const colorIdx = (fav.label || fav.address).length % bgColors.length;
                        const initials = (fav.label || 'UN').substring(0, 2).toUpperCase();

                        return (
                          <Link
                            key={fav.address}
                            href={`/account/${fav.address}`}
                            onClick={() => setShowFavoritesList(false)}
                            className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                          >
                            <div className={`w-10 h-10 rounded-full ${bgColors[colorIdx]} flex items-center justify-center`}>
                              <span className={`text-sm font-bold ${textColors[colorIdx]}`}>{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                {fav.label || 'Unnamed'}
                              </div>
                              <div className="text-xs font-mono text-[var(--text-muted)]">
                                {shortenAddress(fav.address, 6)}
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        );
                      });
                    })()}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right nav items: Markets */}
          {navItemsRight.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMoreOpen(false)}
              className="flex flex-col items-center justify-center flex-1 h-full"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`transition-colors duration-200 ${isActive(item.href)
                    ? 'text-[var(--primary-blue)]'
                    : 'text-[var(--text-muted)]'
                    }`}
                >
                  {icons[item.icon]}
                </span>
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${isActive(item.href)
                    ? 'text-[var(--primary-blue)]'
                    : 'text-[var(--text-muted)]'
                    }`}
                >
                  {item.name}
                </span>
              </motion.div>
            </Link>
          ))}

          {/* More Button */}
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="flex flex-col items-center gap-1"
            >
              <motion.span
                animate={{ rotate: isMoreOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className={`transition-colors duration-200 ${isMoreOpen
                  ? 'text-[var(--primary-blue)]'
                  : 'text-[var(--text-muted)]'
                  }`}
              >
                {isMoreOpen ? icons.close : icons.more}
              </motion.span>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${isMoreOpen
                  ? 'text-[var(--primary-blue)]'
                  : 'text-[var(--text-muted)]'
                  }`}
              >
                More
              </span>
            </motion.div>
          </button>
        </div>
      </motion.nav>

      {/* Donation Modal */}
      <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} />
    </>
  );
}
