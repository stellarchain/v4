'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/lib/projects';

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

function projectHref(project: Project): string {
  return `/projects/${project.id}`;
}

export default function ProjectList({
  projects,
  loading,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: ProjectListProps) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const pageWindow = 2;
  const startPage = Math.max(1, currentPage - pageWindow);
  const endPage = Math.min(totalPages, currentPage + pageWindow);
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, idx) => startPage + idx);
  const isFloatingActive = isHovered || isScrolling;

  useEffect(() => {
    const onScroll = () => {
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 700);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {loading ? 'Loading projects...' : `${totalItems.toLocaleString()} total projects`}
          </p>
        </div>
        <p className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-mono text-[var(--text-muted)]">
          Page {currentPage} / {Math.max(1, totalPages)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && Array.from({ length: 9 }).map((_, idx) => (
          <div key={`project-skeleton-${idx}`} className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <div className="h-44 w-full animate-pulse bg-[var(--bg-tertiary)]" />
            <div className="p-5">
              <div className="h-5 w-2/3 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
              <div className="h-4 w-1/3 rounded bg-[var(--bg-tertiary)] animate-pulse mb-3" />
              <div className="h-4 w-full rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
              <div className="h-4 w-4/5 rounded bg-[var(--bg-tertiary)] animate-pulse" />
            </div>
          </div>
        ))}

        {!loading && projects.map((project) => (
          <Link
            key={project.id}
            href={projectHref(project)}
            className="group overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-secondary)] transition-all hover:-translate-y-0.5 hover:border-[var(--info)]/40 hover:shadow-lg hover:shadow-black/5"
          >
            <div className="relative h-44 w-full overflow-hidden bg-[var(--bg-tertiary)]">
              <img
                src={project.imagePublicUrl || 'https://stellarchain.io/stellarchain-logo.svg'}
                alt={project.imageAlt || project.name}
                className={`h-full w-full transition-transform duration-300 group-hover:scale-105 ${
                  project.imagePublicUrl ? 'object-cover' : 'object-contain p-10'
                }`}
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
              <span className="absolute right-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                #{project.id}
              </span>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                {project.category && (
                  <span className="rounded-md bg-[var(--info)]/10 px-2 py-1 text-[11px] font-medium text-[var(--info)]">
                    {project.category}
                  </span>
                )}
                {project.rounds?.length > 0 && (
                  <span className="rounded-md bg-[var(--bg-tertiary)] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                    {project.rounds.length} rounds
                  </span>
                )}
              </div>

              <h3 className="line-clamp-1 text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--info)]">
                {project.name}
              </h3>

              <p className="line-clamp-3 text-sm leading-6 text-[var(--text-tertiary)]">
                {project.description || 'No description available.'}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {project.totalAwarded && (
                  <span className="rounded-lg bg-[var(--success)]/12 px-2.5 py-1 text-xs font-medium text-[var(--success)]">
                    Awarded {project.totalAwarded}
                  </span>
                )}
                {typeof project.teamSize === 'number' && (
                  <span className="rounded-lg bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                    Team {project.teamSize}
                  </span>
                )}
                {typeof project.awardedSubmissions === 'number' && (
                  <span className="rounded-lg bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                    {project.awardedSubmissions} grants
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
                <span className="text-xs text-[var(--text-muted)]">Open details</span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors group-hover:bg-[var(--info)]/15 group-hover:text-[var(--info)]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && projects.length === 0 && (
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-10 text-center text-sm text-[var(--text-tertiary)]">
          No projects found on this page.
        </div>
      )}

      <div className="h-24 md:h-20" aria-hidden="true" />

      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] md:w-auto max-w-4xl">
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`mx-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/95 backdrop-blur-md px-3 py-2 shadow-xl transition-opacity duration-300 ${
            isFloatingActive ? 'opacity-100' : 'opacity-45'
          }`}
        >
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {pageNumbers.map((page) => {
          const active = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-[var(--info)] bg-[var(--info)]/15 text-[var(--info)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          aria-label="Next page"
          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        </div>
      </div>
    </div>
  );
}
