'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { fetchProjectById, type Project } from '@/lib/projects';

function getProjectIdFromRoute(value: string): string {
  const clean = (value || '').trim();
  if (!clean) return '';
  if (/^\d+$/.test(clean)) return clean;
  const tail = clean.split('-').pop() || '';
  return /^\d+$/.test(tail) ? tail : '';
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const projectId = useMemo(() => {
    const fromQuery = (searchParams.get('id') || '').trim();
    if (fromQuery) return getProjectIdFromRoute(fromQuery);
    const fromParams = (params.slug || '').trim();
    if (fromParams) return getProjectIdFromRoute(fromParams);
    const fromPath = pathname.replace(/\/+$/, '').split('/').pop() || '';
    return getProjectIdFromRoute(fromPath);
  }, [params.slug, pathname, searchParams]);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setProject(null);

        if (!projectId) {
          setError('Invalid project ID.');
          return;
        }

        const data = await fetchProjectById(projectId);
        if (cancelled) return;
        if (!data?.id) {
          setError('Project not found.');
          return;
        }
        setProject(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load project.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="w-9 h-9 border-2 border-[var(--info)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 text-center">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Project Not Found</h1>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">{error || 'Project does not exist.'}</p>
            <Link
              href="/projects"
              className="inline-flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
            >
              Go to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 md:py-6">
      <div className="space-y-5">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <div className="relative h-56 w-full bg-sky-500/10 md:h-72">
            <img
              src={project.imagePublicUrl || 'https://stellarchain.dev/stellarchain-logo.svg'}
              alt={project.imageAlt || project.name}
              className={`h-full w-full ${project.imagePublicUrl ? 'object-cover' : 'object-contain p-14'}`}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-900/35 via-transparent to-transparent" />
          </div>

          <div className="space-y-5 p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-muted)]">#{project.id}</span>
              {project.category && (
                <span className="rounded-lg bg-[var(--info)]/10 px-2 py-1 text-xs font-medium text-[var(--info)]">
                  {project.category}
                </span>
              )}
              {project.totalAwarded && (
                <span className="rounded-lg bg-[var(--success)]/10 px-2 py-1 text-xs font-medium text-[var(--success)]">
                  {project.totalAwarded}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)]">{project.name}</h1>

            <p className="max-w-4xl text-sm leading-7 text-[var(--text-tertiary)]">
              {project.description || 'No description available.'}
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-[var(--bg-tertiary)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Awarded Submissions</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {typeof project.awardedSubmissions === 'number' ? project.awardedSubmissions : '-'}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--bg-tertiary)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Team Size</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {typeof project.teamSize === 'number' ? project.teamSize : '-'}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--bg-tertiary)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Rounds</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{project.rounds?.length || 0}</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-tertiary)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Updated</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>

            {project.rounds?.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">SCF Rounds</h2>
                <div className="flex flex-wrap gap-2">
                  {project.rounds.map((round) => (
                    <span key={round} className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                      {round}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {project.website && (
                <a
                  href={project.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                >
                  Website
                </a>
              )}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                >
                  GitHub
                </a>
              )}
              {project.sourceUrl && (
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                >
                  SCF Page
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
