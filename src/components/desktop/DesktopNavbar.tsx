'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useNetwork, NETWORK_CONFIGS, NetworkType } from '@/contexts/NetworkContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { shortenAddress } from '@/lib/stellar';
import DonationModal from '@/components/DonationModal';

interface MenuItem {
    name: string;
    href: string;
    description?: string;
}

interface NavDropdown {
    name: string;
    items: MenuItem[];
}

export default function DesktopNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { network, setNetwork, networkConfig, isChangingNetwork } = useNetwork();
    const { favorites } = useFavorites();
    const isMainnet = network === 'mainnet';

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
    const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
    const [showDonationModal, setShowDonationModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<HTMLDivElement>(null);
    const favoritesRef = useRef<HTMLDivElement>(null);

    // Navigation structure
    const blockchainItems: MenuItem[] = [
        { name: 'Ledgers', href: '/ledgers', description: 'Browse ledger history' },
        { name: 'Transactions', href: '/transactions', description: 'View all transactions' },
        ...(isMainnet ? [
            { name: 'Smart Contracts', href: '/contracts', description: 'Deployed Soroban contracts' },
            { name: 'Liquidity Pools', href: '/liquidity-pools', description: 'DEX liquidity reserves' },
        ] : []),
    ];

    const accountsItems: MenuItem[] = isMainnet ? [
        { name: 'Top Accounts', href: '/accounts', description: 'Ranked by XLM holdings' },
        { name: 'Known Accounts', href: '/known-accounts', description: 'Labeled accounts directory' },
    ] : [];

    const navItems = [
        { name: 'Home', href: '/' },
        { name: 'Blockchain', dropdown: blockchainItems },
        ...(isMainnet ? [{ name: 'Accounts', dropdown: accountsItems }] : []),
        { name: 'Markets', href: '/markets' },
        { name: 'News', href: '/news' },
    ];

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
            if (networkRef.current && !networkRef.current.contains(event.target as Node)) {
                setShowNetworkDropdown(false);
            }
            if (favoritesRef.current && !favoritesRef.current.contains(event.target as Node)) {
                setShowFavoritesDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on route change
    useEffect(() => {
        setOpenDropdown(null);
        setShowFavoritesDropdown(false);
    }, [pathname]);

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    const isDropdownActive = (items: MenuItem[]) => {
        return items.some(item => isActive(item.href));
    };

    return (
        <>
            <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-[1400px] mx-auto px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/stellarchain-logo.svg"
                                alt="StellarChain Explorer"
                                width={180}
                                height={40}
                                className="h-9 w-auto brightness-0"
                                priority
                            />
                        </Link>

                        {/* Navigation Links */}
                        <div className="flex items-center gap-1" ref={dropdownRef}>
                            {navItems.map((item) => {
                                if ('dropdown' in item && item.dropdown) {
                                    const isOpen = openDropdown === item.name;
                                    const active = isDropdownActive(item.dropdown);

                                    return (
                                        <div key={item.name} className="relative">
                                            <button
                                                onClick={() => setOpenDropdown(isOpen ? null : item.name)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${active
                                                    ? 'text-slate-900 bg-slate-100'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {item.name}
                                                <svg
                                                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {/* Dropdown Menu */}
                                            {isOpen && (
                                                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                                                    {item.dropdown.map((subItem) => (
                                                        <Link
                                                            key={subItem.href}
                                                            href={subItem.href}
                                                            className={`flex flex-col px-4 py-2.5 transition-colors ${isActive(subItem.href)
                                                                ? 'bg-blue-50 text-blue-600'
                                                                : 'hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            <span className={`text-sm font-medium ${isActive(subItem.href) ? 'text-blue-600' : 'text-slate-900'}`}>
                                                                {subItem.name}
                                                            </span>
                                                            {subItem.description && (
                                                                <span className="text-xs text-slate-500">{subItem.description}</span>
                                                            )}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href!}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href!)
                                            ? 'text-slate-900 bg-slate-100'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                    >
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            {/* Favorites/Watchlist */}
                            {favorites.length > 0 && (
                                <div className="relative" ref={favoritesRef}>
                                    <button
                                        onClick={() => {
                                            if (favorites.length === 1) {
                                                router.push(`/account/${favorites[0].address}`);
                                            } else {
                                                setShowFavoritesDropdown(!showFavoritesDropdown);
                                            }
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                        <span>Watchlist</span>
                                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                            {favorites.length}
                                        </span>
                                        {favorites.length > 1 && (
                                            <svg
                                                className={`w-4 h-4 transition-transform ${showFavoritesDropdown ? 'rotate-180' : ''}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {showFavoritesDropdown && favorites.length > 1 && (
                                        <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                                            <div className="px-4 py-2 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                    </svg>
                                                    <span className="text-sm font-semibold text-slate-700">Watchlist</span>
                                                    <span className="text-xs text-slate-500">({favorites.length} accounts)</span>
                                                </div>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto">
                                                {favorites.map((fav, idx) => {
                                                    const bgColors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
                                                    const colorIdx = (fav.label || fav.address).length % bgColors.length;
                                                    const initials = (fav.label || 'UN').substring(0, 2).toUpperCase();

                                                    return (
                                                        <Link
                                                            key={fav.address}
                                                            href={`/account/${fav.address}`}
                                                            onClick={() => setShowFavoritesDropdown(false)}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                                                        >
                                                            <div className={`w-8 h-8 rounded-full ${bgColors[colorIdx]} flex items-center justify-center text-white text-xs font-bold`}>
                                                                {initials}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-slate-900 truncate">
                                                                    {fav.label || 'Unnamed Account'}
                                                                </div>
                                                                <div className="text-xs font-mono text-slate-500 truncate">
                                                                    {shortenAddress(fav.address, 6)}
                                                                </div>
                                                            </div>
                                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Divider - only show if favorites exist */}
                            {favorites.length > 0 && <div className="h-5 w-px bg-slate-200"></div>}

                            {/* Network Selector */}
                            <div className="relative" ref={networkRef}>
                                <button
                                    onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                                    disabled={isChangingNetwork}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: networkConfig.color }}
                                    />
                                    <span>{networkConfig.displayName}</span>
                                    <svg
                                        className={`w-4 h-4 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showNetworkDropdown && (
                                    <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                                        {(['mainnet', 'testnet', 'futurenet'] as NetworkType[]).map((net) => {
                                            const config = NETWORK_CONFIGS[net];
                                            const isActive = net === network;
                                            return (
                                                <button
                                                    key={net}
                                                    onClick={() => {
                                                        if (net !== network) setNetwork(net);
                                                        setShowNetworkDropdown(false);
                                                    }}
                                                    className={`flex items-center gap-3 w-full px-4 py-2 text-left transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                                >
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: config.color }}
                                                    />
                                                    <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>
                                                        {config.displayName}
                                                    </span>
                                                    {isActive && (
                                                        <svg className="w-4 h-4 ml-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="h-5 w-px bg-slate-200"></div>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {theme === 'dark' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </button>

                            {/* Donate Button */}
                            <button
                                onClick={() => setShowDonationModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all shadow-sm hover:shadow-md"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                Donate
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Donation Modal */}
            <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} />
        </>
    );
}
