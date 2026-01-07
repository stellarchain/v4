'use client';

import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickSeries, CandlestickData } from 'lightweight-charts';
import { AssetDetails, getTradeAggregations, TradeAggregation } from '@/lib/stellar';

interface ChartProps {
    asset: AssetDetails;
}

export default function AssetCandlestickChart({ asset }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState(3600000); // 1 hour default

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#999',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch OHLC data against XLM (native) or USDC if base is XLM
                const counterAsset = asset.code === 'XLM'
                    ? { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' } // USDC
                    : { code: 'XLM' };

                const data = await getTradeAggregations(
                    { code: asset.code, issuer: asset.issuer },
                    counterAsset,
                    resolution,
                    200 // limit
                );

                // Sort ascending as API returns descending
                const sortedData = data.reverse().map(item => ({
                    time: item.timestamp / 1000 as any,
                    open: parseFloat(item.open),
                    high: parseFloat(item.high),
                    low: parseFloat(item.low),
                    close: parseFloat(item.close),
                }));

                candlestickSeries.setData(sortedData);
            } catch (error) {
                console.error("Failed to fetch candlestick data", error);
            }
            setLoading(false);
        };

        fetchData();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [asset, resolution]);

    return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[var(--text-primary)] font-semibold">Price Chart ({asset.code}/{asset.code === 'XLM' ? 'USDC' : 'XLM'})</h3>
                <div className="flex gap-2">
                    <button onClick={() => setResolution(900000)} className={`px-2 py-1 text-xs rounded ${resolution === 900000 ? 'bg-[var(--primary)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>15m</button>
                    <button onClick={() => setResolution(3600000)} className={`px-2 py-1 text-xs rounded ${resolution === 3600000 ? 'bg-[var(--primary)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>1h</button>
                    <button onClick={() => setResolution(86400000)} className={`px-2 py-1 text-xs rounded ${resolution === 86400000 ? 'bg-[var(--primary)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>1d</button>
                </div>
            </div>
            <div ref={chartContainerRef} className="w-full h-[400px] relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/50 z-10">
                        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
