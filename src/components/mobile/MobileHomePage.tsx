'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { Ledger, formatXLM } from '@/lib/stellar';
import LiveTransactionFeed from '../LiveTransactionFeed';
import { containers, spacing, colors, coreColors, getPrimaryColor } from '@/lib/design-system';

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

import InfoTooltip from '../InfoTooltip';

export default function MobileHomePage({ stats, initialTransactions, xlmVolume, xlmPrice }: MobileHomePageProps) {
  const [liveStats, setLiveStats] = useState(stats);
  const ledgerCountRef = useRef<HTMLDivElement>(null);
  const tpsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLatestStats = async () => {
      try {
        const res = await fetch('https://horizon.stellar.org/ledgers?limit=1&order=desc');
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
    <div className={containers.page}>
      {/* Network Stats Card */}
      <div className="px-2 pt-4">
        <div className={`${containers.card} p-4 relative z-20`}>
          <div className="grid grid-cols-2 gap-y-4">

            {/* Row 1: Market Cap & Volume */}
            <div className="space-y-1 border-r border-slate-100 pr-4">
              <InfoTooltip
                direction="bottom"
                label={
                  <>
                    <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Market Cap</span>
                  </>
                }
                content="The total market value of all circulating XLM coins."
              />
              <div className="text-lg font-bold font-mono tracking-tight" style={{ color: primaryColor }}>{formattedMarketCap}</div>
            </div>

            <div className="space-y-1 pl-4">
              <InfoTooltip
                direction="bottom"
                label={
                  <>
                    <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Vol (24h)</span>
                  </>
                }
                content="Total value of XLM traded across all exchanges in the last 24 hours."
              />
              <div className="text-lg font-bold font-mono tracking-tight" style={{ color: primaryColor }}>{formattedVolume}</div>
            </div>

            {/* Divider */}
            <div className="col-span-2 h-px bg-slate-100"></div>

            {/* Row 2: Transactions & Base Fee */}
            <div className="space-y-1 border-r border-slate-100 pr-4">
              <InfoTooltip
                label={
                  <>
                    <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Transactions</span>
                  </>
                }
                content="Number of successful transactions in the latest ledger."
              />
              <div>
                <div ref={tpsRef} className="text-lg font-bold font-mono tracking-tight" style={{ color: primaryColor }}>
                  {liveStats.latest_ledger.successful_transaction_count.toLocaleString()}
                </div>
                <div className="text-[10px] font-medium text-emerald-500 mt-0.5">{tps} TPS</div>
              </div>
            </div>

            <div className="space-y-1 pl-4">
              <InfoTooltip
                label={
                  <>
                    <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Base Fee</span>
                  </>
                }
                content="The minimum fee required to submit a transaction to the network."
              />
              <div>
                <div className="text-lg font-bold font-mono tracking-tight" style={{ color: primaryColor }}>
                  {(liveStats.base_fee / 10000000).toFixed(7)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">XLM</div>
              </div>
            </div>

            {/* Divider */}
            <div className="col-span-2 h-px bg-slate-100"></div>

            {/* Row 3: Ledger & Price */}
            <div className="space-y-1 border-r border-slate-100 pr-4">
              <InfoTooltip
                label={
                  <>
                    <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Latest Ledger</span>
                  </>
                }
                content="The sequence number of the most recently closed ledger."
              />
              <div ref={ledgerCountRef} className="text-lg font-bold font-mono tracking-tight" style={{ color: primaryColor }}>
                {liveStats.ledger_count.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1 pl-4">
              <InfoTooltip
                label={
                  <>
                    <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">XLM Price</span>
                  </>
                }
                content="Current market price of 1 XLM in USD."
              />
              <div>
                <div className="text-lg font-bold font-mono tracking-tight text-emerald-600">
                  ${xlmPrice.toFixed(4)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">USD</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Transactions Section */}
      <div className="px-2 mt-4">
        <div className={containers.card}>
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-bold tracking-tight" style={{ color: primaryColor }}>Live Transactions</h2>
            <Link
              href="/transactions"
              className="text-[#0F4C81] hover:opacity-80 text-xs font-semibold flex items-center gap-1 transition-opacity"
            >
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <LiveTransactionFeed initialTransactions={initialTransactions} limit={30} filter="payments" />
        </div>
      </div>
    </div>
  );
}
