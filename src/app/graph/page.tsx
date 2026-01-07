'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function WalletTrackPage() {
    const [address, setAddress] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (address.trim().length === 56) {
            window.location.href = `/graph/${address.trim()}`;
        }
    };

    const showcaseAddress = 'GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4';

    return (
        <div className="max-w-4xl mx-auto space-y-12 py-12 px-4">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-[56px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">Wallet Track</h1>
                <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
                    Visualize transaction flows, money movement, and account connections in real-time on the Stellar network.
                </p>
            </div>

            {/* Search */}
            <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter Stellar Address (G...)"
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-md py-5 pl-6 pr-32 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all shadow-lg text-lg font-mono"
                    />
                    <button
                        type="submit"
                        disabled={address.length !== 56}
                        className="absolute right-2 top-2 bottom-2 bg-[var(--primary)] text-black font-semibold px-6 rounded hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Visualize
                    </button>
                </form>
            </div>

            {/* Showcase CARD */}
            <div className="border border-[var(--border-subtle)] rounded-md p-8 bg-[var(--bg-secondary)] relative overflow-hidden group hover:border-[var(--primary)] transition-all cursor-pointer" onClick={() => window.location.href = `/graph/${showcaseAddress}`}>
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 translate-x-10 -translate-y-10">
                    <svg className="w-96 h-96 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-[var(--primary)]/20">
                        Featured Showcase
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Enterprise Fund</h3>
                    <p className="text-[var(--text-secondary)] mb-1">SDF Use-Case Investment</p>
                    <p className="text-[var(--text-muted)] mb-6 font-mono text-sm break-all max-w-xl opacity-70">
                        {showcaseAddress}
                    </p>
                    <div className="flex items-center gap-2 text-[var(--primary)] font-medium group-hover:gap-4 transition-all">
                        <span>View Interactive Graph</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
