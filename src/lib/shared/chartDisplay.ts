export function chartTimeTick(value: string, bucketMinutes: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = date.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
  if (bucketMinutes >= 1440) return day;
  const time = date.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${time}`;
}

export function chartAxisValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  if (absolute < 0.01) return value.toPrecision(3);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}
