'use client';

import Link from 'next/link';
import { useState } from 'react';
import LiveTransactionFeed from '@/components/LiveTransactionFeed';
import { assetRoute } from '@/lib/shared/routes';

interface TransactionsFeedProps {
  initialTransactions: any[];
}

export default function TransactionsFeed({ initialTransactions }: TransactionsFeedProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const trendingTokens = [
    { symbol: 'XLM', logo: 'https://stellar.org/favicon.ico', fallbackColor: 'bg-[var(--text-primary)]', href: assetRoute('XLM', null) },
    { symbol: 'USDC', logo: 'https://www.centre.io/images/usdc/usdc-icon-86074d9d49.png', fallbackColor: 'bg-[var(--info)]', href: assetRoute('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN') },
    { symbol: 'yXLM', logo: null, fallbackColor: 'bg-[var(--indigo)]', href: assetRoute('yXLM', 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55') },
    { symbol: 'AQUA', logo: 'https://aqua.network/assets/img/aqua-logo.png', fallbackColor: 'bg-[var(--purple)]', href: assetRoute('AQUA', 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA') },
  ];

  return (
    <div className="px-3 mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {trendingTokens.map((token) => (
          <Link
            key={token.symbol}
            href={token.href}
            className="group flex items-center bg-[var(--bg-secondary)] hover:border-[var(--info)]/30 px-3 py-1.5 rounded-full shadow-sm border border-[var(--border-default)] transition"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden mr-2 group-hover:scale-110 transition flex-shrink-0">
              {token.logo && !failedImages.has(token.symbol) ? (
                <img
                  src={token.logo}
                  alt={token.symbol}
                  className="w-full h-full object-cover"
                  onError={() => setFailedImages(prev => new Set(prev).add(token.symbol))}
                />
              ) : (
                <div className={`w-full h-full ${token.fallbackColor} flex items-center justify-center text-white text-[9px] font-bold`}>
                  {token.symbol.slice(0, 2)}
                </div>
              )}
            </div>
            <span className="text-[var(--text-secondary)] text-xs font-semibold group-hover:text-[var(--info)] transition">{token.symbol}</span>
          </Link>
        ))}
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Live Transactions</h2>
          <span className="bg-[var(--success)]/10 text-[var(--success)] text-[11px] px-1.5 py-0.5 rounded font-bold">REALTIME</span>
        </div>
        <Link
          href="/transactions"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </Link>
      </div>

      {/* Transaction Cards */}
      <LiveTransactionFeed initialTransactions={initialTransactions} limit={30} filter="payments" />

      {/* Load More */}
      <div className="mt-3 text-center">
        <Link
          href="/transactions"
          className="inline-block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-2.5 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest hover:text-[var(--success)] transition-colors"
        >
          Load More Records
        </Link>
      </div>
    </div>
  );
}
