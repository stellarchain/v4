function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-[var(--border-default)] ${className}`} />;
}

function MetricCardSkeleton() {
  return (
    <div className="min-h-[286px] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
      <div className="flex h-[137px] items-end border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/45 p-3">
        <div className="h-20 w-full animate-pulse rounded-xl bg-[var(--border-subtle)]" />
      </div>
      <div className="p-4 pt-3.5">
        <Pulse className="h-2.5 w-24" />
        <Pulse className="mt-4 h-7 w-28" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <Pulse className="h-2.5 w-16" />
          <Pulse className="h-5 w-16" />
        </div>
        <Pulse className="mt-8 h-3 w-20" />
      </div>
    </div>
  );
}

export default function StatisticsLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-8 p-4" aria-label="Loading statistics" aria-busy="true">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <Pulse className="h-11 w-11 rounded-xl" />
            <div>
              <Pulse className="h-2.5 w-28" />
              <Pulse className="mt-3 h-6 w-36" />
              <Pulse className="mt-2 h-3 w-64 max-w-[55vw]" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
        <div className="flex items-start justify-between gap-4 p-5 pb-4">
          <div className="flex items-start gap-3">
            <Pulse className="h-9 w-9 rounded-lg" />
            <div>
              <Pulse className="h-4 w-32" />
              <Pulse className="mt-2 h-3 w-64 max-w-[50vw]" />
              <Pulse className="mt-3 h-3 w-48" />
            </div>
          </div>
          <Pulse className="hidden h-8 w-28 sm:block" />
        </div>
        <div className="flex justify-end border-y border-[var(--border-subtle)] bg-[var(--bg-primary)]/35 px-5 py-3.5">
          <Pulse className="h-9 w-full rounded-lg sm:w-80" />
        </div>
        <div className="mx-4 h-[300px] animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/55 sm:mx-5" />
        <div className="mt-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/35 px-5 py-4">
          <Pulse className="mx-auto h-3 w-52 max-w-full" />
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-3">
            <Pulse className="h-3 w-56 max-w-[40%]" />
            <Pulse className="h-3 w-32" />
            <Pulse className="h-3 w-56 max-w-[40%]" />
          </div>
        </div>
      </div>

      {Array.from({ length: 2 }, (_, sectionIndex) => (
        <section key={sectionIndex}>
          <div className="mb-4 flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <div className="flex items-center gap-3">
              <Pulse className="h-9 w-9 rounded-lg" />
              <div>
                <Pulse className="h-3 w-28" />
                <Pulse className="mt-2 h-3 w-64 max-w-[55vw]" />
              </div>
            </div>
            <Pulse className="h-5 w-20" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, cardIndex) => <MetricCardSkeleton key={cardIndex} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
