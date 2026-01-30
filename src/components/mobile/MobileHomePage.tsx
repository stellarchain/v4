'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { Ledger, getBaseUrl } from '@/lib/stellar';
import LiveTransactionFeed from '../LiveTransactionFeed';
interface MobileHomePageProps {
  stats: {
    ledger_count: number;
    latest_ledger: Ledger;
    total_coins: string;
    fee_pool: string;
    base_fee: number;
    base_reserve: number;
    protocol_version: number;
  };
  initialTransactions: any[];
  xlmVolume: number;
  xlmPrice: number;
}

export default function MobileHomePage({ stats, initialTransactions, xlmVolume, xlmPrice }: MobileHomePageProps) {
  const [liveStats, setLiveStats] = useState(stats);
  const ledgerCountRef = useRef<HTMLDivElement>(null);
  const tpsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLatestStats = async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/ledgers?limit=1&order=desc`);
        const data = await res.json();
        const latest: Ledger = data._embedded.records[0];

        if (latest.sequence > liveStats.ledger_count) {
          setLiveStats(prev => ({
            ...prev,
            ledger_count: latest.sequence,
            latest_ledger: latest,
          }));

          // Visual update animations
          if (ledgerCountRef.current) {
            gsap.fromTo(ledgerCountRef.current,
              { scale: 1.1 },
              { scale: 1, duration: 0.5, ease: 'power2.out' }
            );
          }
          if (tpsRef.current) {
            gsap.fromTo(tpsRef.current,
              { scale: 1.1 },
              { scale: 1, duration: 0.5, ease: 'power2.out' }
            );
          }
        }
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
    };

    const interval = setInterval(fetchLatestStats, 6000);
    return () => clearInterval(interval);
  }, [liveStats.ledger_count]);

  // Calculate some stats
  const txCount = liveStats.latest_ledger.successful_transaction_count + liveStats.latest_ledger.failed_transaction_count;
  const tps = (txCount / 5).toFixed(1); // Stellar closes ledgers ~every 5 seconds

  // Format volume
  const formattedVolume = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(xlmVolume);

  // Calculate Market Cap
  const marketCap = parseFloat(liveStats.total_coins) * xlmPrice;
  const formattedMarketCap = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(marketCap);

  const primaryColor = '#0F4C81';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Network Stats Card */}
      <div className="px-3 mt-2 relative z-20">
        <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-t border-white/10 border-x border-b border-white/5 ring-1 ring-white/5">
          <div className="grid grid-cols-2 gap-3">

            {/* Market Cap */}
            <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Market Cap</span>
                <span className="text-[11px] font-bold text-[var(--success)]">+2.4%</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-lg font-bold leading-none" style={{ color: primaryColor }}>{formattedMarketCap}</span>
                <svg className="w-16 h-8" viewBox="0 0 100 40">
                  <path
                    d="M0,35 L10,32 L20,38 L30,25 L40,30 L50,15 L60,20 L70,10 L80,18 L90,5 L100,12"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* Volume 24h */}
            <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Vol (24h)</span>
                <span className="text-[11px] font-bold text-[var(--error)]">-0.8%</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-lg font-bold leading-none" style={{ color: primaryColor }}>{formattedVolume}</span>
                <svg className="w-16 h-8" viewBox="0 0 100 40">
                  <path
                    d="M0,10 L10,15 L20,12 L30,25 L40,20 L50,35 L60,30 L70,38 L80,32 L90,36 L100,34"
                    fill="none"
                    stroke="var(--error)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* TX Count */}
            <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">TX Count</span>
                <span className="text-[11px] font-bold text-[var(--success)]">{tps} TPS</span>
              </div>
              <div className="flex items-end justify-between">
                <span ref={tpsRef} className="text-lg font-bold leading-none" style={{ color: primaryColor }}>
                  {liveStats.latest_ledger.successful_transaction_count.toLocaleString()}
                </span>
                <svg className="w-16 h-8" viewBox="0 0 100 40">
                  <path
                    d="M0,30 L20,28 L40,32 L60,15 L80,12 L100,5"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* Ledger */}
            <Link href={`/ledger/${liveStats.ledger_count}`} className="bg-[var(--bg-tertiary)] p-3 rounded-xl flex flex-col justify-between hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Ledger</span>
              </div>
              <div className="flex items-baseline space-x-1 mt-2">
                <span ref={ledgerCountRef} className="text-lg font-bold leading-none" style={{ color: primaryColor }}>{liveStats.ledger_count.toLocaleString()}</span>
              </div>
            </Link>

          </div>
        </div>
      </div>

      {/* Live Transactions Section */}
      <div className="px-3 mt-4">
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
    </div>
  );
}
