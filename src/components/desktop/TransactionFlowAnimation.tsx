'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Ledger, Operation, timeAgo, getBaseUrl } from '@/lib/stellar';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

interface TransactionFlowAnimationProps {
    operations: Operation[];
    ledgers: Ledger[];
    height?: number;
    currentLedger?: number;
    ledgerProgress?: number;
}

const OP_COLORS: Record<string, string> = {
    payment: '#10b981',
    swap: '#8b5cf6',
    contract: '#f59e0b',
    trustline: '#14b8a6',
    failed: '#ef4444',
    other: '#64748b'
};

function getOpColor(type: string): string {
    if (type === 'payment' || type === 'create_account') return OP_COLORS.payment;
    if (type.includes('path_payment') || type.includes('offer')) return OP_COLORS.swap;
    if (type === 'invoke_host_function') return OP_COLORS.contract;
    if (type === 'change_trust') return OP_COLORS.trustline;
    return OP_COLORS.other;
}

async function fetchAllLedgerOps(sequence: number): Promise<string[]> {
    const colors: string[] = [];
    let cursor = '';

    try {
        while (true) {
            const url = `${getBaseUrl()}/ledgers/${sequence}/operations?limit=200&order=asc${cursor ? `&cursor=${cursor}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            const ops: Operation[] = data._embedded?.records || [];

            if (ops.length === 0) break;

            for (const op of ops) {
                colors.push(getOpColor(op.type));
            }

            if (ops.length < 200) break;
            cursor = ops[ops.length - 1].paging_token;
        }
    } catch {
        // Return what we have so far
    }

    return colors;
}

const TILE_GAP = 1;
const GRID_SIDE = 18;
const TILE_PX = 5;
const GRID_PX = GRID_SIDE * TILE_PX + (GRID_SIDE - 1) * TILE_GAP; // 107px

