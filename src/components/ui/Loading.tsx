import type { ReactNode } from 'react';

interface LoadingProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export default function Loading({ title = 'Loading...', description, children }: LoadingProps) {
  return (
    <div className="py-6 px-4 animate-pulse">
      {title ? (
        <div className="h-6 w-40 rounded bg-[var(--bg-secondary)] mb-4" aria-hidden />
      ) : null}
      {description ? (
        <>
          <div className="h-4 w-72 rounded bg-[var(--bg-secondary)] mb-2" aria-hidden />
          <div className="h-4 w-64 rounded bg-[var(--bg-secondary)] mb-6" aria-hidden />
        </>
      ) : null}
      {children ?? (
        <>
          <div className="h-24 rounded bg-[var(--bg-secondary)] mb-4" aria-hidden />
          <div className="h-24 rounded bg-[var(--bg-secondary)]" aria-hidden />
        </>
      )}
    </div>
  );
}
