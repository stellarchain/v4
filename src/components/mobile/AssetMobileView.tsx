'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { AssetDetails, getTradeAggregations, getXLMUSDPriceFromHorizon, getOrderBook, USDC_ISSUER, shortenAddress, OrderBook as OrderBookType } from '@/lib/stellar';

interface AssetMobileViewProps {
  asset: AssetDetails;
}

function formatNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

function formatOrderPrice(price: number): string {
  if (price < 0.0001) return price.toFixed(8);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

const timeframes = [
  { label: '1H', value: 3600000, resolution: 60000, dateFormat: 'time' },
  { label: '24H', value: 86400000, resolution: 3600000, dateFormat: 'time' },
  { label: '7D', value: 604800000, resolution: 14400000, dateFormat: 'day' },
  { label: '30D', value: 2592000000, resolution: 86400000, dateFormat: 'date' },
  { label: '1Y', value: 31536000000, resolution: 604800000, dateFormat: 'month' },
];

interface ProcessedOrder {
  price: number;
  amount: number;
  total: number;
}

export default function AssetMobileView({ asset }: AssetMobileViewProps) {
  const router = useRouter();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24H');
  const [loading, setLoading] = useState(true);
  const [initialChartLoad, setInitialChartLoad] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [tooltipData, setTooltipData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    time: string;
    visible: boolean;
  } | null>(null);

  // Order book state
  const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);
  const [processedBids, setProcessedBids] = useState<ProcessedOrder[]>([]);
  const [processedAsks, setProcessedAsks] = useState<ProcessedOrder[]>([]);
  const [orderBookLoading, setOrderBookLoading] = useState(true);
  const [initialOrderBookLoad, setInitialOrderBookLoad] = useState(true);

  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const timeframe = timeframes.find(t => t.label === selectedTimeframe) || timeframes[1];
        const xlmUsdPrice = await getXLMUSDPriceFromHorizon();

        const isXLM = asset.code === 'XLM';
        const counterAsset = isXLM
          ? { code: 'USDC', issuer: USDC_ISSUER }
          : { code: 'XLM' };

        // Calculate time range based on timeframe
        const endTime = Date.now();
        const startTime = timeframe.value > 0 ? endTime - timeframe.value : undefined;

        const data = await getTradeAggregations(
          { code: asset.code, issuer: asset.issuer },
          counterAsset,
          timeframe.resolution,
          200, // Fetch more data points for better chart
          startTime,
          endTime
        );

        // First pass: get all close prices to calculate median
        const rawData = data.reverse().map(item => {
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

          return {
            time: item.timestamp / 1000 as any,
            open,
            high,
            low,
            close,
            volume: parseFloat(item.base_volume),
          };
        });

        // Calculate median close price to detect outliers
        const closePrices = rawData.map(d => d.close).filter(p => p > 0).sort((a, b) => a - b);
        const medianPrice = closePrices[Math.floor(closePrices.length / 2)] || 0;

        // Define acceptable range (3x median as upper bound, 0.1x as lower)
        const upperBound = medianPrice * 3;
        const lowerBound = medianPrice * 0.1;

        // Second pass: sanitize outliers and limit wick length
        const processedData = rawData.map(item => {
          let { open, high, low, close } = item;

          const bodyHigh = Math.max(open, close);
          const bodyLow = Math.min(open, close);
          const bodySize = bodyHigh - bodyLow || bodyHigh * 0.01; // Avoid zero

          // Limit wicks to max 50% of body size (or 1% of price if body is tiny)
          const maxWickSize = Math.max(bodySize * 0.5, medianPrice * 0.01);

          // Clamp high/low to reasonable wick lengths
          high = Math.min(high, bodyHigh + maxWickSize);
          low = Math.max(low, bodyLow - maxWickSize);

          // Also clamp to overall bounds
          if (high > upperBound) high = bodyHigh + maxWickSize;
          if (low < lowerBound) low = bodyLow - maxWickSize;

          return {
            ...item,
            open,
            high,
            low,
            close,
            color: close >= open ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
          };
        });

        setChartData(processedData);
      } catch (error) {
        console.error('Failed to fetch chart data', error);
      }
      setLoading(false);
      setInitialChartLoad(false);
    };

    fetchChartData();
  }, [asset, selectedTimeframe]);

  // Fetch order book
  useEffect(() => {
    const fetchOrderBook = async () => {
      setOrderBookLoading(true);
      try {
        const xlmPrice = await getXLMUSDPriceFromHorizon();
        const isXLM = asset.code === 'XLM';

        const base = { code: asset.code, issuer: asset.issuer };
        const counter = isXLM
          ? { code: 'USDC', issuer: USDC_ISSUER }
          : { code: 'XLM' };

        const data = await getOrderBook(counter, base, 10);

        let finalData = data;
        const samplePrice = data.bids.length > 0 ? parseFloat(data.bids[0].price) : (data.asks.length > 0 ? parseFloat(data.asks[0].price) : 0);

        if (isXLM && samplePrice > 1.0) {
          finalData = {
            base: data.base,
            counter: data.counter,
            bids: data.asks.map(o => {
              const p = parseFloat(o.price);
              const a = parseFloat(o.amount);
              return { price: (1 / p).toFixed(7), amount: (a * p).toFixed(7), price_r: o.price_r };
            }),
            asks: data.bids.map(o => {
              const p = parseFloat(o.price);
              const a = parseFloat(o.amount);
              return { price: (1 / p).toFixed(7), amount: (a * p).toFixed(7), price_r: o.price_r };
            })
          };
        }

        setOrderBook(finalData);

        const processOrders = (orders: typeof data.bids): ProcessedOrder[] => {
          return orders.map(order => {
            let price = parseFloat(order.price);
            const amount = parseFloat(order.amount);
            if (!isXLM) {
              price = xlmPrice / price;
            }
            return { price, amount, total: price * amount };
          });
        };

        setProcessedBids(processOrders(finalData.bids));
        setProcessedAsks(processOrders(finalData.asks));
      } catch (e) {
        console.error(e);
      }
      setOrderBookLoading(false);
      setInitialOrderBookLoad(false);
    };

    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 15000);
    return () => clearInterval(interval);
  }, [asset]);

  // Render chart
  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    const currentTimeframe = timeframes.find(t => t.label === selectedTimeframe) || timeframes[1];

    // Format time axis based on timeframe
    const formatTimeLabel = (time: number) => {
      const date = new Date(time * 1000);
      switch (currentTimeframe.dateFormat) {
        case 'time':
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        case 'day':
          return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        case 'date':
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case 'month':
          return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        default:
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94A3B8',
        fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)', style: 1 },
        horzLines: { color: 'rgba(148, 163, 184, 0.06)', style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: 240,
      timeScale: {
        timeVisible: currentTimeframe.dateFormat === 'time',
        secondsVisible: false,
        borderVisible: false,
        tickMarkFormatter: formatTimeLabel,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      crosshair: {
        vertLine: { labelBackgroundColor: '#1E293B', color: 'rgba(148, 163, 184, 0.2)' },
        horzLine: { labelBackgroundColor: '#1E293B', color: 'rgba(148, 163, 184, 0.2)' },
      },
      handleScale: false,
      handleScroll: false,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
      priceFormat: { type: 'price', precision: 6, minMove: 0.000001 },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    candlestickSeries.setData(chartData.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })));

    volumeSeries.setData(chartData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.color,
    })));

    chart.timeScale().fitContent();

    // Subscribe to crosshair move for tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setTooltipData(null);
        return;
      }

      const data = param.seriesData.get(candlestickSeries);
      if (data && 'open' in data) {
        const date = new Date((param.time as number) * 1000);
        const timeStr = currentTimeframe.dateFormat === 'time'
          ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        setTooltipData({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          time: timeStr,
          visible: true,
        });
      }
    });

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
  }, [chartData, selectedTimeframe]);

  const change24h = asset.change_24h || 0;
  const isPositive = change24h >= 0;

  // Order book calculations
  const bestBid = processedBids.length > 0 ? processedBids[0].price : 0;
  const bestAsk = processedAsks.length > 0 ? processedAsks[0].price : 0;
  const spread = bestAsk - bestBid;
  const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
  const allOrders = [...processedBids, ...processedAsks];
  const maxTotal = Math.max(...allOrders.map(o => o.total), 1);

  // Check if we have meaningful data to show
  const hasChartData = chartData.length > 2;
  const hasOrderBookData = processedBids.some(b => b.amount > 0 && b.price > 0) ||
                           processedAsks.some(a => a.amount > 0 && a.price > 0);

  return (
    <div className="w-full bg-[#f0f4f3] min-h-screen pb-24 font-sans relative">
      {/* Header Section */}
      <header className="pt-6 px-4 pb-4 sticky top-0 z-20 bg-[#f0f4f3]/90 backdrop-blur-md">
        {/* Top Row: Back + Title */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {asset.image ? (
            <img src={asset.image} alt={asset.code} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{asset.code[0]}</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{asset.code}</h1>
            <p className="text-xs text-slate-500">{asset.name}</p>
          </div>
        </div>

        {/* Price Card */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold text-slate-900">
              {formatPrice(asset.price_usd)}
            </span>
            <span className={`ml-2 text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{change24h.toFixed(2)}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm text-slate-500">
              {asset.price_xlm.toFixed(4)} XLM
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-2 py-2 space-y-2">

        {/* Chart Section */}
        <div className="rounded-xl p-2">
          {/* Timeframe Selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf.label}
                  onClick={() => setSelectedTimeframe(tf.label)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    selectedTimeframe === tf.label
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart or Skeleton */}
          <div className="relative">
            {loading && initialChartLoad ? (
              /* Chart Skeleton */
              <div className="w-full h-[240px] animate-pulse">
                <div className="h-full flex flex-col justify-end gap-1 px-2">
                  {/* Fake candlesticks */}
                  <div className="flex items-end justify-around h-[180px] gap-1">
                    {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65, 70, 55, 60, 75, 68, 72, 58, 82, 63, 77].map((h, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div className="w-0.5 bg-slate-200 rounded" style={{ height: `${h * 0.15}px` }} />
                        <div className={`w-2 rounded-sm ${i % 3 === 0 ? 'bg-red-200' : 'bg-emerald-200'}`} style={{ height: `${h}px` }} />
                        <div className="w-0.5 bg-slate-200 rounded" style={{ height: `${h * 0.1}px` }} />
                      </div>
                    ))}
                  </div>
                  {/* Volume bars */}
                  <div className="flex items-end justify-around h-[40px] gap-1">
                    {[20, 35, 25, 40, 30, 45, 28, 38, 32, 42, 26, 36, 30, 44, 34, 40, 28, 46, 32, 38].map((h, i) => (
                      <div key={i} className={`w-2 rounded-sm ${i % 3 === 0 ? 'bg-red-100' : 'bg-emerald-100'}`} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            ) : hasChartData ? (
              <>
                {/* Tooltip */}
                {tooltipData && (
                  <div className="absolute top-0 left-0 z-20 bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none">
                    <div className="text-slate-400 mb-1">{tooltipData.time}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <span className="text-slate-400">O:</span>
                      <span className="font-mono">{formatPrice(tooltipData.open)}</span>
                      <span className="text-slate-400">H:</span>
                      <span className="font-mono text-emerald-400">{formatPrice(tooltipData.high)}</span>
                      <span className="text-slate-400">L:</span>
                      <span className="font-mono text-red-400">{formatPrice(tooltipData.low)}</span>
                      <span className="text-slate-400">C:</span>
                      <span className={`font-mono ${tooltipData.close >= tooltipData.open ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatPrice(tooltipData.close)}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chartContainerRef} className="w-full h-[240px]" />
              </>
            ) : (
              /* No data state */
              <div className="w-full h-[240px] flex items-center justify-center text-slate-400 text-xs">
                No chart data available
              </div>
            )}
          </div>

          {/* Price Change Row */}
          <div className="flex justify-around pt-3 mt-2 border-t border-slate-100">
            {loading && initialChartLoad ? (
              <>
                {['1 hour', '24 hours', '7 days'].map((label) => (
                  <div key={label} className="text-center animate-pulse">
                    <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                    <div className="h-4 w-12 bg-slate-200 rounded mx-auto"></div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <PriceChangeItem label="1 hour" value={asset.change_1h} />
                <PriceChangeItem label="24 hours" value={asset.change_24h} />
                <PriceChangeItem label="7 days" value={asset.change_7d} />
              </>
            )}
          </div>
        </div>

        {/* Order Book Section */}
        <div className="rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Order Book</h3>
            {!orderBookLoading && orderBook && spread > 0 && (
              <span className="text-[10px] font-medium text-slate-400">
                Spread: ${formatOrderPrice(spread)} ({spreadPercent.toFixed(2)}%)
              </span>
            )}
          </div>

          {orderBookLoading && initialOrderBookLoad ? (
            /* Order Book Skeleton */
            <div className="text-[10px] font-mono animate-pulse">
              {/* Header */}
              <div className="grid grid-cols-3 px-4 py-2 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-50">
                <div>Price (USD)</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Total</div>
              </div>

              {/* Skeleton Asks */}
              <div className="flex flex-col-reverse">
                {[70, 55, 80, 45, 65, 50].map((w, i) => (
                  <div key={`ask-skel-${i}`} className="relative grid grid-cols-3 px-4 py-1.5">
                    <div className="absolute top-0 bottom-0 right-0 bg-red-100" style={{ width: `${w}%` }} />
                    <div className="relative h-3 w-16 bg-slate-200 rounded" />
                    <div className="relative h-3 w-12 bg-slate-200 rounded ml-auto" />
                    <div className="relative h-3 w-14 bg-slate-200 rounded ml-auto" />
                  </div>
                ))}
              </div>

              {/* Spread indicator skeleton */}
              <div className="py-2 border-y border-slate-200 flex items-center justify-center">
                <div className="h-4 w-16 bg-slate-200 rounded" />
              </div>

              {/* Skeleton Bids */}
              <div>
                {[60, 75, 45, 80, 55, 70].map((w, i) => (
                  <div key={`bid-skel-${i}`} className="relative grid grid-cols-3 px-4 py-1.5">
                    <div className="absolute top-0 bottom-0 right-0 bg-emerald-100" style={{ width: `${w}%` }} />
                    <div className="relative h-3 w-16 bg-slate-200 rounded" />
                    <div className="relative h-3 w-12 bg-slate-200 rounded ml-auto" />
                    <div className="relative h-3 w-14 bg-slate-200 rounded ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : hasOrderBookData ? (
            <div className="text-[10px] font-mono">
              {/* Header */}
              <div className="grid grid-cols-3 px-4 py-2 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-50">
                <div>Price (USD)</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Total</div>
              </div>

              {/* Asks (Sell) - reversed so lowest is at bottom */}
              <div className="flex flex-col-reverse">
                {processedAsks.slice(0, 6).map((ask, i) => {
                  const percent = (ask.total / maxTotal) * 100;
                  return (
                    <div key={`ask-${i}`} className="relative grid grid-cols-3 px-4 py-1.5">
                      <div className="absolute top-0 bottom-0 right-0 bg-red-500/10" style={{ width: `${percent}%` }} />
                      <div className="relative text-red-500">${formatOrderPrice(ask.price)}</div>
                      <div className="relative text-right text-slate-700">{ask.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      <div className="relative text-right text-slate-400">${ask.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                  );
                })}
              </div>

              {/* Spread indicator */}
              <div className="py-2 border-y border-slate-200 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-900">
                  ${bestBid > 0 ? formatOrderPrice((bestAsk + bestBid) / 2) : '---'}
                </span>
              </div>

              {/* Bids (Buy) */}
              <div>
                {processedBids.slice(0, 6).map((bid, i) => {
                  const percent = (bid.total / maxTotal) * 100;
                  return (
                    <div key={`bid-${i}`} className="relative grid grid-cols-3 px-4 py-1.5">
                      <div className="absolute top-0 bottom-0 right-0 bg-emerald-500/10" style={{ width: `${percent}%` }} />
                      <div className="relative text-emerald-500">${formatOrderPrice(bid.price)}</div>
                      <div className="relative text-right text-slate-700">{bid.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      <div className="relative text-right text-slate-400">${bid.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* No data state */
            <div className="py-8 text-center text-slate-400 text-xs">
              No order book data available
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Statistics</h3>
          </div>

          {/* 24h Range */}
          {asset.price_high_24h > 0 && asset.price_low_24h > 0 && (
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">24h Range</span>
              </div>
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span className="font-mono text-slate-700">{formatPrice(asset.price_low_24h)}</span>
                <span className="font-mono text-slate-700">{formatPrice(asset.price_high_24h)}</span>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-slate-300 to-emerald-400 rounded-full" />
                {asset.price_high_24h > asset.price_low_24h && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-white rounded-full top-1/2 -translate-y-1/2 shadow-md border border-slate-200"
                    style={{
                      left: `${Math.min(100, Math.max(0, ((asset.price_usd - asset.price_low_24h) / (asset.price_high_24h - asset.price_low_24h)) * 100))}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Market Stats */}
          <div className="divide-y divide-slate-200">
            <StatRow label="Market Cap" value={`$${formatNumber(asset.market_cap)}`} />
            <StatRow label="24h Volume" value={`$${formatNumber(asset.volume_24h)}`} />
            <StatRow label="Circulating Supply" value={`${formatNumber(asset.circulating_supply)} ${asset.code}`} />
            <StatRow label="Total Supply" value={`${formatNumber(asset.total_supply)} ${asset.code}`} />
            {asset.holders > 0 && <StatRow label="Holders" value={formatNumber(asset.holders)} />}
            {asset.trades_24h > 0 && <StatRow label="24h Trades" value={formatNumber(asset.trades_24h)} />}
            {asset.payments_24h > 0 && <StatRow label="24h Payments" value={formatNumber(asset.payments_24h)} />}
          </div>
        </div>

        {/* Converter Section */}
        <AssetConverterMobile asset={asset} />

        {/* About Section */}
        {(asset.description || asset.domain || asset.issuer) && (
          <div className="rounded-xl overflow-hidden">
            <div className="p-4">
              {/* Header with icon */}
              <div className="flex items-center gap-3 mb-4">
                {asset.image ? (
                  <img src={asset.image} alt={asset.code} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-500">{asset.code[0]}</span>
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">{asset.code}</h3>
                  {asset.domain && (
                    <a
                      href={`https://${asset.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      https://{asset.domain}
                    </a>
                  )}
                </div>
              </div>

              {/* Description */}
              {asset.description && (
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{asset.description}</p>
              )}

              {/* Issuer */}
              {asset.issuer && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issuer:</span>
                  <Link
                    href={`/account/${asset.issuer}`}
                    className="block text-xs text-blue-500 font-mono mt-1 break-all hover:underline"
                  >
                    {asset.issuer}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-bold text-slate-900">{value}</span>
    </div>
  );
}

function PriceChangeItem({ label, value }: { label: string; value?: number }) {
  const val = value ?? 0;
  const isPositive = val >= 0;

  return (
    <div className="text-center">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={`text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? '▲' : '▼'} {Math.abs(val).toFixed(2)}%
      </p>
    </div>
  );
}

function AssetConverterMobile({ asset }: { asset: AssetDetails }) {
  const [assetAmount, setAssetAmount] = useState<string>('1');
  const [usdAmount, setUsdAmount] = useState<string>(asset.price_usd.toFixed(asset.price_usd >= 1 ? 2 : 6));
  const [activeInput, setActiveInput] = useState<'asset' | 'usd'>('asset');

  useEffect(() => {
    if (activeInput === 'asset') {
      const amount = parseFloat(assetAmount) || 0;
      setUsdAmount((amount * asset.price_usd).toFixed(asset.price_usd >= 1 ? 2 : 6));
    }
  }, [assetAmount, asset.price_usd, activeInput]);

  useEffect(() => {
    if (activeInput === 'usd') {
      const amount = parseFloat(usdAmount) || 0;
      if (asset.price_usd > 0) {
        setAssetAmount((amount / asset.price_usd).toFixed(asset.price_usd >= 1 ? 4 : 2));
      }
    }
  }, [usdAmount, asset.price_usd, activeInput]);

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900">{asset.code} to USD Converter</h3>
      </div>
      <div className="p-4 space-y-3">
        {/* Asset Input */}
        <div className="relative">
          <input
            type="number"
            value={assetAmount}
            onChange={(e) => {
              setActiveInput('asset');
              setAssetAmount(e.target.value);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 pr-16 text-slate-900 font-mono text-sm focus:outline-none focus:border-slate-400 transition-colors"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
            {asset.code}
          </span>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center">
          <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>

        {/* USD Input */}
        <div className="relative">
          <input
            type="number"
            value={usdAmount}
            onChange={(e) => {
              setActiveInput('usd');
              setUsdAmount(e.target.value);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 pr-16 text-slate-900 font-mono text-sm focus:outline-none focus:border-slate-400 transition-colors"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
            USD
          </span>
        </div>

        <p className="text-slate-400 text-[10px] text-center">
          1 {asset.code} = ${asset.price_usd >= 1 ? asset.price_usd.toFixed(2) : asset.price_usd.toFixed(6)} USD
        </p>
      </div>
    </div>
  );
}
