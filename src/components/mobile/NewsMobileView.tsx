'use client';

import { useState, useMemo } from 'react';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string;
  category: 'stellar' | 'crypto' | 'defi' | 'regulation';
  description?: string;
}

interface NewsMobileViewProps {
  news: NewsItem[];
}

type FilterType = 'all' | 'stellar' | 'crypto' | 'defi' | 'regulation';

const categoryConfig: Record<string, { label: string; color: string; bgColor: string; barColor: string }> = {
  stellar: { label: 'Stellar', color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/20', barColor: 'bg-sky-400 dark:bg-sky-500' },
  crypto: { label: 'Crypto', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', barColor: 'bg-amber-400 dark:bg-amber-500' },
  defi: { label: 'DeFi', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/20', barColor: 'bg-violet-400 dark:bg-violet-500' },
  regulation: { label: 'Regulation', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', barColor: 'bg-emerald-400 dark:bg-emerald-500' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NewsMobileView({ news }: NewsMobileViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Calculate stats
  const stats = useMemo(() => {
    const total = news.length;
    const stellar = news.filter(n => n.category === 'stellar').length;
    const crypto = news.filter(n => n.category === 'crypto').length;
    const defi = news.filter(n => n.category === 'defi').length;
    const regulation = news.filter(n => n.category === 'regulation').length;
    return { total, stellar, crypto, defi, regulation };
  }, [news]);

  // Filter news
  const filteredNews = useMemo(() => {
    if (filter === 'all') return news;
    return news.filter(item => item.category === filter);
  }, [news, filter]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1">
      <div className="px-3">
        {/* Header */}
        <div className="py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                News Feed
              </span>
              <span className="bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[10px] px-1.5 py-0.5 rounded font-bold">
                {stats.total} Articles
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-sky-600/60 dark:text-sky-400/60 font-bold uppercase tracking-wider">Stellar</div>
              <div className="text-[15px] font-bold text-sky-600 dark:text-sky-400">{stats.stellar}</div>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-amber-600/60 dark:text-amber-400/60 font-bold uppercase tracking-wider">Crypto</div>
              <div className="text-[15px] font-bold text-amber-600 dark:text-amber-400">{stats.crypto}</div>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-violet-600/60 dark:text-violet-400/60 font-bold uppercase tracking-wider">DeFi</div>
              <div className="text-[15px] font-bold text-violet-600 dark:text-violet-400">{stats.defi}</div>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-emerald-600/60 dark:text-emerald-400/60 font-bold uppercase tracking-wider">Regulation</div>
              <div className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400">{stats.regulation}</div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {[
              { id: 'all', label: 'All', count: stats.total },
              { id: 'stellar', label: 'Stellar', count: stats.stellar },
              { id: 'crypto', label: 'Crypto', count: stats.crypto },
              { id: 'defi', label: 'DeFi', count: stats.defi },
              { id: 'regulation', label: 'Regulation', count: stats.regulation },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as FilterType)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${filter === tab.id
                  ? 'bg-[var(--primary-blue)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]'
                  }`}
              >
                {tab.label}
                <span className={`${filter === tab.id ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* News List */}
        {filteredNews.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4 text-center text-[var(--text-muted)] italic text-sm">
            No news articles found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNews.map((item) => {
              const config = categoryConfig[item.category];

              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors overflow-hidden"
                >
                  {/* Category Color Bar */}
                  <div className={`h-0.5 ${config.barColor}`} />

                  <div className="px-4 py-3">
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 flex-1">
                        {item.title}
                      </h2>
                      <svg className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>

                    {/* Meta Row */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-[var(--text-muted)] font-medium">{item.source}</span>
                      <span className="text-[var(--text-muted)]">|</span>
                      <span className="text-[var(--text-muted)]">{formatDate(item.date)}</span>
                    </div>
                  </div>
                </a>
              );
            })}

            {/* Load More Button */}
            <div className="py-4 text-center">
              <button className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-tertiary)] shadow-sm active:bg-[var(--bg-tertiary)] transition-colors">
                Load more news
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
