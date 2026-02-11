export default function InlineSkeleton({ width = 'w-16', height = 'h-4' }: { width?: string; height?: string }) {
    return (
        <span
            className={`inline-block ${width} ${height} rounded bg-[var(--border-default)] animate-pulse align-middle`}
            aria-hidden
        />
    );
}
