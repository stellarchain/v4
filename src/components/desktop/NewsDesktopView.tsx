'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import GliderTabs from '@/components/ui/GliderTabs';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string;
  category: 'stellar' | 'crypto' | 'defi' | 'regulation';
  description?: string;
}

interface NewsDesktopViewProps {
  news: NewsItem[];
}

type FilterType = 'all' | 'stellar' | 'crypto' | 'defi' | 'regulation';
type SortField = 'date' | 'source';
type SortOrder = 'asc' | 'desc';

const categoryConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  stellar: { label: 'Stellar', color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/20', borderColor: 'border-sky-200 dark:border-sky-800/30' },
  crypto: { label: 'Crypto', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800/30' },
  defi: { label: 'DeFi', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/20', borderColor: 'border-violet-200 dark:border-violet-800/30' },
  regulation: { label: 'Regulation', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800/30' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg className={`w-3 h-3 ml-1 inline-block ${active ? 'text-sky-600' : 'text-[var(--text-muted)]'}`} fill="currentColor" viewBox="0 0 24 24">
      {order === 'desc' || !active ? (
        <path d="M7 10l5 5 5-5H7z" />
      ) : (
        <path d="M7 14l5-5 5 5H7z" />
      )}
    </svg>
  );
}

export default function NewsDesktopView({ news }: NewsDesktopViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(news[0] || null);

  // Calculate stats
  const stats = useMemo(() => {
    const total = news.length;
    const stellar = news.filter(n => n.category === 'stellar').length;
    const crypto = news.filter(n => n.category === 'crypto').length;
    const defi = news.filter(n => n.category === 'defi').length;
    const regulation = news.filter(n => n.category === 'regulation').length;
    const sources = new Set(news.map(n => n.source)).size;
    return { total, stellar, crypto, defi, regulation, sources };
  }, [news]);

  // Filter and sort news
  const filteredNews = useMemo(() => {
    let items = [...news];

    // Apply category filter
    if (filter !== 'all') {
      items = items.filter(item => item.category === filter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        item =>
          item.title.toLowerCase().includes(query) ||
          item.source.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    items.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortField === 'source') {
        comparison = a.source.localeCompare(b.source);
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return items;
  }, [news, filter, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const HeaderCell = ({ label, field, className = '' }: { label: string; field?: SortField; className?: string }) => {
    const isSortable = !!field;
    const isActive = sortField === field;

    return (
      <th
        className={`py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-left whitespace-nowrap ${isSortable ? 'cursor-pointer hover:text-sky-600 transition-colors select-none' : ''} ${isActive ? 'text-sky-600' : 'text-[var(--text-muted)]'} ${className}`}
        onClick={() => field && handleSort(field)}
      >
        <span className="inline-flex items-center">
          {label}
          {isSortable && <SortIcon active={isActive} order={sortOrder} />}
        </span>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
        {/* Header Card */}
        <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 transition hover:bg-sky-200 dark:hover:bg-sky-900/60"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Feed</span>
                  <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    {stats.total} Articles
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {stats.sources} Sources
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">Stellar & Crypto News</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Latest news and updates from the Stellar ecosystem and broader crypto market
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-sky-100/70 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">Stellar</div>
                <div className="text-lg font-bold text-sky-600 dark:text-sky-400">{stats.stellar}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-100/70 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Crypto</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.crypto}</div>
              </div>
              <div className="p-3 rounded-xl bg-violet-100/70 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1">DeFi</div>
                <div className="text-lg font-bold text-violet-600 dark:text-violet-400">{stats.defi}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Regulation</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.regulation}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
          {/* Category Tabs */}
          <div className="w-full sm:w-auto sm:min-w-[520px] max-w-full">
            <GliderTabs
              size="sm"
              className="border-[var(--border-default)]"
              tabs={[
                { id: 'all', label: 'All', count: stats.total },
                { id: 'stellar', label: 'Stellar', count: stats.stellar },
                { id: 'crypto', label: 'Crypto', count: stats.crypto },
                { id: 'defi', label: 'DeFi', count: stats.defi },
                { id: 'regulation', label: 'Regulation', count: stats.regulation },
              ] as const}
              activeId={filter}
              onChange={setFilter}
            />
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0 w-72">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] pl-11 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Main Content - Master/Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: News Table */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
              <table className="w-full sc-table">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                    <HeaderCell label="Title" className="min-w-[280px]" />
                    <HeaderCell label="Category" className="w-24" />
                    <HeaderCell label="Source" field="source" className="w-28" />
                    <HeaderCell label="Date" field="date" className="w-28" />
                    <th className="py-3 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bg-primary)]">
                  {filteredNews.length > 0 ? (
                    filteredNews.map((item) => {
                      const config = categoryConfig[item.category];
                      const isSelected = selectedNews?.id === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors cursor-pointer ${isSelected
                              ? 'bg-sky-50/50 dark:bg-sky-900/10 border-l-2 border-l-sky-500'
                              : 'hover:bg-[var(--bg-primary)]'
                            }`}
                          onClick={() => setSelectedNews(item)}
                        >
                          {/* Title */}
                          <td className="py-3 px-4">
                            <div className="text-[13px] font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-sky-600">
                              {item.title}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${config.bgColor} ${config.color} ${config.borderColor}`}>
                              {config.label}
                            </span>
                          </td>

                          {/* Source */}
                          <td className="py-3 px-3">
                            <span className="text-[12px] text-[var(--text-secondary)] font-medium">
                              {item.source}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3">
                            <span className="text-[12px] text-[var(--text-tertiary)]">
                              {formatDate(item.date)}
                            </span>
                          </td>

                          {/* External Link */}
                          <td className="py-3 px-3">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-sky-100 hover:text-sky-600 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-[var(--text-muted)] text-sm">
                        No news articles found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Selected News Detail */}
          <div className="lg:col-span-5">
            {selectedNews ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden sticky top-6">
                {/* Detail Header */}
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${categoryConfig[selectedNews.category].bgColor}`}>
                      <svg className={`w-6 h-6 ${categoryConfig[selectedNews.category].color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${categoryConfig[selectedNews.category].bgColor} ${categoryConfig[selectedNews.category].color}`}>
                          {categoryConfig[selectedNews.category].label.toUpperCase()}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                        {selectedNews.title}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Detail Body */}
                <div className="p-4 space-y-4">
                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Source</div>
                      <div className="text-sm font-semibold text-[var(--text-secondary)]">{selectedNews.source}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Published</div>
                      <div className="text-sm font-semibold text-[var(--text-secondary)]">{formatDate(selectedNews.date)}</div>
                    </div>
                  </div>

                  {/* Full Date */}
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Full Date</div>
                    <div className="text-sm font-medium text-[var(--text-secondary)]">{formatFullDate(selectedNews.date)}</div>
                  </div>

                  {/* Description if available */}
                  {selectedNews.description && (
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Summary</div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{selectedNews.description}</p>
                    </div>
                  )}

                  {/* Read Article Button */}
                  <a
                    href={selectedNews.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition-colors"
                  >
                    Read Full Article
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Category Info Footer */}
                <div className={`p-4 border-t ${categoryConfig[selectedNews.category].bgColor}/50 border-[var(--border-subtle)]`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${categoryConfig[selectedNews.category].color.replace('text-', 'bg-')}`}></span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${categoryConfig[selectedNews.category].color}`}>
                        {categoryConfig[selectedNews.category].label} News
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {stats[selectedNews.category as keyof typeof stats]} articles in category
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm p-4 text-center">
                <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-[var(--text-primary)] font-semibold mb-1">Select an article</h3>
                <p className="text-[var(--text-muted)] text-sm">Click on a news item to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
