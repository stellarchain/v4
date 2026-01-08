'use client';

import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickSeries, CandlestickData, HistogramSeries } from 'lightweight-charts';
import { AssetDetails, getTradeAggregations, TradeAggregation, getXLMUSDPriceFromHorizon, USDC_ISSUER } from '@/lib/stellar';

interface ChartProps {
    asset: AssetDetails;
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

function formatTimeLabel(timestamp: number, resolution: number): string {
    const date = new Date(timestamp);
    if (resolution >= 86400000) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function AssetCandlestickChart({ asset }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeChartContainerRef = useRef<HTMLDivElement>(null);
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
                // Get XLM/USD price from Horizon for conversion
                const xlmUsdPrice = await getXLMUSDPriceFromHorizon();

                // Fetch OHLC data against XLM (native) or USDC
                const isXLM = asset.code === 'XLM';
                const counterAsset = isXLM
                    ? { code: 'USDC', issuer: USDC_ISSUER }
                    : { code: 'XLM' };

                const data = await getTradeAggregations(
                    { code: asset.code, issuer: asset.issuer },
                    counterAsset,
                    resolution,
                    200 // limit
                );

                // Process Data - convert all prices to USD
                const processedData = data.reverse().map(item => {
                    // Raw prices are in counter asset (USDC for XLM, XLM for others)
                    let close = parseFloat(item.close);
                    let open = parseFloat(item.open);
                    let high = parseFloat(item.high);
                    let low = parseFloat(item.low);

                    // Convert to USD: for non-XLM assets, multiply by XLM/USD rate
                    // For XLM, prices are already in USDC (≈ USD)
                    if (!isXLM) {
                        close *= xlmUsdPrice;
                        open *= xlmUsdPrice;
                        high *= xlmUsdPrice;
                        low *= xlmUsdPrice;
                    }

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

                // Store volume data for volume tab
                const volumePoints: VolumeDataPoint[] = processedData.map((d, i) => ({
                    time: d.time * 1000,
                    timestamp: formatTimeLabel(d.time * 1000, resolution),
                    volume: d.volume,
                    tradeCount: data[data.length - 1 - i]?.trade_count ? parseInt(String(data[data.length - 1 - i].trade_count)) : 0,
                    avgPrice: (d.open + d.close) / 2,
                    priceChange: ((d.close - d.open) / d.open) * 100,
                }));
                setVolumeData(volumePoints);

                // Calculate volume stats
                const volumes = processedData.map(d => d.volume).filter(v => v > 0);
                const trades = volumePoints.map(v => v.tradeCount);
                setVolumeStats({
                    total: volumes.reduce((a, b) => a + b, 0),
                    average: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0,
                    high: Math.max(...volumes, 0),
                    low: volumes.length > 0 ? Math.min(...volumes) : 0,
                    totalTrades: trades.reduce((a, b) => a + b, 0),
                });

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

    // Volume chart effect
    useEffect(() => {
        if (!volumeChartContainerRef.current || viewMode !== 'volume' || volumeData.length === 0) return;

        const chart = createChart(volumeChartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#999',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
            },
            width: volumeChartContainerRef.current.clientWidth,
            height: 250,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(42, 46, 57, 0.2)',
            },
            rightPriceScale: {
                borderColor: 'rgba(42, 46, 57, 0.2)',
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

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'volume',
            },
        });

        volumeSeries.setData(volumeData.map(d => ({
            time: (d.time / 1000) as any,
            value: d.volume,
            color: d.priceChange >= 0 ? 'rgba(38, 166, 154, 0.8)' : 'rgba(239, 83, 80, 0.8)',
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
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 shadow-sm border border-[var(--border-color)]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('price')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-2xl transition-all ${viewMode === 'price'
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Price
                        </button>
                        <button
                            onClick={() => setViewMode('volume')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-2xl transition-all ${viewMode === 'volume'
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Volume
                        </button>
                    </div>
                    <span className="text-sm text-[var(--text-muted)]">
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
                            className={`px-3 py-1 text-xs font-medium rounded-2xl transition-all ${resolution === opt.value
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Chart View */}
            {viewMode === 'price' && (
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
            )}

            {/* Volume View */}
            {viewMode === 'volume' && (
                <div className="space-y-4">
                    {/* Volume Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Total Volume</div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">
                                {formatVolume(volumeStats.total)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Avg Volume</div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">
                                {formatVolume(volumeStats.average)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
                            <div className="text-xs text-[var(--text-muted)] mb-1">High</div>
                            <div className="text-lg font-semibold text-[#26a69a]">
                                {formatVolume(volumeStats.high)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Low</div>
                            <div className="text-lg font-semibold text-[#ef5350]">
                                {formatVolume(volumeStats.low)}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Total Trades</div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">
                                {volumeStats.totalTrades.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Volume Chart */}
                    <div
                        ref={volumeChartContainerRef}
                        className="w-full h-[250px] relative rounded-lg overflow-hidden"
                    >
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/80 z-20 backdrop-blur-sm">
                                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    {/* Volume Data Table */}
                    <div className="bg-[var(--bg-tertiary)] rounded-xl overflow-hidden">
                        <div className="grid grid-cols-5 gap-2 p-3 text-xs font-medium text-[var(--text-muted)] border-b border-[var(--border-color)]">
                            <div>Time</div>
                            <div className="text-right">Volume</div>
                            <div className="text-right">Trades</div>
                            <div className="text-right">Avg Price (USD)</div>
                            <div className="text-right">Change</div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                            {[...volumeData].reverse().slice(0, 20).map((item, idx) => {
                                // Format price based on value
                                const formatPriceDisplay = (price: number) => {
                                    if (price < 0.0001) return '$' + price.toFixed(8);
                                    if (price < 0.01) return '$' + price.toFixed(6);
                                    if (price < 1) return '$' + price.toFixed(4);
                                    return '$' + price.toFixed(2);
                                };

                                return (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-5 gap-2 p-3 text-sm border-b border-[var(--border-color)]/50 last:border-0 hover:bg-[var(--bg-primary)]/50 transition-colors"
                                    >
                                        <div className="text-[var(--text-muted)]">{item.timestamp}</div>
                                        <div className="text-right font-medium text-[var(--text-primary)]">
                                            {formatVolume(item.volume)}
                                        </div>
                                        <div className="text-right text-[var(--text-muted)]">
                                            {item.tradeCount.toLocaleString()}
                                        </div>
                                        <div className="text-right text-[var(--text-primary)]">
                                            {formatPriceDisplay(item.avgPrice)}
                                        </div>
                                        <div className={`text-right font-medium ${item.priceChange >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                                            {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(2)}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
