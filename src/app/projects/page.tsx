'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProjectList from '@/components/ProjectList';
import { fetchProjectCategories, fetchProjects, type Project, type ProjectCategory } from '@/lib/projects';

const ITEMS_PER_PAGE = 21;
type ProjectsSort = 'default' | 'awarded_asc' | 'awarded_desc' | 'rounds_desc';
const VALID_SORTS: ProjectsSort[] = ['default', 'awarded_asc', 'awarded_desc', 'rounds_desc'];

export default function ProjectsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialPage = useMemo(() => {
    const raw = Number(searchParams.get('page') || '1');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const initialQuery = useMemo(() => (searchParams.get('q') || '').trim(), [searchParams]);
  const initialCategory = useMemo(() => (searchParams.get('category') || '').trim(), [searchParams]);
  const initialSort = useMemo<ProjectsSort>(() => {
    const value = (searchParams.get('sort') || 'default').trim() as ProjectsSort;
    return VALID_SORTS.includes(value) ? value : 'default';
  }, [searchParams]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [debouncedCategory, setDebouncedCategory] = useState(initialCategory);
  const [sort, setSort] = useState<ProjectsSort>(initialSort);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);
  useEffect(() => {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    setCategory(initialCategory);
    setDebouncedCategory(initialCategory);
  }, [initialCategory]);
  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategory(category.trim()), 350);
    return () => clearTimeout(timer);
  }, [category]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (currentPage > 1) nextParams.set('page', String(currentPage));
    if (debouncedQuery) nextParams.set('q', debouncedQuery);
    if (debouncedCategory) nextParams.set('category', debouncedCategory);
    if (sort !== 'default') nextParams.set('sort', sort);
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    // Ignore Next.js internal params (like _rsc) when comparing.
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete('_rsc');
    const currentQuery = currentParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [currentPage, debouncedCategory, debouncedQuery, pathname, router, searchParams, sort]);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProjects({
          page: currentPage,
          itemsPerPage: ITEMS_PER_PAGE,
          name: debouncedQuery || undefined,
          category: debouncedCategory || undefined,
          sort,
        });
        if (cancelled) return;
        setProjects(data.member);
        setTotalItems(data.totalItems);
        setTotalPages(Math.max(1, Math.ceil((data.totalItems || 0) / ITEMS_PER_PAGE)));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load projects.');
        setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [currentPage, debouncedCategory, debouncedQuery, sort]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const items = await fetchProjectCategories();
        if (cancelled) return;
        setCategories(items);
      } catch {
        if (cancelled) return;
        setCategories([]);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const didInitFiltersRef = useRef(false);
  useEffect(() => {
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true;
      return;
    }
    setCurrentPage(1);
  }, [debouncedCategory, debouncedQuery, sort]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-4 md:py-6">
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 md:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Stellar Ecosystem</p>
                <h1 className="mt-1 text-2xl md:text-3xl font-semibold text-[var(--text-primary)]">Projects Directory</h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-tertiary)]">
                  Discover teams funded by SCF, filter by category, and explore project details.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-[210px]">
                <div className="rounded-xl bg-[var(--bg-tertiary)] px-3 py-2">
                  <p className="text-[11px] text-[var(--text-muted)]">Projects</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{totalItems.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-[var(--bg-tertiary)] px-3 py-2">
                  <p className="text-[11px] text-[var(--text-muted)]">Categories</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{categories.length}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by project name (e.g. STELLAR)"
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--info)]/20"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--info)]/20"
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ProjectsSort)}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--info)]/20"
              >
                <option value="default">Sort: Default</option>
                <option value="awarded_asc">Sort: Awarded (Low to High)</option>
                <option value="awarded_desc">Sort: Awarded (High to Low)</option>
                <option value="rounds_desc">Sort: Rounds Count (High to Low)</option>
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-[var(--error)]/30 bg-[var(--error)]/5 p-4 text-sm text-[var(--error)]">
            {error}
          </div>
        )}

        <ProjectList
          projects={projects}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(page) => {
            if (page < 1 || page > totalPages) return;
            setCurrentPage(page);
            window.scrollTo(0, 0);
          }}
        />
      </div>
    </div>
  );
}
