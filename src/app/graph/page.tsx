'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

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
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Wallet Track</h1>
                        <Badge>Beta</Badge>
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">Visualize transaction flows and account connections</p>
                </div>
            </div>

            {/* Search Card */}
            <Card className="p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                            Stellar Address
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="G..."
                                className="w-full bg-[var(--bg-tertiary)] rounded-xl py-3 px-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-sm font-mono"
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={address.length !== 56}
                        variant="primary"
                        className="w-full py-3 text-sm"
                    >
                        Visualize Graph
                    </Button>
                </form>
            </Card>

            {/* Showcase Card */}
            <div
                className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                onClick={() => window.location.href = `/graph/${showcaseAddress}`}
            >
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-md text-[10px] font-medium uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                            Featured
                        </span>
                        <div>
                            <h3 className="text-[var(--text-primary)] font-medium mb-1">Enterprise Fund</h3>
                            <p className="text-[var(--text-muted)] text-xs mb-3">SDF Use-Case Investment</p>
                            <p className="text-[var(--text-muted)] font-mono text-[10px] break-all max-w-md">
                                {showcaseAddress}
                            </p>
                        </div>
                    </div>
                    <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>

            {/* Info */}
            <p className="text-center text-[var(--text-muted)] text-xs">
                Enter any Stellar address to visualize its transaction network
            </p>
        </div>
    );
}
