'use client';

import { containers } from '@/lib/design-system';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string;
  category: 'stellar' | 'crypto' | 'defi' | 'regulation';
}

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Stellar Foundation Announces Major Protocol Upgrade for 2026',
    date: '2026-01-29',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
  },
  {
    id: '2',
    title: 'Bitcoin Surges Past $150K as Institutional Adoption Accelerates',
    date: '2026-01-29',
    source: 'CoinDesk',
    url: 'https://coindesk.com',
    category: 'crypto',
  },
  {
    id: '3',
    title: 'MoneyGram Expands Stellar-Based Remittance Services to 50 New Countries',
    date: '2026-01-28',
    source: 'The Block',
    url: 'https://theblock.co',
    category: 'stellar',
  },
  {
    id: '4',
    title: 'SEC Approves First Spot Ethereum ETF Options Trading',
    date: '2026-01-28',
    source: 'Bloomberg',
    url: 'https://bloomberg.com',
    category: 'regulation',
  },
  {
    id: '5',
    title: 'Soroban Smart Contracts See 500% Growth in Developer Activity',
    date: '2026-01-27',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
  },
  {
    id: '6',
    title: 'DeFi Total Value Locked Reaches New All-Time High of $500B',
    date: '2026-01-27',
    source: 'DeFi Pulse',
    url: 'https://defipulse.com',
    category: 'defi',
  },
  {
    id: '7',
    title: 'Circle Launches USDC on Stellar with Native Support',
    date: '2026-01-26',
    source: 'Circle Blog',
    url: 'https://circle.com/blog',
    category: 'stellar',
  },
  {
    id: '8',
    title: 'EU Finalizes MiCA Implementation Guidelines for 2026',
    date: '2026-01-26',
    source: 'Reuters',
    url: 'https://reuters.com',
    category: 'regulation',
  },
  {
    id: '9',
    title: 'Stellar Anchor Directory Adds 20 New Licensed Partners',
    date: '2026-01-25',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
  },
  {
    id: '10',
    title: 'Cross-Border Payments Market to Reach $250T by 2030',
    date: '2026-01-25',
    source: 'Forbes',
    url: 'https://forbes.com',
    category: 'crypto',
  },
  {
    id: '11',
    title: 'Ethereum Layer 2 Networks Process More Transactions Than Mainnet',
    date: '2026-01-24',
    source: 'The Block',
    url: 'https://theblock.co',
    category: 'defi',
  },
  {
    id: '12',
    title: 'SDF Grants Program Awards $10M to Ecosystem Projects',
    date: '2026-01-24',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
  },
];

const categoryColors: Record<string, string> = {
  stellar: 'bg-blue-500/10 text-blue-500',
  crypto: 'bg-amber-500/10 text-amber-500',
  defi: 'bg-purple-500/10 text-purple-500',
  regulation: 'bg-green-500/10 text-green-500',
};

const categoryLabels: Record<string, string> = {
  stellar: 'Stellar',
  crypto: 'Crypto',
  defi: 'DeFi',
  regulation: 'Regulation',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NewsPage() {
  return (
    <div className={`${containers.page} pt-3`}>
      {/* News List */}
      <main className="px-3 space-y-2">
        {mockNews.map((news) => (
          <a
            key={news.id}
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 active:bg-[var(--bg-tertiary)] transition-colors"
          >
            {/* Category & Date */}
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${categoryColors[news.category]}`}>
                {categoryLabels[news.category]}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {formatDate(news.date)}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-2">
              {news.title}
            </h2>

            {/* Source & Link */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                {news.source}
              </span>
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>
        ))}

        {/* Load More */}
        <div className="py-4 text-center">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-tertiary)] shadow-sm">
            Load more news
          </button>
        </div>
      </main>
    </div>
  );
}
