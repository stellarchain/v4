'use client';

import { useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatItem } from '@/lib/stellar';
import gsap from 'gsap';

interface DetailedChartProps {
    stat: StatItem;
    onClose: () => void;
}

export default function DetailedChart({ stat, onClose }: DetailedChartProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tl = gsap.timeline();

        tl.to(overlayRef.current, {
            opacity: 1,
            duration: 0.2,
            ease: 'power2.out',
        })
            .fromTo(modalRef.current,
                { scale: 0.95, opacity: 0, y: 10 },
                { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.2)' },
                '-=0.1'
            );

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleEsc);

        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const handleClose = () => {
        const tl = gsap.timeline({
            onComplete: onClose
        });

        tl.to(modalRef.current, {
            scale: 0.95,
            opacity: 0,
            y: 10,
            duration: 0.2,
            ease: 'power2.in'
        })
            .to(overlayRef.current, {
                opacity: 0,
                duration: 0.15
            }, '-=0.1');
    };

    const chartData = stat.sparkline.map((val, i) => ({
        name: i.toString(),
        value: val,
    }));

    const isPositive = (stat.change ?? 0) >= 0;
    const strokeColor = isPositive ? 'var(--primary)' : '#ef4444';
    const fillColor = isPositive ? 'var(--primary)' : '#ef4444';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative w-full max-w-3xl bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-2xl opacity-0 overflow-hidden"
            >
                {/* Holographic Border Effect */}
                <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/5" />

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-[var(--text-tertiary)] text-sm uppercase tracking-wider font-medium mb-2">{stat.label}</h3>
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold text-[var(--text-primary)]">
                                {typeof stat.value === 'number'
                                    ? stat.prefix === '$'
                                        ? `$${stat.value.toLocaleString()}`
                                        : stat.value.toLocaleString()
                                    : stat.value}
                                {stat.suffix && <span className="text-lg text-[var(--text-muted)] ml-1">{stat.suffix}</span>}
                            </span>
                            {stat.change !== undefined && (
                                <span className={`text-sm font-medium px-2 py-0.5 rounded-xl ${isPositive ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-red-500/10 text-red-500'}`}>
                                    {isPositive ? '+' : ''}{stat.change.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--primary)] transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={fillColor} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis
                                dataKey="name"
                                hide
                            />
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    boxShadow: 'var(--shadow-lg)'
                                }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                formatter={(value: number | string | Array<number | string> | undefined) => {
                                    if (value === undefined) return [];
                                    const numValue = Number(value);
                                    if (isNaN(numValue)) return [String(value), stat.label];
                                    return [
                                        stat.prefix === '$' ? `$${numValue.toLocaleString()}` : numValue.toLocaleString(),
                                        stat.label
                                    ];
                                }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={strokeColor}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                animationDuration={1500}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Past 24 hours</span>
                    <span>Now</span>
                </div>
            </div>
        </div>
    );
}
