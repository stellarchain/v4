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
    <div className="holo-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#666] text-[10px] uppercase tracking-wider font-medium">{title}</p>
          <p className="text-base font-semibold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-[#444] text-[10px] mt-0.5">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-1.5 bg-[#1a1a1a] rounded-lg text-[#666]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
