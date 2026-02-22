'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { Ledger, getLedgers } from '@/lib/stellar';
import { useNetwork } from '@/contexts/NetworkContext';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

interface StatsCardsProps {
  stats: {
    ledger_count: number;
    latest_ledger: Ledger;
    total_coins: string;
    fee_pool: string;
    base_fee: number;
    base_reserve: number;
    protocol_version: number;
  };
  xlmVolume: number;
  xlmPrice: number;
  marketOverview?: {
    xlmPriceUsd: string;
    xlmVolume24h: string;
    totalTrades24h: string;
    activeAssets24h: number;
    trackedAssets: number;
    totalAccounts: number;
    totalContracts: number;
    recordedAt: string;
  } | null;
  loading?: boolean;
}

export default function StatsCards({ stats, xlmVolume, xlmPrice, marketOverview, loading = false }: StatsCardsProps) {
  const [liveStats, setLiveStats] = useState(stats);
  const ledgerCountRef = useRef<HTMLDivElement>(null);
  const tpsRef = useRef<HTMLDivElement>(null);
  const { network } = useNetwork();
  const isMainnet = network === 'mainnet';

  useEffect(() => {
    setLiveStats(stats);
  }, [stats]);

  useEffect(() => {
    if (loading) return;

    const fetchLatestStats = async () => {
      try {
        const data = await getLedgers(1, 'desc');
        const latest: Ledger = data.records[0];

        if (latest.sequence > liveStats.ledger_count) {
          setLiveStats(prev => ({
            ...prev,
            ledger_count: latest.sequence,
            latest_ledger: latest,
          }));

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
  }, [liveStats.ledger_count, loading]);

  const txCount = liveStats.latest_ledger.successful_transaction_count + liveStats.latest_ledger.failed_transaction_count;
  const tps = (txCount / 5).toFixed(1);

  const formattedVolume = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(xlmVolume);

  const marketCap = parseFloat(liveStats.total_coins) * xlmPrice;
  const formattedMarketCap = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(marketCap);

  const primaryColor = '#0F4C81';
  const hasOverview = Boolean(marketOverview);
  const overviewPrice = Number(marketOverview?.xlmPriceUsd || 0);
  const overviewVolume = Number(marketOverview?.xlmVolume24h || 0);
  const overviewTrades = Number(marketOverview?.totalTrades24h || 0);
  const overviewRecordedAt = marketOverview?.recordedAt
    ? new Date(marketOverview.recordedAt).toLocaleString()
    : null;

  return (
    <div className="px-3 mt-2 relative z-20">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-t border-white/10 border-x border-b border-white/5 ring-1 ring-white/5">
        <div className="grid grid-cols-2 gap-3">
          {/* Market Cap - Mainnet only */}
          {isMainnet ? (
            <Link href="/markets" className="bg-[var(--bg-tertiary)] p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Market Cap</span>
                <span className="text-[11px] font-bold text-[var(--success)]">{loading ? <InlineSkeleton width="w-10" height="h-3" /> : '+2.4%'}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-lg font-bold leading-none" style={{ color: primaryColor }}>{loading ? <InlineSkeleton width="w-24" height="h-5" /> : formattedMarketCap}</span>
                <svg className="w-16 h-8" viewBox="0 0 100 40">
                  <path
                    d="M0,35 L10,32 L20,38 L30,25 L40,30 L50,15 L60,20 L70,10 L80,18 L90,5 L100,12"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </Link>
          ) : (
            <Link href="/transactions" className="bg-[var(--bg-tertiary)] p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">TX Count</span>
                <span className="text-[11px] font-bold text-[var(--success)]">{loading ? <InlineSkeleton width="w-12" height="h-3" /> : `${tps} TPS`}</span>
              </div>
              <div className="flex items-end justify-between">
                <span ref={tpsRef} className="text-lg font-bold leading-none" style={{ color: primaryColor }}>
                  {loading ? <InlineSkeleton width="w-16" height="h-5" /> : liveStats.latest_ledger.successful_transaction_count.toLocaleString()}
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
            </Link>
          )}

          {/* Volume 24h - Mainnet only */}
          {isMainnet ? (
            <Link href="/markets" className="bg-[var(--bg-tertiary)] p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Vol (24h)</span>
                <span className="text-[11px] font-bold text-[var(--error)]">{loading ? <InlineSkeleton width="w-10" height="h-3" /> : '-0.8%'}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-lg font-bold leading-none" style={{ color: primaryColor }}>{loading ? <InlineSkeleton width="w-20" height="h-5" /> : formattedVolume}</span>
                <svg className="w-16 h-8" viewBox="0 0 100 40">
                  <path
                    d="M0,10 L10,15 L20,12 L30,25 L40,20 L50,35 L60,30 L70,38 L80,32 L90,36 L100,34"
                    fill="none"
                    stroke="var(--error)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </Link>
          ) : (
            <Link href={`/ledger/${liveStats.ledger_count}`} className="bg-[var(--bg-tertiary)] p-3 rounded-xl flex flex-col justify-between hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Ledger</span>
              </div>
              <div className="flex items-baseline space-x-1 mt-2">
                <span ref={ledgerCountRef} className="text-lg font-bold leading-none" style={{ color: primaryColor }}>{loading ? <InlineSkeleton width="w-16" height="h-5" /> : liveStats.ledger_count.toLocaleString()}</span>
              </div>
            </Link>
          )}

          {/* TX Count - Mainnet only (testnet shows these in first row) */}
          {isMainnet && (
            <Link href="/transactions" className="bg-[var(--bg-tertiary)] p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">TX Count</span>
                <span className="text-[11px] font-bold text-[var(--success)]">{loading ? <InlineSkeleton width="w-12" height="h-3" /> : `${tps} TPS`}</span>
              </div>
              <div className="flex items-end justify-between">
                <span ref={tpsRef} className="text-lg font-bold leading-none" style={{ color: primaryColor }}>
                  {loading ? <InlineSkeleton width="w-16" height="h-5" /> : liveStats.latest_ledger.successful_transaction_count.toLocaleString()}
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
            </Link>
          )}

          {/* Ledger - Mainnet only (testnet shows this in first row) */}
          {isMainnet && (
            <Link href={`/ledger/${liveStats.ledger_count}`} className="bg-[var(--bg-tertiary)] p-3 rounded-xl flex flex-col justify-between hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Ledger</span>
              </div>
              <div className="flex items-baseline space-x-1 mt-2">
                <span ref={ledgerCountRef} className="text-lg font-bold leading-none" style={{ color: primaryColor }}>{loading ? <InlineSkeleton width="w-16" height="h-5" /> : liveStats.ledger_count.toLocaleString()}</span>
              </div>
            </Link>
          )}
        </div>

        {isMainnet && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Market Overview API</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {loading ? <InlineSkeleton width="w-20" height="h-3" /> : (overviewRecordedAt || 'No data')}
              </span>
            </div>
            <div className="mb-2">
              <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] font-medium text-[var(--text-muted)]">
                on-chain Horizon/SDEX volume
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--bg-tertiary)] p-2.5 rounded-lg">
                <div className="text-[10px] font-bold uppercase tracking-tighter text-[var(--text-muted)]">API Price</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {loading ? <InlineSkeleton width="w-16" height="h-4" /> : (hasOverview ? `$${overviewPrice.toFixed(6)}` : 'No data')}
                </div>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-2.5 rounded-lg">
                <div className="text-[10px] font-bold uppercase tracking-tighter text-[var(--text-muted)]">API Vol 24H</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {loading ? <InlineSkeleton width="w-16" height="h-4" /> : (hasOverview ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(overviewVolume) : 'No data')}
                </div>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-2.5 rounded-lg">
                <div className="text-[10px] font-bold uppercase tracking-tighter text-[var(--text-muted)]">API Trades 24H</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {loading ? <InlineSkeleton width="w-16" height="h-4" /> : (hasOverview ? new Intl.NumberFormat('en-US').format(overviewTrades) : 'No data')}
                </div>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-2.5 rounded-lg">
                <div className="text-[10px] font-bold uppercase tracking-tighter text-[var(--text-muted)]">Active Assets</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {loading ? <InlineSkeleton width="w-16" height="h-4" /> : (hasOverview ? new Intl.NumberFormat('en-US').format(marketOverview?.activeAssets24h || 0) : 'No data')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
