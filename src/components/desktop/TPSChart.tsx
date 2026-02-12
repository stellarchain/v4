'use client';

import { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Ledger, getLedgers } from '@/lib/stellar';
import { useTheme } from '@/contexts/ThemeContext';

interface TPSDataPoint {
  ledger: number;
  ledger_attr: number;
  tps: number;
  txCount: number;
  closeTime: number; // seconds between ledgers
}

const MAX_POINTS = 50;

function computeTPS(ledgers: Ledger[]): TPSDataPoint[] {
  const sorted = [...ledgers].sort((a, b) => a.sequence - b.sequence);
  const points: TPSDataPoint[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    const dt = (new Date(curr.closed_at).getTime() - new Date(prev.closed_at).getTime()) / 1000;
    const txCount = curr.successful_transaction_count + curr.failed_transaction_count;
    const tps = dt > 0 ? txCount / dt : 0;

    points.push({
      ledger: curr.sequence,
      ledger_attr: curr.sequence,
      tps: Math.round(tps * 100) / 100,
      txCount,
      closeTime: Math.round(dt),
    });
  }

  return points;
}

interface TPSChartProps {
  liveLedgers: Ledger[];
}

export default function TPSChart({ liveLedgers }: TPSChartProps) {
  const { theme } = useTheme();
  const [data, setData] = useState<TPSDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const allLedgers = useRef<Map<number, Ledger>>(new Map());
  const initialFetched = useRef(false);

  // One-time fetch of 51 ledgers to seed the chart
  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;

    (async () => {
      try {
        const json = await getLedgers(51, 'desc');
        const ledgers: Ledger[] = json.records || [];
        for (const l of ledgers) {
          allLedgers.current.set(l.sequence, l);
        }
        if (ledgers.length > 1) {
          setData(computeTPS(Array.from(allLedgers.current.values())).slice(-MAX_POINTS));
        }
      } catch (e) {
        console.error('Failed to fetch TPS ledgers:', e);
      }
      setLoading(false);
    })();
  }, []);

  // Merge live ledgers on every poll and recompute
  useEffect(() => {
    if (liveLedgers.length === 0 || allLedgers.current.size === 0) return;

    let changed = false;
    for (const l of liveLedgers) {
      if (!allLedgers.current.has(l.sequence)) {
        allLedgers.current.set(l.sequence, l);
        changed = true;
      }
    }

    if (!changed) return;

    // Trim to keep only latest ~55 ledgers (enough for 50 TPS points + 1 prev)
    const sorted = [...allLedgers.current.keys()].sort((a, b) => a - b);
    while (sorted.length > MAX_POINTS + 5) {
      allLedgers.current.delete(sorted.shift()!);
    }

    setData(computeTPS(Array.from(allLedgers.current.values())).slice(-MAX_POINTS));
  }, [liveLedgers]);

  const avgTps = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.tps, 0) / data.length * 100) / 100
    : 0;
  const maxTps = data.length > 0
    ? Math.max(...data.map(d => d.tps))
    : 0;

  const isDark = theme === 'dark';

  return (
    <div
      className="w-full rounded-2xl border border-[var(--border-default)] overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Transactions Per Second
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Last {data.length} ledgers</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Avg</span>
            <span className="ml-1.5 text-sm font-bold text-[var(--text-primary)] tabular-nums">{avgTps}</span>
            <span className="text-[10px] text-[var(--text-muted)] ml-0.5">tx/s</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Peak</span>
            <span className="ml-1.5 text-sm font-bold text-sky-500 tabular-nums">{Math.round(maxTps * 100) / 100}</span>
            <span className="text-[10px] text-[var(--text-muted)] ml-0.5">tx/s</span>
          </div>
        </div>
      </div>

      <div className="h-[140px] px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tpsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="ledger"
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `#${v.toLocaleString()}`}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as TPSDataPoint;
                  return (
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs">
                      <div className="font-bold text-[var(--text-primary)] mb-1">Ledger #{d.ledger_attr.toLocaleString()}</div>
                      <div className="text-sky-500 font-semibold">{d.tps} tx/s</div>
                      <div className="text-[var(--text-muted)]">{d.txCount} txs in {d.closeTime}s</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="tps"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                fill="url(#tpsGradient)"
                dot={false}
                activeDot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
