'use client';

import { useState } from 'react';
import { KnownAccount } from '@/lib/stellar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AccountDirectoryProps {
    initialAccounts: KnownAccount[];
    initialSearch?: string;
    initialTag?: string;
}

const COMMON_TAGS = ['exchange', 'anchor', 'issuer', 'wallet', 'custodian', 'application', 'defi', 'infra', 'malicious'];

export default function AccountDirectory({ initialAccounts, initialSearch = '', initialTag = '' }: AccountDirectoryProps) {
    const router = useRouter();
    const [search, setSearch] = useState(initialSearch);
    const [activeTag, setActiveTag] = useState(initialTag);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        updateParams(search, activeTag);
    };

    const handleTagClick = (tag: string) => {
        const newTag = activeTag === tag ? '' : tag;
        setActiveTag(newTag);
        setIsSearching(true);
        updateParams(search, newTag);
    };

    const updateParams = (s: string, t: string) => {
        const params = new URLSearchParams();
        if (s) params.set('search', s);
        if (t) params.set('tag', t);
        router.push(`/accounts?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
                <form onSubmit={handleSearch} className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, address, or domain..."
                            className="w-full bg-[#111] border border-[#222] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#BFF549] transition-colors pl-11"
                        />
                        <svg className="w-5 h-5 text-[#555] absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        type="submit"
                        className="bg-[#BFF549] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[#a6d53e] transition-colors"
                    >
                        Search
                    </button>
                </form>

                <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${activeTag === tag
                                    ? 'bg-[#BFF549]/10 text-[#BFF549] border-[#BFF549]/30'
                                    : 'bg-[#151515] text-[#888] border-[#222] hover:border-[#444] hover:text-white'
                                }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {initialAccounts.map((account) => (
                    <Link
                        href={`/account/${account.address}`}
                        key={account.address}
                        className="block bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 hover:bg-[#151515] transition-all group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold capitalize ${account.tags?.includes('malicious')
                                        ? 'bg-red-500/10 text-red-500'
                                        : 'bg-blue-500/10 text-blue-400'
                                    }`}>
                                    {account.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-white font-medium group-hover:text-[#BFF549] transition-colors truncate max-w-[200px]">
                                        {account.name}
                                    </h3>
                                    {account.domain && (
                                        <p className="text-[#555] text-xs flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                            {account.domain}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-[#111] rounded-lg p-2 font-mono text-xs text-[#888] break-all group-hover:bg-[#1a1a1a] transition-colors">
                                {account.address}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {account.tags?.map(tag => (
                                    <span
                                        key={tag}
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${tag === 'malicious' || tag === 'unsafe'
                                                ? 'bg-red-500/10 text-red-400'
                                                : 'bg-[#222] text-[#888]'
                                            }`}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Link>
                ))}
                {initialAccounts.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-medium mb-1">No accounts found</h3>
                        <p className="text-[#666] text-sm max-w-md mx-auto">
                            We couldn't find any known accounts matching your search criteria. Try using different keywords or tags.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
