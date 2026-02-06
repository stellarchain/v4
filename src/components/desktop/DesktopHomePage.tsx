'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Ledger, NetworkStats, Transaction, formatXLM, shortenAddress, timeAgo, Operation, getBaseUrl } from '@/lib/stellar';
import InfoTooltip from '../InfoTooltip';
import TransactionFlowAnimation from './TransactionFlowAnimation';
import { getOperationColors } from '@/lib/design-system';
import { getRouteFromSearchQuery } from '@/lib/searchRouting';
import GliderTabs from '@/components/ui/GliderTabs';
import { assetRoute } from '@/lib/routes';

interface XLMMarketData {
    price: number;
    priceChange24h: number;
    marketCap: number;
    marketCapChange24h: number;
    volume24h: number;
    circulatingSupply: number;
    totalSupply: number;
    dominance: number;
    rank: number;
    sparkline: number[];
    burnedLumens: number;
    sdfMandate: number;
    feePool: number;
    upgradeReserve: number;
}

interface DesktopHomePageProps {
    stats: NetworkStats;
    initialTransactions: Transaction[];
    initialLedgers: Ledger[];
    initialOperations: Operation[];
    xlmVolume: number;
    xlmMarketData: XLMMarketData;
}

export default function DesktopHomePage({
    stats,
    initialTransactions,
    initialLedgers,
    initialOperations,
    xlmVolume,
    xlmMarketData
}: DesktopHomePageProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [liveStats, setLiveStats] = useState(stats);
    const [liveLedgers, setLiveLedgers] = useState<Ledger[]>(initialLedgers);
    const [operations, setOperations] = useState<Operation[]>(initialOperations);
    const [activeTab, setActiveTab] = useState('All Activity');
    const [ledgerProgress, setLedgerProgress] = useState(0);
    const ledgerCountRef = useRef<HTMLDivElement>(null);
    const tpsRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Ledger progress animation - resets every ~5 seconds (avg ledger time)
    useEffect(() => {
        setLedgerProgress(0);
        const duration = 5000; // 5 seconds
        const interval = 50; // Update every 50ms
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = Math.min((currentStep / steps) * 100, 100);
            setLedgerProgress(progress);

            if (currentStep >= steps) {
                currentStep = 0;
                setLedgerProgress(0);
            }
        }, interval);

        return () => clearInterval(timer);
    }, [liveStats.ledger_count]);

    // Helper to format token amounts
    const formatTokenAmount = (amount: string | number) => {
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (value === 0) return '0';
        if (value < 0.001) return '< 0.001';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
    };

    // Filter operations based on active tab with better diversity
    const filteredOperations = (() => {
        const MIN_ITEMS = 11;

        if (activeTab === 'Swaps') {
            return operations.filter(op =>
                op.type.includes('swap') || op.type.includes('offer') || op.type.includes('path_payment')
            );
        } else if (activeTab === 'Smart Contracts') {
            return operations.filter(op =>
                op.type === 'invoke_host_function' || op.type === 'bump_sequence' || op.type === 'restore_footprint'
            );
        } else if (activeTab === 'Payments') {
            return operations.filter(op =>
                op.type === 'payment' || op.type === 'create_account' || op.type === 'account_merge'
            );
        } else {
            // For "All Activity", show variety but ensure at least MIN_ITEMS
            const contractOps = operations.filter(op => op.type === 'invoke_host_function').slice(0, 3);
            const paymentOps = operations.filter(op => op.type === 'payment').slice(0, 3);
            const createAccountOps = operations.filter(op => op.type === 'create_account').slice(0, 3);
            const swapOps = operations.filter(op => op.type.includes('path_payment')).slice(0, 3);
            const dexOps = operations.filter(op => op.type.includes('offer')).slice(0, 3);
            const trustOps = operations.filter(op => op.type === 'change_trust').slice(0, 3);
            const settingsOps = operations.filter(op => op.type === 'set_options').slice(0, 2);
            const otherOps = operations.filter(op =>
                !['invoke_host_function', 'payment', 'create_account', 'change_trust', 'set_options'].includes(op.type) &&
                !op.type.includes('path_payment') && !op.type.includes('offer')
            ).slice(0, 2);

            // Combine unique operations
            const varietyOps = [...paymentOps, ...swapOps, ...createAccountOps, ...dexOps, ...trustOps, ...contractOps, ...settingsOps, ...otherOps];
            const varietyIds = new Set(varietyOps.map(op => op.id));

            // If we don't have enough variety, fill with latest operations
            if (varietyOps.length < MIN_ITEMS) {
                const remaining = operations
                    .filter(op => !varietyIds.has(op.id))
                    .slice(0, MIN_ITEMS - varietyOps.length);
                return [...varietyOps, ...remaining]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }

            return varietyOps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
    })();

    // Poll for latest stats AND operations based on active tab
    useEffect(() => {
        const dedupeById = (items: Operation[]) => {
            const seen = new Set<string>();
            const out: Operation[] = [];
            for (const item of items) {
                if (seen.has(item.id)) continue;
                seen.add(item.id);
                out.push(item);
            }
            return out;
        };

        const fetchStats = async () => {
            try {
                const ledgersRes = await fetch(`${getBaseUrl()}/ledgers?limit=8&order=desc`);
                const ledgersData = await ledgersRes.json();
                const records: Ledger[] = ledgersData._embedded.records;
                const latest = records[0];

                if (latest.sequence > liveStats.ledger_count) {
                    setLiveStats(prev => ({
                        ...prev,
                        ledger_count: latest.sequence,
                        latest_ledger: latest,
                    }));

                    if (ledgerCountRef.current) gsap.fromTo(ledgerCountRef.current, { scale: 1.1 }, { scale: 1, duration: 0.5, ease: 'power2.out' });
                    if (tpsRef.current) gsap.fromTo(tpsRef.current, { scale: 1.1 }, { scale: 1, duration: 0.5, ease: 'power2.out' });
                }

                setLiveLedgers(records);
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };

        const fetchInitialData = async () => {
            try {
                if (activeTab === 'All Activity') {
                    // Fetch both operations and payments for variety
                    const [opsRes, paymentsRes] = await Promise.all([
                        fetch(`${getBaseUrl()}/operations?limit=200&order=desc&include_failed=true`),
                        fetch(`${getBaseUrl()}/payments?limit=20&order=desc`)
                    ]);
                    const opsData = await opsRes.json();
                    const paymentsData = await paymentsRes.json();

                    const ops: Operation[] = opsData._embedded?.records || [];
                    const payments: Operation[] = paymentsData._embedded?.records || [];

                    // Merge and dedupe
                    const opIds = new Set(ops.map(op => op.id));
                    const uniquePayments = payments.filter(p => !opIds.has(p.id));
                    const merged = [...ops, ...uniquePayments].sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                    setOperations(dedupeById(merged));
                } else if (activeTab === 'Payments') {
                    const res = await fetch(`${getBaseUrl()}/payments?limit=50&order=desc`);
                    const data = await res.json();
                    if (data._embedded?.records) setOperations(dedupeById(data._embedded.records));
                } else if (activeTab === 'Swaps') {
                    // Fetch more operations to find swaps (they're less common)
                    const res = await fetch(`${getBaseUrl()}/operations?limit=200&order=desc&include_failed=false`);
                    const data = await res.json();
                    if (data._embedded?.records) {
                        // Filter for swap operations
                        const swaps = data._embedded.records.filter((op: Operation) =>
                            op.type.includes('path_payment') || op.type.includes('offer')
                        );
                        setOperations(dedupeById(swaps.length > 0 ? swaps : data._embedded.records));
                    }
                } else {
                    // Smart Contracts tab
                    const res = await fetch(`${getBaseUrl()}/operations?limit=100&order=desc&include_failed=false`);
                    const data = await res.json();
                    if (data._embedded?.records) setOperations(dedupeById(data._embedded.records));
                }
            } catch (e) {
                console.error('Failed to fetch initial tab data', e);
            }
        };

        const pollData = async () => {
            await fetchStats();

            try {
                if (activeTab === 'All Activity') {
                    // Poll both for variety
                    const [opsRes, paymentsRes] = await Promise.all([
                        fetch(`${getBaseUrl()}/operations?limit=200&order=desc&include_failed=true`),
                        fetch(`${getBaseUrl()}/payments?limit=10&order=desc`)
                    ]);
                    const opsData = await opsRes.json();
                    const paymentsData = await paymentsRes.json();

                    const newOps: Operation[] = opsData._embedded?.records || [];
                    const newPayments: Operation[] = paymentsData._embedded?.records || [];

                    setOperations(prevOps => {
                        const seen = new Set(prevOps.map(op => op.id));
                        const uniqueOps = newOps.filter(op => {
                            if (seen.has(op.id)) return false;
                            seen.add(op.id);
                            return true;
                        });
                        const uniquePayments = newPayments.filter(p => {
                            if (seen.has(p.id)) return false;
                            seen.add(p.id);
                            return true;
                        });
                        const allNew = [...uniqueOps, ...uniquePayments];

                        if (allNew.length > 0) {
                            return dedupeById([...allNew, ...prevOps]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .slice(0, 500));
                        }
                        return prevOps;
                    });
                } else {
                    const url = activeTab === 'Payments'
                        ? `${getBaseUrl()}/payments?limit=10&order=desc`
                        : `${getBaseUrl()}/operations?limit=10&order=desc&include_failed=false`;
                    const res = await fetch(url);
                    const data = await res.json();
                    const newOps: Operation[] = data._embedded?.records || [];

                    setOperations(prevOps => {
                        const existingIds = new Set(prevOps.map(op => op.id));
                        const uniqueNewOps = newOps.filter(op => !existingIds.has(op.id));

                        if (uniqueNewOps.length > 0) {
                            return dedupeById([...uniqueNewOps, ...prevOps]).slice(0, 500);
                        }
                        return prevOps;
                    });
                }
            } catch (e) {
                console.error('Failed to poll data', e);
            }
        };

        if (activeTab === 'Payments' || activeTab !== 'All Activity') {
            fetchInitialData();
        } else if (activeTab === 'All Activity' && operations !== initialOperations) {
            fetchInitialData();
        }

        const interval = setInterval(pollData, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const route = getRouteFromSearchQuery(searchQuery);
        if (!route) return;
        router.push(route);
    };

    const formattedVolume = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(xlmMarketData.volume24h || xlmVolume);

    const txCount = liveStats.latest_ledger.successful_transaction_count + liveStats.latest_ledger.failed_transaction_count;
    const tps = (txCount / 5).toFixed(2);

    // Use CoinGecko data for accurate market stats
    const xlmPrice = xlmMarketData.price;
    const marketCap = xlmMarketData.marketCap;
    const marketCapChange = xlmMarketData.marketCapChange24h;
    const priceChange24h = xlmMarketData.priceChange24h;
    const circulatingSupply = xlmMarketData.circulatingSupply;
    const totalSupply = xlmMarketData.totalSupply;
    const dominance = xlmMarketData.dominance;
    const sparklineData = xlmMarketData.sparkline;

    const getOpStyle = (typePath: string) => {
        const type = String(typePath);
        const colors = getOperationColors(type);
        if (type === 'payment' || type === 'create_account') return { color: colors.text, bg: colors.bg, label: 'PAYMENT' };
        if (type.includes('offer') || type.includes('swap') || type === 'path_payment_strict_send' || type === 'path_payment_strict_receive') return { color: colors.text, bg: colors.bg, label: 'SWAP' };
        if (type === 'invoke_host_function' || type.toLowerCase().includes('invokecontract') || type.toLowerCase().includes('hostfunction')) return { color: colors.text, bg: colors.bg, label: 'CONTRACT CALL' };
        if (type === 'change_trust') return { color: colors.text, bg: colors.bg, label: 'TRUSTLINE' };
        return { color: 'text-[var(--text-primary)]', bg: 'bg-[var(--bg-tertiary)]', label: type.replace(/_/g, ' ').toUpperCase() };
    };

    const decodeContractFunctionName = (op: Operation): string => {
        try {
            const parameters = (op as any).parameters as Array<{ type: string; value: string }> | undefined;
            if (!parameters) return 'Contract Call';

            const symParam = parameters.find(p => p.type === 'Sym');
            if (!symParam) return 'Contract Call';

            const decoded = atob(symParam.value);
            const functionName = decoded.replace(/[^\x20-\x7E]/g, '').trim();

            if (!functionName || functionName.includes('HostFunctionType')) return 'Contract Call';

            return functionName;
        } catch {
            return 'Contract Call';
        }
    };

    // Trending tokens data
    const trendingTokens = [
        { symbol: 'XLM', logo: 'https://stellar.org/favicon.ico', fallbackColor: 'bg-[var(--text-primary)]', href: assetRoute('XLM', null) },
        { symbol: 'USDC', logo: 'https://www.centre.io/images/usdc/usdc-icon-86074d9d49.png', fallbackColor: 'bg-[var(--info)]', href: assetRoute('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN') },
        { symbol: 'yXLM', logo: null, fallbackColor: 'bg-[var(--indigo)]', href: assetRoute('yXLM', 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55') },
        { symbol: 'AQUA', logo: 'https://aqua.network/assets/img/aqua-logo.png', fallbackColor: 'bg-[var(--purple)]', href: assetRoute('AQUA', 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA') },
    ];

    // Track failed images
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Hero Section */}
            <section className="relative pt-16 pb-20 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-[var(--info-muted)] rounded-full filter blur-3xl opacity-60 animate-pulse"></div>
                    <div className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-[var(--indigo-muted)] rounded-full filter blur-3xl opacity-60"></div>
                </div>

                <div className="max-w-[1400px] mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold mb-4 text-[var(--text-primary)] tracking-tight leading-tight">
                        Blockchain Explorer
                    </h1>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto relative mb-4 group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--info)] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <form onSubmit={handleSearch}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-4 pl-14 pr-16 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-2xl shadow-xl focus:outline-none focus:border-[var(--info)] focus:ring-0 text-lg text-[var(--text-secondary)] placeholder-[var(--text-muted)] transition"
                                placeholder="Search anything on Stellar"
                            />
                        </form>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <span className="bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] px-3 py-1 rounded-lg text-sm font-bold border border-[var(--border-default)] shadow-sm">/</span>
                        </div>
                    </div>

                    {/* Trending Tokens */}
                    <div className="flex flex-wrap justify-center items-center gap-3 text-sm font-medium">
                        <span className="text-[var(--text-tertiary)] mr-2">Trending:</span>
                        {trendingTokens.map((token) => (
                            <Link
                                key={token.symbol}
                                href={token.href}
                                className="group flex items-center bg-[var(--bg-secondary)] hover:border-[var(--info)]/30 px-3 py-1.5 rounded-full shadow-sm border border-[var(--border-default)] transition"
                            >
                                <div className="w-5 h-5 rounded-full overflow-hidden mr-2 group-hover:scale-110 transition flex-shrink-0">
                                    {token.logo && !failedImages.has(token.symbol) ? (
                                        <Image
                                            src={token.logo}
                                            alt={token.symbol}
                                            width={20}
                                            height={20}
                                            className="w-full h-full object-cover"
                                            unoptimized
                                            onError={() => setFailedImages(prev => new Set(prev).add(token.symbol))}
                                        />
                                    ) : (
                                        <div className={`w-full h-full ${token.fallbackColor} flex items-center justify-center text-white text-[9px] font-bold`}>
                                            {token.symbol.slice(0, 2)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[var(--text-secondary)] group-hover:text-[var(--info)] transition">{token.symbol}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section - Compact Grid */}
            <section className="pb-4">
                <div className="max-w-[1400px] mx-auto px-4">
                    {/* Top Row - Market Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1 mb-1">
                                <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Market Cap</span>} content="Total value of all XLM in circulation" />
                            </div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(marketCap)}</div>
                            <div className={`text-xs font-medium ${marketCapChange >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                {marketCapChange >= 0 ? '+' : ''}{marketCapChange.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1 mb-1">
                                <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Circulating</span>} content="Current XLM tokens in circulation" />
                            </div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">{new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(circulatingSupply)} XLM</div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1 mb-1">
                                <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Dominance</span>} content="Stellar's share of total crypto market cap" />
                            </div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">{dominance.toFixed(3)} %</div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1 mb-1">
                                <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Total Supply</span>} content="Total XLM that exists" />
                            </div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">{new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(totalSupply)} XLM</div>
                            <div className="text-xs text-[var(--text-muted)]">${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(totalSupply * xlmPrice)}</div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1 mb-1">
                                <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">24H Volume</span>} content="Trading volume in the last 24 hours" />
                            </div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">{formattedVolume}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">via CoinGecko</div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)] relative">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">XLM Price</span>
                            </div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">${xlmPrice.toFixed(4)}</div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-[var(--text-muted)]">24H</span>
                                <span className={`text-xs font-medium ${priceChange24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                                </span>
                            </div>
                            {sparklineData.length > 0 && (
                                <div className="absolute top-2 right-2 w-16 h-8">
                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                                        {(() => {
                                            const min = Math.min(...sparklineData);
                                            const max = Math.max(...sparklineData);
                                            const range = max - min || 1;
                                            const points = sparklineData.map((val, i) => {
                                                const x = (i / (sparklineData.length - 1)) * 100;
                                                const y = 50 - ((val - min) / range) * 45;
                                                return `${x},${y}`;
                                            }).join(' ');
                                            return <polyline points={points} fill="none" stroke={priceChange24h >= 0 ? '#22c55e' : '#ef4444'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
                                        })()}
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Second Row - Network Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <Link href={`/ledger/${liveStats.ledger_count}`} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)] hover:border-[var(--info)]/25 transition-all group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Current Ledger</span>} content="Latest confirmed ledger on Stellar network" />
                                    </div>
                                    <div ref={ledgerCountRef} className="text-xl font-bold text-[var(--info)]">{liveStats.ledger_count.toLocaleString()}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-12 bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                                            <div ref={progressBarRef} className="bg-[var(--success)] h-1.5 rounded-full transition-all duration-100 ease-linear" style={{ width: `${ledgerProgress}%` }} />
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)]">~{Math.max(0, Math.round((100 - ledgerProgress) / 100 * 5))}s</span>
                                    </div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--info-muted)] rounded-lg flex items-center justify-center text-[var(--info)] group-hover:bg-[var(--info)] group-hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                            </div>
                        </Link>
                        <Link href="/transactions" className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)] hover:border-[var(--info)]/25 transition-all group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">TPS Current</span>} content="Transactions per second" />
                                    </div>
                                    <div className="text-xl font-bold text-[var(--info)]">{tps}</div>
                                    <div className="text-[10px] text-[var(--success)] font-medium">{txCount} tx/ledger</div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--info-muted)] rounded-lg flex items-center justify-center text-[var(--info)] group-hover:bg-[var(--info)] group-hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                            </div>
                        </Link>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Network Load</span>} content="Current ledger capacity usage" />
                                    </div>
                                    <div className="text-xl font-bold text-[var(--text-primary)]">{liveStats.ledger_capacity_usage ? `${(liveStats.ledger_capacity_usage * 100).toFixed(0)}%` : '—'}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">capacity used</div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--warning-muted)] rounded-lg flex items-center justify-center text-[var(--warning)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Protocol</span>} content="Current Stellar protocol version" />
                                    </div>
                                    <div className="text-xl font-bold text-[var(--text-primary)]">{liveStats.protocol_version}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">version</div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--purple-muted)] rounded-lg flex items-center justify-center text-[var(--purple)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Third Row - Supply & Fees */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Burned Lumens</span>} content="XLM permanently removed from circulation" />
                                    </div>
                                    <div className="text-xl font-bold text-[var(--error)]">{new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(xlmMarketData.burnedLumens)}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">XLM burned</div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--error-muted)] rounded-lg flex items-center justify-center text-[var(--error)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">SDF Mandate</span>} content="Lumens held by Stellar Development Foundation" />
                                    </div>
                                    <div className="text-xl font-bold text-[var(--indigo)]">{new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(xlmMarketData.sdfMandate)}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">XLM held</div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--indigo-muted)] rounded-lg flex items-center justify-center text-[var(--indigo)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Fee Pool</span>} content="Accumulated network transaction fees" />
                                    </div>
                                    <div className="text-xl font-bold text-[var(--success)]">{new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(xlmMarketData.feePool)}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">XLM in fees</div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--success-muted)] rounded-lg flex items-center justify-center text-[var(--success)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <InfoTooltip label={<span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">Base Fee</span>} content="Minimum transaction fee (in stroops)" />
                                    </div>
                                    <div className="text-xl font-bold text-[var(--text-primary)]">{(liveStats.base_fee / 10000000).toFixed(7)}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">XLM ({liveStats.base_fee.toLocaleString()} stroops)</div>
                                </div>
                                <div className="w-9 h-9 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center text-[var(--text-tertiary)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

                    {/* Transaction Flow Animation */}
            <section className="pb-4">
                <div className="max-w-[1400px] mx-auto px-4">
                    <TransactionFlowAnimation operations={operations} ledgers={liveLedgers} height={240} currentLedger={liveStats.ledger_count} ledgerProgress={ledgerProgress} />
                </div>
            </section>

            {/* Live Network Activity Section */}
            <section className="pb-4">
                <div className="max-w-[1400px] mx-auto px-4">
                    <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-sm">
                        {/* Header with tabs */}
                        <div className="px-4 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"></span>
                                    Live Activity
                                </h3>
                                <div className="w-[420px] max-w-full">
                                    <GliderTabs
                                        size="sm"
                                        className="bg-[var(--bg-tertiary)] shadow-none border-0"
                                        tabs={[
                                            { id: 'All Activity', label: 'All' },
                                            { id: 'Payments', label: 'Payments' },
                                            { id: 'Swaps', label: 'Swaps' },
                                            { id: 'Smart Contracts', label: 'Contracts' },
                                        ] as const}
                                        activeId={activeTab as 'All Activity' | 'Payments' | 'Swaps' | 'Smart Contracts'}
                                        onChange={(id) => setActiveTab(id)}
                                    />
                                </div>
                            </div>
                            <Link href="/transactions" className="text-xs text-[var(--info)] hover:text-[var(--info)] font-medium flex items-center gap-1 transition">
                                View All
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>

                        {/* Activity Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full sc-table">
                                <thead>
                                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                                        <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Txn Hash</th>
                                        <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Type</th>
                                        <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Age</th>
                                        <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">From</th>
                                        <th className="py-2.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap w-8"></th>
                                        <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">To / Details</th>
                                        <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {filteredOperations.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-[var(--text-muted)] text-sm">
                                                No {activeTab === 'All Activity' ? 'activity' : activeTab.toLowerCase()} found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOperations.slice(0, 15).map((op) => {
                                            const style = getOpStyle(op.type);

                                            // Get type label
                                            const getTypeLabel = () => {
                                                if (op.type === 'payment' || op.type === 'create_account') return 'Payment';
                                                if (op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') return 'Swap';
                                                if (['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type)) return 'DEX';
                                                if (op.type === 'invoke_host_function') return 'Contract';
                                                if (op.type === 'change_trust') return 'Trustline';
                                                if (op.type === 'set_options') return 'Settings';
                                                if (op.type === 'account_merge') return 'Merge';
                                                return op.type.replace(/_/g, ' ').slice(0, 12);
                                            };

                                            // Get type colors
                                            const getTypeColors = () => {
                                                if (op.type === 'payment' || op.type === 'create_account') return 'bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]/20';
                                                if (op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') return 'bg-[var(--info-muted)] text-[var(--info)] border-[var(--info)]/20';
                                                if (['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type)) return 'bg-[var(--purple-muted)] text-[var(--purple)] border-[var(--purple)]/20';
                                                if (op.type === 'invoke_host_function') return 'bg-[var(--warning-muted)] text-[var(--warning)] border-[var(--warning)]/20';
                                                if (op.type === 'change_trust') return 'bg-[var(--indigo-muted)] text-[var(--indigo)] border-[var(--indigo)]/20';
                                                return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)]';
                                            };

                                            // Get destination/details
                                            const getDetails = () => {
                                                if (op.type === 'payment') {
                                                    return { text: op.to ? shortenAddress(op.to, 4) : '—', isAddress: true, address: op.to };
                                                }
                                                if (op.type === 'create_account') {
                                                    const account = (op as any).account;
                                                    return { text: account ? shortenAddress(account, 4) : '—', isAddress: true, address: account };
                                                }
                                                if (op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') {
                                                    const srcAsset = (op as any).source_asset_code || ((op as any).source_asset_type === 'native' ? 'XLM' : '?');
                                                    const destAsset = op.asset_code || 'XLM';
                                                    return { text: `${srcAsset} → ${destAsset}`, isAddress: false, color: 'text-[var(--violet)]' };
                                                }
                                                if (['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type)) {
                                                    const selling = (op as any).selling_asset_code || ((op as any).selling_asset_type === 'native' ? 'XLM' : '?');
                                                    const buying = (op as any).buying_asset_code || ((op as any).buying_asset_type === 'native' ? 'XLM' : '?');
                                                    return { text: `${selling} → ${buying}`, isAddress: false, color: 'text-[var(--indigo)]' };
                                                }
                                                if (op.type === 'invoke_host_function') {
                                                    const fn = decodeContractFunctionName(op);
                                                    return { text: `${fn}()`, isAddress: false, color: 'text-[var(--warning)]' };
                                                }
                                                if (op.type === 'change_trust') {
                                                    const asset = (op as any).asset_code || 'Asset';
                                                    const limit = (op as any).limit;
                                                    return { text: limit === '0' ? `Remove ${asset}` : `Add ${asset}`, isAddress: false, color: 'text-[var(--success)]' };
                                                }
                                                if (op.type === 'account_merge') {
                                                    const into = (op as any).into;
                                                    return { text: into ? shortenAddress(into, 4) : '—', isAddress: true, address: into };
                                                }
                                                return { text: '—', isAddress: false };
                                            };

                                            // Get amount
                                            const getAmount = () => {
                                                if (op.type === 'payment' || op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') {
                                                    const amount = op.amount ? formatTokenAmount(op.amount) : null;
                                                    const asset = op.asset_code || 'XLM';
                                                    return amount ? { value: amount, asset } : null;
                                                }
                                                if (op.type === 'create_account') {
                                                    const balance = (op as any).starting_balance;
                                                    return balance ? { value: formatTokenAmount(balance), asset: 'XLM' } : null;
                                                }
                                                if (['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type)) {
                                                    const amount = (op as any).amount;
                                                    const selling = (op as any).selling_asset_code || 'XLM';
                                                    return amount ? { value: formatTokenAmount(amount), asset: selling } : null;
                                                }
                                                return null;
                                            };

                                            const details = getDetails();
                                            const amount = getAmount();

	                                            return (
	                                                <tr
	                                                    key={`${op.id}:${op.transaction_hash}`}
	                                                    className="hover:bg-[var(--info-muted)]/30 transition-colors group cursor-pointer"
                                                    onClick={() => router.push(`/tx/${op.transaction_hash}`)}
                                                >
                                                    {/* Txn Hash */}
                                                    <td className="py-2 px-4">
                                                        <Link
                                                            href={`/tx/${op.transaction_hash}`}
                                                            className="font-mono text-[11px] text-[var(--info)] hover:text-[var(--info)] hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {shortenAddress(op.transaction_hash, 5)}
                                                        </Link>
                                                    </td>

                                                    {/* Type */}
                                                    <td className="py-2 px-3">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-medium ${getTypeColors()}`}>
                                                            {getTypeLabel()}
                                                        </span>
                                                    </td>

                                                    {/* Age */}
                                                    <td className="py-2 px-3 text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">
                                                        {timeAgo(op.created_at)}
                                                    </td>

                                                    {/* From */}
                                                    <td className="py-2 px-3">
                                                        <Link
                                                            href={`/address/${op.source_account}`}
                                                            className="font-mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--info)] hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {shortenAddress(op.source_account, 4)}
                                                        </Link>
                                                    </td>

                                                    {/* Arrow */}
                                                    <td className="py-2 px-1 text-center">
                                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--info-muted)] text-[var(--info)]">
                                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                            </svg>
                                                        </span>
                                                    </td>

                                                    {/* To / Details */}
                                                    <td className="py-2 px-3">
                                                        {details.isAddress && details.address ? (
                                                            <Link
                                                                href={`/address/${details.address}`}
                                                                className="font-mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--info)] hover:underline"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {details.text}
                                                            </Link>
                                                        ) : (
                                                            <span className={`text-[11px] font-medium ${details.color || 'text-[var(--text-tertiary)]'}`}>
                                                                {details.text}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Amount */}
                                                    <td className="py-2 px-4 text-right">
                                                        {amount ? (
                                                            <div>
                                                                <span className="text-[11px] font-medium text-[var(--text-primary)]">
                                                                    {amount.value}
                                                                </span>
                                                                <span className="text-[10px] text-[var(--text-muted)] ml-1">
                                                                    {amount.asset}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-[var(--text-muted)]">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-[var(--bg-tertiary)] border-t border-[var(--border-subtle)] text-center">
                            <Link href="/transactions" className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--info)] transition-colors uppercase tracking-tight">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                View All Transactions
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
