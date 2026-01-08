'use client';

import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickSeries, CandlestickData, HistogramSeries } from 'lightweight-charts';
import { AssetDetails, getTradeAggregations, TradeAggregation } from '@/lib/stellar';

interface ChartProps {
    asset: AssetDetails;
}

export default function AssetCandlestickChart({ asset }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState(900000); // 15 min default

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Initialize Chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#999',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(42, 46, 57, 0.2)',
            },
            rightPriceScale: {
                borderColor: 'rgba(42, 46, 57, 0.2)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2, // Leave space for volume
                },
            },
            crosshair: {
                vertLine: {
                    labelBackgroundColor: '#222',
                },
                horzLine: {
                    labelBackgroundColor: '#222',
                },
            },
        });

        // Candlestick Series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceLineVisible: true,
            priceFormat: {
                type: 'price',
                precision: 7,
                minMove: 0.0000001,
            },
        });

        // Volume Series (Histogram)
        // We use a custom price scale for volume so it sits at the bottom overlaid
        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // Overlay on the main chart
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8, // Push volume to bottom 20%
                bottom: 0,
            },
        });

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch OHLC data against XLM (native) or USDC
                const counterAsset = asset.code === 'XLM'
                    ? { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }
                    : { code: 'XLM' };

                const data = await getTradeAggregations(
                    { code: asset.code, issuer: asset.issuer },
                    counterAsset,
                    resolution,
                    200 // limit
                );

                // Process Data
                const processedData = data.reverse().map(item => {
                    const close = parseFloat(item.close);
                    const open = parseFloat(item.open);
                    const high = parseFloat(item.high);
                    const low = parseFloat(item.low);

                    // Simple outlier clamping to prevent 1000x wicks from ruining the view
                    // If high is > 5x the larger of open/close, clamp it (heuristic)
                    const bodyMax = Math.max(open, close);
                    const bodyMin = Math.min(open, close);
                    const saneHigh = high > bodyMax * 5 ? bodyMax * 1.5 : high;
                    const saneLow = low < bodyMin * 0.2 ? bodyMin * 0.5 : low;

                    return {
                        time: item.timestamp / 1000 as any,
                        open,
                        high: saneHigh,
                        low: saneLow,
                        close,
                        // Volume color based on price direction
                        color: close >= open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
                        volume: parseFloat(item.base_volume),
                    };
                });

                candlestickSeries.setData(processedData.map(d => ({
                    time: d.time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close
                })));

                volumeSeries.setData(processedData.map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.color
                })));

                // Auto-fit content
                chart.timeScale().fitContent();

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
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 shadow-sm border border-[var(--border-color)]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-[var(--text-primary)] font-semibold text-lg">Price Chart</h3>
                    <span className="text-sm text-[var(--text-muted)]">
                        {asset.code}/{asset.code === 'XLM' ? 'USDC' : 'XLM'}
                    </span>
                </div>
                <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                    {[
                        { label: '15m', value: 900000 },
                        { label: '1h', value: 3600000 },
                        { label: '24h', value: 86400000 },
                        { label: '7d', value: 604800000 }
                    ].map((opt) => (
                        <button
                            key={opt.label}
                            onClick={() => setResolution(opt.value)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${resolution === opt.value
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            <div
                ref={chartContainerRef}
                className="w-full h-[400px] relative rounded-lg overflow-hidden"
            >
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/80 z-20 backdrop-blur-sm">
                        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
