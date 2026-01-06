interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
}: StatsCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--border-default)] transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="data-label mb-1.5">{title}</p>
          <p className="font-mono text-lg font-semibold text-[var(--text-primary)] tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="icon-container-sm text-[var(--text-tertiary)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
