'use client';

import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { AssetDetails, getTradeAggregations, getXLMUSDPriceFromHorizon, USDC_ISSUER } from '@/lib/stellar';

interface ChartProps {
    asset: AssetDetails;
    className?: string;
}

interface VolumeDataPoint {
    time: number;
    timestamp: string;
    volume: number;
    tradeCount: number;
    avgPrice: number;
    priceChange: number;
}

function formatVolume(value: number): string {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(2) + 'K';
    return value.toFixed(2);
}

function formatTooltipPrice(price: number): string {
    if (price < 0.0001) return '$' + price.toFixed(8);
    if (price < 0.01) return '$' + price.toFixed(6);
    if (price < 1) return '$' + price.toFixed(4);
    return '$' + price.toFixed(2);
}

function formatTimeLabel(timestamp: number, resolution: number): string {
    const date = new Date(timestamp);
    if (resolution >= 86400000) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function AssetCandlestickChart({ asset, className }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeChartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<ReturnType<typeof createChart> | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState(900000); // 15 min default
    const [viewMode, setViewMode] = useState<'price' | 'volume'>('price');
    const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
    const [volumeStats, setVolumeStats] = useState({
        total: 0,
        average: 0,
        high: 0,
        low: 0,
        totalTrades: 0,
    });
    const [tooltipData, setTooltipData] = useState<{
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        time: string;
    } | null>(null);

    // Refs for infinite scroll state
    const allCandleDataRef = useRef<{ time: any; open: number; high: number; low: number; close: number }[]>([]);
    const allVolumeDataRef = useRef<{ time: any; value: number; color: string }[]>([]);
    const earliestTimestampRef = useRef<number>(0);
    const isFetchingMoreRef = useRef(false);
    const xlmUsdPriceRef = useRef<number>(0);
    const noMoreDataRef = useRef(false);

    useEffect(() => {
        if (!chartContainerRef.current) return;
        let cancelled = false;

        // Reset infinite scroll state on resolution/asset change
        allCandleDataRef.current = [];
        allVolumeDataRef.current = [];
        earliestTimestampRef.current = 0;
        isFetchingMoreRef.current = false;
        noMoreDataRef.current = false;

        // Initialize Chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#64748b',
            },
            grid: {
                vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
                horzLines: { color: 'rgba(148, 163, 184, 0.1)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 320,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(148, 163, 184, 0.2)',
            },
            rightPriceScale: {
                borderColor: 'rgba(148, 163, 184, 0.2)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            crosshair: {
                vertLine: {
                    labelBackgroundColor: '#1e293b',
                },
                horzLine: {
                    labelBackgroundColor: '#1e293b',
                },
            },
        });

        chartInstanceRef.current = chart;

        // Candlestick Series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e',
            priceLineVisible: true,
            priceFormat: {
                type: 'price',
                precision: 7,
                minMove: 0.0000001,
            },
        });

        // Volume Series (Histogram)
        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        const isXLM = asset.code === 'XLM';
        const counterAsset = isXLM
            ? { code: 'USDC', issuer: USDC_ISSUER }
            : { code: 'XLM' };

        const processRawData = (data: any[], xlmUsdPrice: number) => {
            return data.map(item => {
                let close = parseFloat(item.close);
                let open = parseFloat(item.open);
                let high = parseFloat(item.high);
                let low = parseFloat(item.low);

                if (!isXLM) {
                    close *= xlmUsdPrice;
                    open *= xlmUsdPrice;
                    high *= xlmUsdPrice;
                    low *= xlmUsdPrice;
                }

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
                    color: close >= open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(244, 63, 94, 0.5)',
                    volume: parseFloat(item.base_volume),
                };
            });
        };

        const fetchData = async () => {
            setLoading(true);
            try {
                const xlmUsdPrice = await getXLMUSDPriceFromHorizon();
                xlmUsdPriceRef.current = xlmUsdPrice;
                if (cancelled) return;

                const data = await getTradeAggregations(
                    { code: asset.code, issuer: asset.issuer },
                    counterAsset,
                    resolution,
                    200
                );
                if (cancelled) return;

                const processedData = processRawData(data.reverse(), xlmUsdPrice);

                if (processedData.length > 0) {
                    earliestTimestampRef.current = processedData[0].time * 1000;
                }

                const candleData = processedData.map(d => ({
                    time: d.time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close
                }));

                const volData = processedData.map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.color
                }));

                allCandleDataRef.current = candleData;
                allVolumeDataRef.current = volData;

                if (cancelled) return;
                candlestickSeries.setData(candleData);
                volumeSeries.setData(volData);

                const volumePoints: VolumeDataPoint[] = processedData.map((d, i) => ({
                    time: d.time * 1000,
                    timestamp: formatTimeLabel(d.time * 1000, resolution),
                    volume: d.volume,
                    tradeCount: data[data.length - 1 - i]?.trade_count ? parseInt(String(data[data.length - 1 - i].trade_count)) : 0,
                    avgPrice: (d.open + d.close) / 2,
                    priceChange: ((d.close - d.open) / d.open) * 100,
                }));
                if (cancelled) return;
                setVolumeData(volumePoints);

                const volumes = processedData.map(d => d.volume).filter(v => v > 0);
                const trades = volumePoints.map(v => v.tradeCount);
                setVolumeStats({
                    total: volumes.reduce((a, b) => a + b, 0),
                    average: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0,
                    high: Math.max(...volumes, 0),
                    low: volumes.length > 0 ? Math.min(...volumes) : 0,
                    totalTrades: trades.reduce((a, b) => a + b, 0),
                });

                chart.timeScale().fitContent();

            } catch (error) {
                console.error("Failed to fetch candlestick data", error);
            }
            if (!cancelled) setLoading(false);
        };

        // Fetch older data when scrolling to the left edge
        const fetchOlderData = async () => {
            if (isFetchingMoreRef.current || noMoreDataRef.current || cancelled) return;
            isFetchingMoreRef.current = true;

            try {
                const endTime = earliestTimestampRef.current;
                if (!endTime) return;

                const data = await getTradeAggregations(
                    { code: asset.code, issuer: asset.issuer },
                    counterAsset,
                    resolution,
                    200,
                    undefined,
                    endTime
                );
                if (cancelled) return;

                if (data.length === 0) {
                    noMoreDataRef.current = true;
                    return;
                }

                const processedData = processRawData(data.reverse(), xlmUsdPriceRef.current);

                // Filter out any duplicates
                const existingTimes = new Set(allCandleDataRef.current.map(d => d.time));
                const newCandles = processedData
                    .filter(d => !existingTimes.has(d.time))
                    .map(d => ({
                        time: d.time,
                        open: d.open,
                        high: d.high,
                        low: d.low,
                        close: d.close
                    }));

                const newVolumes = processedData
                    .filter(d => !existingTimes.has(d.time))
                    .map(d => ({
                        time: d.time,
                        value: d.volume,
                        color: d.color
                    }));

                if (newCandles.length === 0) {
                    noMoreDataRef.current = true;
                    return;
                }

                // Prepend older data
                allCandleDataRef.current = [...newCandles, ...allCandleDataRef.current];
                allVolumeDataRef.current = [...newVolumes, ...allVolumeDataRef.current];
                earliestTimestampRef.current = newCandles[0].time * 1000;

                candlestickSeries.setData(allCandleDataRef.current);
                volumeSeries.setData(allVolumeDataRef.current);

            } catch (error) {
                console.error("Failed to fetch older chart data", error);
            } finally {
                isFetchingMoreRef.current = false;
            }
        };

        fetchData();

        // Subscribe to visible range changes for infinite scroll
        const onVisibleRangeChange = (newRange: any) => {
            if (cancelled || !newRange) return;
            // When the user scrolls so that the left edge of visible data is near the beginning
            if (newRange.from < 10) {
                fetchOlderData();
            }
        };
        chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChange);

        // Subscribe to crosshair for OHLC tooltip
        const crosshairHandler = (param: any) => {
            if (cancelled) return;
            if (!param.time || !param.seriesData.size) {
                setTooltipData(null);
                return;
            }

            const candleData = param.seriesData.get(candlestickSeries);
            const volData = param.seriesData.get(volumeSeries);
            if (candleData && 'open' in candleData) {
                const date = new Date((param.time as number) * 1000);
                const timeStr = resolution >= 86400000
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

                setTooltipData({
                    open: candleData.open,
                    high: candleData.high,
                    low: candleData.low,
                    close: candleData.close,
                    volume: volData && 'value' in volData ? (volData as any).value : 0,
                    time: timeStr,
                });
            }
        };

        chart.subscribeCrosshairMove(crosshairHandler);

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight || 320,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        // Also observe container size changes from grid layout
        const ro = new ResizeObserver(handleResize);
        if (chartContainerRef.current) ro.observe(chartContainerRef.current);

        return () => {
            cancelled = true;
            chartInstanceRef.current = null;
            ro.disconnect();
            window.removeEventListener('resize', handleResize);
            chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRangeChange);
            chart.unsubscribeCrosshairMove(crosshairHandler);
            chart.remove();
        };
    }, [asset, resolution]);

    // Resize price chart when switching back from volume view
    useEffect(() => {
        if (viewMode === 'price' && chartInstanceRef.current && chartContainerRef.current) {
            // Use requestAnimationFrame to ensure DOM has updated layout
            requestAnimationFrame(() => {
                if (chartInstanceRef.current && chartContainerRef.current) {
                    chartInstanceRef.current.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                        height: chartContainerRef.current.clientHeight || 320,
                    });
                }
            });
        }
    }, [viewMode]);

    // Volume chart effect
    useEffect(() => {
        if (!volumeChartContainerRef.current || viewMode !== 'volume' || volumeData.length === 0) return;

        const chart = createChart(volumeChartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#64748b',
            },
            grid: {
                vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
                horzLines: { color: 'rgba(148, 163, 184, 0.1)' },
            },
            width: volumeChartContainerRef.current.clientWidth,
            height: 200,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(148, 163, 184, 0.2)',
            },
            rightPriceScale: {
                borderColor: 'rgba(148, 163, 184, 0.2)',
            },
            crosshair: {
                vertLine: {
                    labelBackgroundColor: '#1e293b',
                },
                horzLine: {
                    labelBackgroundColor: '#1e293b',
                },
            },
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'volume',
            },
        });

        volumeSeries.setData(volumeData.map(d => ({
            time: (d.time / 1000) as any,
            value: d.volume,
            color: d.priceChange >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)',
        })));

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (volumeChartContainerRef.current) {
                chart.applyOptions({ width: volumeChartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [viewMode, volumeData]);

    return (
        <div className={`bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] shadow-sm p-4 overflow-hidden flex flex-col ${className || ''}`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('price')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'price'
                                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            Price
                        </button>
                        <button
                            onClick={() => setViewMode('volume')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'volume'
                                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            Volume
                        </button>
                    </div>
                    <span className="text-sm text-[var(--text-tertiary)]">
                        {asset.code}/USD
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
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${resolution === opt.value
                                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Chart View */}
            <div className={`relative flex-1 flex flex-col ${viewMode !== 'price' ? 'hidden' : ''}`}>
                    <div
                        ref={chartContainerRef}
                        className="w-full flex-1 min-h-[200px] relative rounded-lg overflow-hidden"
                    >
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/80 z-20 backdrop-blur-sm">
                                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    {/* OHLC Tooltip */}
                    {tooltipData && !loading && (
                        <div className="absolute top-2 left-2 z-30 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] text-[11px] rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                            <div className="text-[var(--text-muted)] mb-1.5 font-medium">{tooltipData.time}</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <span className="text-[var(--text-muted)]">O</span>
                                <span className="font-mono text-right">{formatTooltipPrice(tooltipData.open)}</span>
                                <span className="text-[var(--text-muted)]">H</span>
                                <span className="font-mono text-right text-emerald-400">{formatTooltipPrice(tooltipData.high)}</span>
                                <span className="text-[var(--text-muted)]">L</span>
                                <span className="font-mono text-right text-rose-400">{formatTooltipPrice(tooltipData.low)}</span>
                                <span className="text-[var(--text-muted)]">C</span>
                                <span className={`font-mono text-right ${tooltipData.close >= tooltipData.open ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatTooltipPrice(tooltipData.close)}
                                </span>
                                {tooltipData.volume > 0 && (
                                    <>
                                        <span className="text-[var(--text-muted)]">Vol</span>
                                        <span className="font-mono text-right">{formatVolume(tooltipData.volume)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            {/* Volume View */}
            <div className={`space-y-4 ${viewMode !== 'volume' ? 'hidden' : ''}`}>
                    {/* Volume Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)]">
                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Total Volume</div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">
                                {formatVolume(volumeStats.total)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)]">
                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Avg Volume</div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">
                                {formatVolume(volumeStats.average)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)]">
                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">High</div>
                            <div className="text-lg font-semibold text-emerald-600">
                                {formatVolume(volumeStats.high)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)]">
                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Low</div>
                            <div className="text-lg font-semibold text-rose-600">
                                {formatVolume(volumeStats.low)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)]">
                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Total Trades</div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">
                                {volumeStats.totalTrades.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Volume Chart */}
                    <div
                        ref={volumeChartContainerRef}
                        className="w-full h-[200px] relative rounded-lg overflow-hidden"
                    >
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/80 z-20 backdrop-blur-sm">
                                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    {/* Volume Data Table */}
                    <div className="bg-[var(--bg-tertiary)] rounded-xl overflow-hidden border border-[var(--border-subtle)]">
                        <div className="grid grid-cols-5 gap-2 p-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-default)]">
                            <div>Time</div>
                            <div className="text-right">Volume</div>
                            <div className="text-right">Trades</div>
                            <div className="text-right">Avg Price (USD)</div>
                            <div className="text-right">Change</div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                            {[...volumeData].reverse().slice(0, 20).map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-5 gap-2 p-3 text-sm border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
                                    >
                                        <div className="text-[var(--text-tertiary)]">{item.timestamp}</div>
                                        <div className="text-right font-medium text-[var(--text-primary)]">
                                            {formatVolume(item.volume)}
                                        </div>
                                        <div className="text-right text-[var(--text-tertiary)]">
                                            {item.tradeCount.toLocaleString()}
                                        </div>
                                        <div className="text-right text-[var(--text-primary)]">
                                            {formatTooltipPrice(item.avgPrice)}
                                        </div>
                                        <div className={`text-right font-medium ${item.priceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(2)}%
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
        </div>
    );
}