function seededShuffle<T>(arr: T[], seed: number): T[] {
    const out = [...arr];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 16807 + 0) % 2147483647;
        const j = s % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function LedgerBlock({ ledger, realOps, failedOps, txCount, isNewest, index, theme, timeAgo: timeAgoStr }: {
    ledger: Ledger;
    realOps: string[];
    failedOps: number;
    txCount: number;
    isNewest: boolean;
    index: number;
    theme: string;
    timeAgo: string;
}) {

    const totalCells = GRID_SIDE * GRID_SIDE;
    const successOps = ledger.operation_count;
    const totalOps = successOps + failedOps;

    const failedCells = totalOps > 0 ? Math.round(failedOps / totalOps * totalCells) : 0;
    const successCells = totalCells - failedCells;

    const colorCounts = new Map<string, number>();
    for (const c of realOps) {
        colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
    }

    const tiles: Array<{ color: string; type: 'op' | 'failed' }> = [];

    const entries = [...colorCounts.entries()];
    let filled = 0;
    for (let i = 0; i < entries.length; i++) {
        const [color, count] = entries[i];
        const cellCount = i === entries.length - 1
            ? successCells - filled
            : Math.round(count / realOps.length * successCells);
        for (let j = 0; j < cellCount; j++) {
            tiles.push({ color, type: 'op' });
        }
        filled += cellCount;
    }

    for (let i = 0; i < failedCells; i++) {
        tiles.push({ color: OP_COLORS.failed, type: 'failed' });
    }

    const shuffledTiles = seededShuffle(tiles, ledger.sequence);

    return (
        <Link
            href={`/ledger/${ledger.sequence}`}
            className="flex flex-col border overflow-hidden cursor-pointer group hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/5"
            style={{
                width: '100%',
                height: '100%',
                borderColor: isNewest ? 'var(--info)' : 'var(--border-default)',
                background: theme === 'dark'
                    ? `linear-gradient(180deg, rgba(30, 41, 59, ${1 - index * 0.06}) 0%, rgba(15, 23, 42, ${1 - index * 0.06}) 100%)`
                    : `linear-gradient(180deg, rgba(255, 255, 255, ${1 - index * 0.04}) 0%, rgba(248, 250, 252, ${1 - index * 0.04}) 100%)`
            }}
        >
            <div className="px-2 pt-1.5 pb-0.5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-500 tabular-nums group-hover:text-sky-400 transition-colors">
                    #{ledger.sequence.toLocaleString()}
                </span>
                {isNewest && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                )}
            </div>

            <div className="flex-1 flex items-center justify-center mx-1 mb-0.5 overflow-hidden">
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${GRID_SIDE}, ${TILE_PX}px)`,
                        gridTemplateRows: `repeat(${GRID_SIDE}, ${TILE_PX}px)`,
                        gap: `${TILE_GAP}px`,
                        width: GRID_PX,
                        height: GRID_PX,
                        flexShrink: 0,
                    }}
                >
                    {shuffledTiles.map((tile, i) => (
                        <div
                            key={i}
                            style={{
                                width: TILE_PX,
                                height: TILE_PX,
                                backgroundColor: tile.color,
                                opacity: theme === 'dark' ? 0.85 : 0.75,
                                borderRadius: 1,
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="px-2 pt-0.5 pb-1">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[var(--text-muted)] tabular-nums">{timeAgoStr}</span>
                    {failedOps > 0 && (
                        <span className="text-[9px] text-red-400 tabular-nums">{failedOps} fail</span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-[var(--text-secondary)] tabular-nums"><span className="text-[var(--text-muted)]">tx</span> {txCount}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] tabular-nums"><span className="text-[var(--text-muted)]">ops</span> {totalOps}</span>
                </div>
            </div>
        </Link>
    );
}

export default function TransactionFlowAnimation({
    ledgers,
    height = 240,
    currentLedger = 0,
    ledgerProgress = 0
}: TransactionFlowAnimationProps) {
    const { theme } = useTheme();
    const [now, setNow] = useState(Date.now());

    const opsCache = useRef<Map<number, string[]>>(new Map());
    const [ledgerOpsMap, setLedgerOpsMap] = useState<Map<number, string[]>>(new Map());

    // Track newly appeared ledgers for animation
    const seenSequences = useRef<Set<number>>(new Set());
    const [animatingSeqs, setAnimatingSeqs] = useState<Set<number>>(new Set());

    // FLIP animation: store block positions before update
    const blockRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const prevPositions = useRef<Map<number, DOMRect>>(new Map());

    // Capture positions before render
    const capturePositions = useCallback(() => {
        const positions = new Map<number, DOMRect>();
        blockRefs.current.forEach((el, seq) => {
            positions.set(seq, el.getBoundingClientRect());
        });
        prevPositions.current = positions;
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(interval);
    }, []);

    // Detect new ledgers and trigger FLIP animation
    useEffect(() => {
        const newSeqs = new Set<number>();
        for (const seq of ledgerOpsMap.keys()) {
            if (!seenSequences.current.has(seq)) {
                if (seenSequences.current.size > 0) {
                    newSeqs.add(seq);
                }
                seenSequences.current.add(seq);
            }
        }

        if (newSeqs.size > 0) {
            setAnimatingSeqs(newSeqs);

            // After DOM updates, run FLIP animation on existing blocks
            requestAnimationFrame(() => {
                blockRefs.current.forEach((el, seq) => {
                    const prev = prevPositions.current.get(seq);
                    if (!prev || newSeqs.has(seq)) return;

                    const curr = el.getBoundingClientRect();
                    const dx = prev.left - curr.left;

                    if (Math.abs(dx) > 1) {
                        el.style.transform = `translateX(${dx}px)`;
                        el.style.transition = 'none';

                        requestAnimationFrame(() => {
                            el.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
                            el.style.transform = 'translateX(0)';
                        });
                    }
                });
            });

            const timer = setTimeout(() => setAnimatingSeqs(new Set()), 800);
            return () => clearTimeout(timer);
        }
    }, [ledgerOpsMap]);

    // Capture positions before ledgerOpsMap changes
    useEffect(() => {
        capturePositions();
    }, [ledgers, capturePositions]);

    // Accumulate ledgers so old ones stay until they slide off-screen
    const [displayedLedgers, setDisplayedLedgers] = useState<Ledger[]>([]);

    useEffect(() => {
        setDisplayedLedgers(prev => {
            const ledgerMap = new Map<number, Ledger>();
            for (const l of prev) ledgerMap.set(l.sequence, l);
            for (const l of ledgers) ledgerMap.set(l.sequence, l);
            const all = [...ledgerMap.values()].sort((a, b) => b.sequence - a.sequence);
            // Keep extra beyond visible count so they can slide off naturally
            return all.slice(0, 12);
        });
    }, [ledgers]);

    // Fetch all operations for each displayed ledger (cached)
    useEffect(() => {
        const toFetch = displayedLedgers.filter(l => !opsCache.current.has(l.sequence));
        if (toFetch.length === 0) return;

        let cancelled = false;

        Promise.all(toFetch.map(async (ledger) => {
            const colors = await fetchAllLedgerOps(ledger.sequence);
            if (!cancelled) {
                opsCache.current.set(ledger.sequence, colors);
            }
        })).then(() => {
            if (cancelled) return;
            // Capture positions BEFORE state update triggers re-render
            capturePositions();
            const newMap = new Map<number, string[]>();
            for (const l of displayedLedgers) {
                const cached = opsCache.current.get(l.sequence);
                if (cached) newMap.set(l.sequence, cached);
            }
            setLedgerOpsMap(newMap);
        });

        return () => { cancelled = true; };
    }, [displayedLedgers]);

    const getTimeAgo = (closedAt: string) => {
        const seconds = Math.floor((now - new Date(closedAt).getTime()) / 1000);
        if (seconds < 0) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return timeAgo(closedAt);
    };

    const setBlockRef = useCallback((seq: number) => (el: HTMLDivElement | null) => {
        if (el) blockRefs.current.set(seq, el);
        else blockRefs.current.delete(seq);
    }, []);

    return (
        <div
            className="relative w-full rounded-2xl overflow-hidden border border-[var(--border-default)]"
            style={{
                height,
                background: theme === 'dark'
                    ? 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
            }}
        >
            <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Live Transaction Flow
                </span>
            </div>

            <div className="absolute top-3 right-4 z-10 flex items-center gap-3 bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-[var(--border-default)]">
                {[
                    { key: 'payment', label: 'Payment' },
                    { key: 'swap', label: 'Swap' },
                    { key: 'contract', label: 'Contract' },
                    { key: 'trustline', label: 'Trust' },
                    { key: 'other', label: 'Other' },
                    { key: 'failed', label: 'Failed' }
                ].map(item => (
                    <div key={item.key} className="flex items-center gap-1.5">
                        <span
                            className="w-2 h-2 rounded-sm"
                            style={{ backgroundColor: OP_COLORS[item.key] }}
                        />
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-stretch gap-2 px-4 pt-12 pb-4 h-full overflow-hidden"
                style={{ scrollbarWidth: 'none' }}
            >
                {/* Next Ledger Block */}
                <div className="flex-shrink-0 flex flex-col border-2 border-dashed border-[var(--border-default)] relative overflow-hidden"
                    style={{ width: 130 }}
                >
                    <div
                        className="absolute bottom-0 left-0 right-0 transition-[height] duration-100 ease-linear"
                        style={{
                            height: `${ledgerProgress}%`,
                            background: theme === 'dark'
                                ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.18) 100%)'
                                : 'linear-gradient(180deg, rgba(14, 165, 233, 0.05) 0%, rgba(14, 165, 233, 0.15) 100%)',
                        }}
                    />
                    <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2 p-2">
                        <div className="w-9 h-9 rounded-full border-2 border-sky-500/40 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center animate-pulse">
                                <svg className="w-3 h-3 text-sky-500" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] font-bold text-sky-500 uppercase tracking-wider">Next Ledger</div>
                            <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                                #{(currentLedger + 1).toLocaleString()}
                            </div>
                        </div>
                        <div className="w-full px-1">
                            <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1 overflow-hidden">
                                <div
                                    className="bg-sky-500 h-1 rounded-full transition-[width] duration-100 ease-linear"
                                    style={{ width: `${ledgerProgress}%` }}
                                />
                            </div>
                            <div className="text-[8px] text-[var(--text-muted)] text-center mt-0.5 tabular-nums">
                                ~{Math.max(0, Math.round((100 - ledgerProgress) / 100 * 5))}s
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center">
                    <svg className="w-5 h-5 text-[var(--text-muted)]" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>

                {/* Ledger Blocks */}
                {displayedLedgers.map((ledger, index) => {
                    const realOps = ledgerOpsMap.get(ledger.sequence);
                    if (!realOps) return null;

                    const failedOps = ledger.failed_transaction_count;
                    const txCount = ledger.successful_transaction_count + ledger.failed_transaction_count;
                    const isNewest = index === 0;
                    const isNew = animatingSeqs.has(ledger.sequence);

                    return (
                        <div
                            key={ledger.sequence}
                            ref={setBlockRef(ledger.sequence)}
                            className={isNew ? 'ledger-slot-new' : undefined}
                            style={{
                                width: 130,
                                flexShrink: 0,
                                overflow: 'hidden',
                            }}
                        >
                            <LedgerBlock
                                ledger={ledger}
                                realOps={realOps}
                                failedOps={failedOps}
                                txCount={txCount}
                                isNewest={isNewest}
                                index={index}
                                theme={theme}
                                timeAgo={getTimeAgo(ledger.closed_at)}
                            />
                        </div>
                    );
                })}

                <div
                    className="absolute top-0 right-0 bottom-0 w-12 pointer-events-none z-10"
                    style={{
                        background: theme === 'dark'
                            ? 'linear-gradient(270deg, var(--bg-primary) 0%, transparent 100%)'
                            : 'linear-gradient(270deg, #f8fafc 0%, transparent 100%)'
                    }}
                />
            </div>

            <style jsx>{`
                @keyframes slotReveal {
                    from {
                        max-width: 0;
                        width: 0;
                    }
                    to {
                        max-width: 130px;
                        width: 130px;
                    }
                }
                .ledger-slot-new {
                    animation: slotReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
            `}</style>
        </div>
    );
}
