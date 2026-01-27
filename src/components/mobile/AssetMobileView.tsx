'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { AssetDetails, getTradeAggregations, getXLMUSDPriceFromHorizon, getOrderBook, getAssetTrades, getAssetTradeTransactionHash, getAssetHolders, getAssetTradingPairs, USDC_ISSUER, shortenAddress, OrderBook as OrderBookType, AssetTrade, AssetHolder, TradingPair } from '@/lib/stellar';
import { getXLMHoldersAction } from '@/app/actions/stellar';
import { containers, colors, coreColors, tabs, badges, getPrimaryColor } from '@/lib/design-system';

interface AssetMobileViewProps {
  asset: AssetDetails;
  rank: number;
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

function formatOrderAmount(amount: number): string {
  // Format with commas and consistent 2 decimal places for readability
  if (amount >= 1) {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // For small amounts, show more precision
  if (amount >= 0.0001) {
    return amount.toFixed(5);
  }
  return amount.toFixed(8);
}

// Horizon supported resolutions: 60000, 300000, 900000, 3600000, 86400000, 604800000
const timeframes = [
  { label: '1H', value: 3600000, resolution: 60000, dateFormat: 'time', limit: 60 },       // 1min candles
  { label: '24H', value: 86400000, resolution: 900000, dateFormat: 'time', limit: 96 },    // 15min candles
  { label: '7D', value: 604800000, resolution: 3600000, dateFormat: 'day', limit: 168 },   // 1hr candles
  { label: '30D', value: 2592000000, resolution: 86400000, dateFormat: 'date', limit: 30 }, // daily candles
  { label: '1Y', value: 31536000000, resolution: 604800000, dateFormat: 'month', limit: 52 }, // weekly candles
];

interface ProcessedOrder {
  price: number;
  amount: number;
  total: number;
}

export default function AssetMobileView({ asset, rank }: AssetMobileViewProps) {
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
  const [orderBookView, setOrderBookView] = useState<'both' | 'bids' | 'asks'>('both');

  // Trade history state
  const [trades, setTrades] = useState<AssetTrade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [initialTradesLoad, setInitialTradesLoad] = useState(true);
  const [tradesCursor, setTradesCursor] = useState<string | null>(null);
  const [hasMoreTrades, setHasMoreTrades] = useState(true);
  const [loadingMoreTrades, setLoadingMoreTrades] = useState(false);
  const [navigatingTradeId, setNavigatingTradeId] = useState<string | null>(null);
  const tradesEndRef = useRef<HTMLDivElement>(null);

  // Tab state for trade history / asset holders / markets
  const [activeTab, setActiveTab] = useState<'trades' | 'holders' | 'markets'>('trades');

  // Asset holders state - pre-fetched on page load
  const [allHolders, setAllHolders] = useState<AssetHolder[]>([]); // Full sorted list
  const [displayedHoldersCount, setDisplayedHoldersCount] = useState(20); // How many to show
  const [holdersLoading, setHoldersLoading] = useState(true); // Loading all holders
  const [holdersTotalSupply, setHoldersTotalSupply] = useState(0);
  const holdersEndRef = useRef<HTMLDivElement>(null);

  // Markets/trading pairs state - pre-fetched on page load
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

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

        // Calculate time range
        const rangeEnd = Date.now();
        const rangeStart = rangeEnd - timeframe.value;

        const data = await getTradeAggregations(
          { code: asset.code, issuer: asset.issuer },
          counterAsset,
          timeframe.resolution,
          timeframe.limit,
          rangeStart,
          rangeEnd
        );

        // First pass: get all close prices to calculate median
        // Data is already in chronological order (asc) from API
        const rawData = data.map(item => {
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

  // Fetch trade history
  useEffect(() => {
    const fetchTrades = async () => {
      setTradesLoading(true);
      setTrades([]);
      setTradesCursor(null);
      setHasMoreTrades(true);
      try {
        const data = await getAssetTrades(asset.code, asset.issuer, 20);
        setTrades(data._embedded.records);
        // Set cursor for next page from last record's paging_token
        const records = data._embedded.records;
        if (records.length > 0) {
          setTradesCursor(records[records.length - 1].paging_token);
        }
        setHasMoreTrades(records.length === 20);
      } catch (e) {
        console.error('Failed to fetch trades', e);
      }
      setTradesLoading(false);
      setInitialTradesLoad(false);
    };

    fetchTrades();
  }, [asset]);

  // Load more trades function
  const loadMoreTrades = async () => {
    if (loadingMoreTrades || !hasMoreTrades || !tradesCursor) return;

    setLoadingMoreTrades(true);
    try {
      const data = await getAssetTrades(asset.code, asset.issuer, 20, 'desc', tradesCursor);
      const newRecords = data._embedded.records;
      setTrades(prev => [...prev, ...newRecords]);
      if (newRecords.length > 0) {
        setTradesCursor(newRecords[newRecords.length - 1].paging_token);
      }
      setHasMoreTrades(newRecords.length === 20);
    } catch (e) {
      console.error('Failed to load more trades', e);
    }
    setLoadingMoreTrades(false);
  };

  // Infinite scroll observer for trades
  useEffect(() => {
    if (!tradesEndRef.current || !hasMoreTrades) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMoreTrades && hasMoreTrades) {
          loadMoreTrades();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(tradesEndRef.current);
    return () => observer.disconnect();
  }, [hasMoreTrades, loadingMoreTrades, tradesCursor]);

  // Handle trade click - navigate to transaction
  const handleTradeClick = async (trade: AssetTrade) => {
    setNavigatingTradeId(trade.id);
    try {
      const txHash = await getAssetTradeTransactionHash(trade);
      if (txHash) {
        router.push(`/transaction/${txHash}`);
      }
    } catch (e) {
      console.error('Failed to navigate to transaction', e);
    }
    setNavigatingTradeId(null);
  };

  // Pre-fetch ALL asset holders on page load (runs in background)
  useEffect(() => {
    if (!asset.issuer && asset.code !== 'XLM') {
      setHoldersLoading(false);
      return;
    }

    const fetchAllHolders = async () => {
      setHoldersLoading(true);
      const allFetched: AssetHolder[] = [];
      let cursor: string | undefined;
      const maxPages = 25; // Fetch up to 500 holders (25 pages × 20)
      let pageCount = 0;

      try {
        while (pageCount < maxPages) {
          const data = asset.code === 'XLM'
            ? await getXLMHoldersAction(20, cursor)
            : await getAssetHolders(asset.code, asset.issuer || '', 20, cursor);

          allFetched.push(...data.holders);

          if (!data.nextCursor) break; // No more pages
          cursor = data.nextCursor;
          pageCount++;
        }

        // Sort all holders by balance descending
        allFetched.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
        setAllHolders(allFetched);
        setHoldersTotalSupply(asset.total_supply || allFetched.reduce((sum, h) => sum + parseFloat(h.balance), 0));
      } catch (e) {
        console.error('Failed to fetch holders', e);
      }
      setHoldersLoading(false);
    };

    fetchAllHolders();
  }, [asset]);

  // Show more holders (just increases the display count from pre-loaded list)
  const showMoreHolders = () => {
    setDisplayedHoldersCount(prev => Math.min(prev + 20, allHolders.length));
  };

  // Infinite scroll observer for holders - just shows more from pre-loaded list
  useEffect(() => {
    if (!holdersEndRef.current || activeTab !== 'holders') return;
    if (displayedHoldersCount >= allHolders.length) return; // All shown

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedHoldersCount < allHolders.length) {
          showMoreHolders();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(holdersEndRef.current);
    return () => observer.disconnect();
  }, [displayedHoldersCount, allHolders.length, activeTab]);

  // Pre-fetch trading pairs/markets on page load
  useEffect(() => {
    const fetchTradingPairs = async () => {
      setMarketsLoading(true);
      try {
        const pairs = await getAssetTradingPairs(asset.code, asset.issuer);
        setTradingPairs(pairs);
      } catch (e) {
        console.error('Failed to fetch trading pairs', e);
      }
      setMarketsLoading(false);
    };

    fetchTradingPairs();
  }, [asset.code, asset.issuer]);

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
    <div className="w-full bg-[var(--bg-primary)] min-h-screen pb-24 font-sans relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] px-4 py-3">
        {/* Top Row: Back, Asset Info */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {asset.image ? (
              <img src={asset.image} alt={asset.code} className="w-7 h-7 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#0F4C81]/10 flex items-center justify-center">
                <span className="text-xs font-bold text-[#0F4C81]">{asset.code[0]}</span>
              </div>
            )}
            <span className="font-bold text-lg text-[var(--text-primary)]">{asset.code}</span>
            <span className="text-[var(--text-muted)] text-sm">/ USD</span>
          </div>
        </div>

        {/* Price Row */}
        <div className="mt-3">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Price</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-[#0F4C81]">{formatPrice(asset.price_usd)}</div>
            <div className={`px-3 py-1.5 rounded-lg ${isPositive ? 'bg-[var(--success)]' : 'bg-[var(--error)]'} flex items-center gap-0.5`}>
              <span className="text-white text-xs">{isPositive ? '▲' : '▼'}</span>
              <span className="text-white text-sm font-bold">{Math.abs(change24h).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-start justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">MCap</div>
            <div className="text-sm font-bold text-[#0F4C81] mt-0.5">${formatNumber(asset.market_cap)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Volume 24h</div>
            <div className="text-sm font-bold text-[#0F4C81] mt-0.5">${formatNumber(asset.volume_24h)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Holders</div>
            <div className="text-sm font-bold text-[#0F4C81] mt-0.5">{formatNumber(asset.holders || 0)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Rank</div>
            <div className="text-sm font-bold text-[#0F4C81] mt-0.5">#{rank > 0 ? rank : '-'}</div>
          </div>
        </div>
        {asset.code !== 'XLM' && asset.issuer && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-muted)]">Issuer:</span>
            <Link href={`/account/${asset.issuer}`} className="text-xs font-mono text-[var(--text-tertiary)] hover:text-[#0F4C81]">
              {shortenAddress(asset.issuer, 6)}
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">

        {/* Chart Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-2">
          {/* Timeframe Selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf.label}
                  onClick={() => setSelectedTimeframe(tf.label)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${selectedTimeframe === tf.label
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
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
                        <div className="w-0.5 bg-[var(--border-default)] rounded" style={{ height: `${h * 0.15}px` }} />
                        <div className={`w-2 rounded-sm ${i % 3 === 0 ? 'bg-[var(--error)]/20' : 'bg-[var(--success)]/20'}`} style={{ height: `${h}px` }} />
                        <div className="w-0.5 bg-[var(--border-default)] rounded" style={{ height: `${h * 0.1}px` }} />
                      </div>
                    ))}
                  </div>
                  {/* Volume bars */}
                  <div className="flex items-end justify-around h-[40px] gap-1">
                    {[20, 35, 25, 40, 30, 45, 28, 38, 32, 42, 26, 36, 30, 44, 34, 40, 28, 46, 32, 38].map((h, i) => (
                      <div key={i} className={`w-2 rounded-sm ${i % 3 === 0 ? 'bg-[var(--error)]/10' : 'bg-[var(--success)]/10'}`} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            ) : hasChartData ? (
              <>
                {/* Tooltip */}
                {tooltipData && (
                  <div className="absolute top-0 left-0 z-20 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none">
                    <div className="text-[var(--text-muted)] mb-1">{tooltipData.time}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <span className="text-[var(--text-muted)]">O:</span>
                      <span className="font-mono">{formatPrice(tooltipData.open)}</span>
                      <span className="text-[var(--text-muted)]">H:</span>
                      <span className="font-mono text-[var(--success)]">{formatPrice(tooltipData.high)}</span>
                      <span className="text-[var(--text-muted)]">L:</span>
                      <span className="font-mono text-[var(--error)]">{formatPrice(tooltipData.low)}</span>
                      <span className="text-[var(--text-muted)]">C:</span>
                      <span className={`font-mono ${tooltipData.close >= tooltipData.open ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                        {formatPrice(tooltipData.close)}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chartContainerRef} className="w-full h-[240px]" />
              </>
            ) : (
              /* No data state */
              <div className="w-full h-[240px] flex items-center justify-center text-[var(--text-muted)] text-xs">
                No chart data available
              </div>
            )}
          </div>

          {/* Price Change Row */}
          <div className="flex justify-between pt-3 mt-2 border-t border-[var(--border-subtle)]">
            {loading && initialChartLoad ? (
              <>
                {['24 hours', '7 days', '30 days', '90 days', 'YTD'].map((label) => (
                  <div key={label} className="text-center animate-pulse flex-1">
                    <p className="text-[10px] text-[var(--text-tertiary)] mb-0.5">{label}</p>
                    <div className="h-4 w-10 bg-[var(--border-default)] rounded mx-auto"></div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <PriceChangeItem label="24 hours" value={asset.change_24h} />
                <PriceChangeItem label="7 days" value={asset.change_7d} />
                <PriceChangeItem label="30 days" value={asset.change_30d} />
                <PriceChangeItem label="90 days" value={asset.change_90d} />
                <PriceChangeItem label="YTD" value={asset.change_1y} />
              </>
            )}
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-default)]">
            <h3 className="text-sm font-bold" style={{ color: 'var(--primary-blue)' }}>Statistics</h3>
          </div>

          {/* 24h Range */}
          {asset.price_high_24h > 0 && asset.price_low_24h > 0 && (
            <div className="p-4 border-b border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">24h Range</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-mono text-[var(--text-secondary)]">{formatPrice(asset.price_low_24h)}</span>
                <span className="font-mono text-[var(--text-secondary)]">{formatPrice(asset.price_high_24h)}</span>
              </div>
              <div className="relative h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--error)] via-[var(--text-muted)] to-[var(--success)] rounded-full" />
                {asset.price_high_24h > asset.price_low_24h && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-[var(--bg-secondary)] rounded-full top-1/2 -translate-y-1/2 shadow-md border border-[var(--border-default)]"
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
          <div className="divide-y divide-[var(--border-subtle)]">
            <StatRow label="Market Cap" value={`$${formatNumber(asset.market_cap)}`} />
            <StatRow label="24h Volume" value={`$${formatNumber(asset.volume_24h)}`} />
            <StatRow label="Circulating Supply" value={`${formatNumber(asset.circulating_supply)} ${asset.code}`} />
            <StatRow label="Total Supply" value={`${formatNumber(asset.total_supply)} ${asset.code}`} />
            {asset.holders > 0 && <StatRow label="Holders" value={formatNumber(asset.holders)} />}
            {asset.trades_24h > 0 && <StatRow label="24h Trades" value={formatNumber(asset.trades_24h)} />}
            {asset.payments_24h > 0 && <StatRow label="24h Payments" value={formatNumber(asset.payments_24h)} />}
          </div>
        </div>

        {/* Order Book Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--primary-blue)' }}>Order Book</h3>
              {/* View Toggles */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOrderBookView('both')}
                  className={`p-1.5 rounded transition-colors ${orderBookView === 'both' ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-primary)]'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="2" width="6" height="3" fill="#22C55E" />
                    <rect x="1" y="6.5" width="6" height="3" fill="#22C55E" />
                    <rect x="1" y="11" width="6" height="3" fill="#22C55E" />
                    <rect x="9" y="2" width="6" height="3" fill="#EF4444" />
                    <rect x="9" y="6.5" width="6" height="3" fill="#EF4444" />
                    <rect x="9" y="11" width="6" height="3" fill="#EF4444" />
                  </svg>
                </button>
                <button
                  onClick={() => setOrderBookView('bids')}
                  className={`p-1.5 rounded transition-colors ${orderBookView === 'bids' ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-primary)]'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="2" width="6" height="3" fill="#22C55E" />
                    <rect x="1" y="6.5" width="6" height="3" fill="#22C55E" />
                    <rect x="1" y="11" width="6" height="3" fill="#22C55E" />
                    <rect x="9" y="2" width="6" height="3" fill="#CBD5E1" opacity="0.5" />
                    <rect x="9" y="6.5" width="6" height="3" fill="#CBD5E1" opacity="0.5" />
                    <rect x="9" y="11" width="6" height="3" fill="#CBD5E1" opacity="0.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setOrderBookView('asks')}
                  className={`p-1.5 rounded transition-colors ${orderBookView === 'asks' ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-primary)]'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="2" width="6" height="3" fill="#CBD5E1" opacity="0.5" />
                    <rect x="1" y="6.5" width="6" height="3" fill="#CBD5E1" opacity="0.5" />
                    <rect x="1" y="11" width="6" height="3" fill="#CBD5E1" opacity="0.5" />
                    <rect x="9" y="2" width="6" height="3" fill="#EF4444" />
                    <rect x="9" y="6.5" width="6" height="3" fill="#EF4444" />
                    <rect x="9" y="11" width="6" height="3" fill="#EF4444" />
                  </svg>
                </button>
              </div>
            </div>
            {!orderBookLoading && orderBook && spread > 0 && (
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {spreadPercent.toFixed(2)}%
              </span>
            )}
          </div>

          {orderBookLoading && initialOrderBookLoad ? (
            /* Order Book Skeleton */
            <div className="text-[11px] font-mono animate-pulse">
              <div className="grid grid-cols-2 border-b border-[var(--border-subtle)]">
                <div className="grid grid-cols-2 px-3 py-2 text-[var(--text-muted)] font-bold text-[11px] uppercase">
                  <div>Amount</div>
                  <div className="text-right">Price</div>
                </div>
                <div className="grid grid-cols-2 px-3 py-2 text-[var(--text-muted)] font-bold text-[11px] uppercase border-l border-[var(--border-subtle)]">
                  <div>Price</div>
                  <div className="text-right">Amount</div>
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div>
                  {[60, 75, 45, 80, 55, 70, 65, 50].map((w, i) => (
                    <div key={`bid-skel-${i}`} className="relative grid grid-cols-2 px-3 py-1.5">
                      <div className="absolute top-0 bottom-0 left-0 bg-[var(--success)]/10" style={{ width: `${w}%` }} />
                      <div className="relative h-3 w-10 bg-[var(--border-default)] rounded" />
                      <div className="relative h-3 w-12 bg-[var(--border-default)] rounded ml-auto" />
                    </div>
                  ))}
                </div>
                <div className="border-l border-[var(--border-subtle)]">
                  {[70, 55, 80, 45, 65, 50, 75, 60].map((w, i) => (
                    <div key={`ask-skel-${i}`} className="relative grid grid-cols-2 px-3 py-1.5">
                      <div className="absolute top-0 bottom-0 right-0 bg-[var(--error)]/10" style={{ width: `${w}%` }} />
                      <div className="relative h-3 w-12 bg-[var(--border-default)] rounded" />
                      <div className="relative h-3 w-10 bg-[var(--border-default)] rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : hasOrderBookData ? (
            <div className="text-[11px] font-mono">
              {/* Side-by-side headers */}
              <div className={`grid ${orderBookView === 'both' ? 'grid-cols-2' : 'grid-cols-1'} border-b border-[var(--border-subtle)]`}>
                {(orderBookView === 'both' || orderBookView === 'bids') && (
                  <div className="flex items-center justify-between px-3 py-2 text-[var(--text-muted)] font-semibold text-[11px] uppercase tracking-wide">
                    {orderBookView === 'both' ? <span>Amount</span> : <span>Price</span>}
                    {orderBookView === 'both' ? <span>Price</span> : <span>Amount</span>}
                  </div>
                )}
                {(orderBookView === 'both' || orderBookView === 'asks') && (
                  <div className={`flex items-center justify-between px-3 py-2 text-[var(--text-muted)] font-semibold text-[11px] uppercase tracking-wide ${orderBookView === 'both' ? 'border-l border-[var(--border-subtle)]' : ''}`}>
                    <span>Price</span>
                    <span>Amount</span>
                  </div>
                )}
              </div>

              {/* Side-by-side order rows */}
              <div className={`grid ${orderBookView === 'both' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Bids Column (Buy Orders) - Green */}
                {(orderBookView === 'both' || orderBookView === 'bids') && (
                  <div className="font-mono">
                    {processedBids.slice(0, 10).map((bid, i) => {
                      const percent = (bid.total / maxTotal) * 100;
                      return (
                        <div key={`bid-${i}`} className="relative flex items-center justify-between px-3 py-[7px]">
                          <div className="absolute top-0 bottom-0 left-0 bg-[var(--success)]/12" style={{ width: `${percent}%` }} />
                          {orderBookView === 'both' ? (
                            <>
                              <span className="relative text-[var(--text-secondary)] tabular-nums">{formatOrderAmount(bid.amount)}</span>
                              <span className="relative text-[var(--success)] tabular-nums">{formatOrderPrice(bid.price)}</span>
                            </>
                          ) : (
                            <>
                              <span className="relative text-[var(--success)] tabular-nums">{formatOrderPrice(bid.price)}</span>
                              <span className="relative text-[var(--text-secondary)] tabular-nums">{formatOrderAmount(bid.amount)}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Asks Column (Sell Orders) - Red */}
                {(orderBookView === 'both' || orderBookView === 'asks') && (
                  <div className={`font-mono ${orderBookView === 'both' ? 'border-l border-[var(--border-subtle)]' : ''}`}>
                    {processedAsks.slice(0, 10).map((ask, i) => {
                      const percent = (ask.total / maxTotal) * 100;
                      return (
                        <div key={`ask-${i}`} className="relative flex items-center justify-between px-3 py-[7px]">
                          <div className="absolute top-0 bottom-0 right-0 bg-[var(--error)]/12" style={{ width: `${percent}%` }} />
                          <span className="relative text-[var(--error)] tabular-nums">{formatOrderPrice(ask.price)}</span>
                          <span className="relative text-[var(--text-secondary)] tabular-nums">{formatOrderAmount(ask.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No data state */
            <div className="py-8 text-center text-[var(--text-muted)] text-xs">
              No order book data available
            </div>
          )}
        </div>

        {/* Converter Section */}
        <AssetConverterMobile asset={asset} />

        {/* About Section */}
        {(asset.description || asset.domain || asset.issuer) && (
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
            <div className="p-4">
              {/* Header with icon */}
              <div className="flex items-center gap-3 mb-4">
                {asset.image ? (
                  <img src={asset.image} alt={asset.code} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--text-tertiary)]">{asset.code[0]}</span>
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--primary-blue)' }}>{asset.code}</h3>
                  {asset.domain && (
                    <a
                      href={`https://${asset.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline" style={{ color: 'var(--primary-blue)' }}
                    >
                      https://{asset.domain}
                    </a>
                  )}
                </div>
              </div>

              {/* Description */}
              {asset.description && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{asset.description}</p>
              )}

              {/* Issuer */}
              {asset.issuer && (
                <div className="mb-3">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Issuer:</span>
                  <Link
                    href={`/account/${asset.issuer}`}
                    className="block text-xs font-mono mt-1 break-all hover:underline" style={{ color: 'var(--primary-blue)' }}
                  >
                    {asset.issuer}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trade History & Asset Holders Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
          {/* Tab Header */}
          <div className="px-4 py-3 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('trades')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'trades'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
              >
                Trades
              </button>
              <button
                onClick={() => setActiveTab('markets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'markets'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
              >
                Markets
              </button>
              <button
                onClick={() => setActiveTab('holders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'holders'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
              >
                Holders
              </button>
            </div>
          </div>

          {/* Trade History Tab */}
          {activeTab === 'trades' && (
            <>
              {tradesLoading && initialTradesLoad ? (
                /* Trade History Skeleton */
                <div className="divide-y divide-[var(--border-subtle)] animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-20 bg-[var(--border-default)] rounded" />
                        <div className="h-3 w-16 bg-[var(--border-default)] rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-40 bg-[var(--border-default)] rounded" />
                        <div className="h-3 w-12 bg-[var(--border-default)] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : trades.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {trades.map((trade) => {
                    const baseCode = trade.base_asset_type === 'native' ? 'XLM' : (trade.base_asset_code || 'Unknown');
                    const counterCode = trade.counter_asset_type === 'native' ? 'XLM' : (trade.counter_asset_code || 'Unknown');
                    const baseAmount = parseFloat(trade.base_amount);
                    const counterAmount = parseFloat(trade.counter_amount);
                    const priceValue = trade.price.d > 0 ? (trade.price.n / trade.price.d) : 0;
                    const account = trade.base_account || trade.counter_account || '';
                    const tradeTime = new Date(trade.ledger_close_time);

                    // Determine if this trade involved our asset as base or counter
                    const isBaseAsset = (baseCode === asset.code);
                    const displayBaseCode = isBaseAsset ? baseCode : counterCode;
                    const displayCounterCode = isBaseAsset ? counterCode : baseCode;
                    const displayBaseAmount = isBaseAsset ? baseAmount : counterAmount;
                    const displayCounterAmount = isBaseAsset ? counterAmount : baseAmount;

                    const isNavigating = navigatingTradeId === trade.id;

                    return (
                      <button
                        key={trade.id}
                        onClick={() => handleTradeClick(trade)}
                        disabled={isNavigating}
                        className="w-full p-3 text-left hover:bg-[var(--bg-tertiary)] transition-colors active:bg-[var(--bg-primary)] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/account/${account}`);
                            }}
                            className="text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                          >
                            {shortenAddress(account, 4)}
                          </span>
                          <div className="flex items-center gap-2">
                            {isNavigating && (
                              <svg className="w-3 h-3 animate-spin text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {tradeTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' '}
                              {tradeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                            <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-mono font-medium text-[var(--text-primary)]">
                              {displayBaseAmount >= 1000 ? displayBaseAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : displayBaseAmount.toFixed(4)}
                            </span>
                            <span className="text-[var(--text-muted)]">{displayBaseCode}</span>
                            <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="font-mono font-medium text-[var(--text-primary)]">
                              {displayCounterAmount >= 1000 ? displayCounterAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : displayCounterAmount.toFixed(4)}
                            </span>
                            <span className="text-[var(--text-muted)]">{displayCounterCode}</span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                            @{priceValue >= 1 ? priceValue.toFixed(4) : priceValue.toFixed(7)}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Infinite scroll trigger */}
                  <div ref={tradesEndRef} className="h-1" />

                  {/* Loading more indicator */}
                  {loadingMoreTrades && (
                    <div className="p-4 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs text-[var(--text-muted)]">Loading more trades...</span>
                    </div>
                  )}

                  {/* End of trades indicator */}
                  {!hasMoreTrades && trades.length >= 20 && (
                    <div className="p-3 text-center text-[11px] text-[var(--text-muted)]">
                      All trades loaded
                    </div>
                  )}
                </div>
              ) : (
                /* No trades state */
                <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                  No recent trades
                </div>
              )}
            </>
          )}

          {/* Markets Tab */}
          {activeTab === 'markets' && (
            <>
              {marketsLoading ? (
                /* Markets Skeleton */
                <div className="divide-y divide-[var(--border-subtle)] animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-24 bg-[var(--border-default)] rounded" />
                      </div>
                      <div className="text-right">
                        <div className="h-3 w-16 bg-[var(--border-default)] rounded mb-1" />
                        <div className="h-2 w-20 bg-[var(--border-default)] rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                  <div className="p-3 text-center text-[11px] text-[var(--text-muted)]">
                    Loading trading pairs...
                  </div>
                </div>
              ) : tradingPairs.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {/* Header */}
                  <div className="px-3 py-2 bg-[var(--bg-tertiary)] grid grid-cols-[1fr_auto] text-[10px] text-[var(--text-muted)] font-bold uppercase">
                    <span>Trading Pair</span>
                    <span className="text-right">Exchange Rate</span>
                  </div>

                  {tradingPairs.map((pair) => {
                    // Format price - shows how much of counter asset you get for 1 base asset
                    const formatRate = (price: number) => {
                      if (price >= 1000000) return (price / 1000000).toFixed(2) + 'M';
                      if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
                      if (price >= 1) return price.toFixed(4);
                      if (price >= 0.0001) return price.toFixed(6);
                      return price.toFixed(8);
                    };

                    // Skip pairs where both assets have the same code (different issuers)
                    // but show them with clearer labeling
                    const isSameCode = asset.code === pair.counterAsset.code;
                    const counterLabel = isSameCode && pair.counterAsset.issuer
                      ? `${pair.counterAsset.code} (${shortenAddress(pair.counterAsset.issuer, 4)})`
                      : pair.counterAsset.code;

                    return (
                      <div
                        key={`${pair.counterAsset.code}-${pair.counterAsset.issuer || 'native'}`}
                        className="p-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-primary)]">
                              {asset.code} → {pair.counterAsset.code}
                            </div>
                            {pair.counterAsset.issuer && pair.counterAsset.type !== 'native' && (
                              <Link href={`/account/${pair.counterAsset.issuer}`} className="text-[10px] font-mono text-[var(--text-muted)] truncate hover:text-[var(--primary-blue)] block">
                                {shortenAddress(pair.counterAsset.issuer, 6)}
                              </Link>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-[var(--text-primary)]">
                              <span className="text-[var(--text-muted)]">1 {asset.code} = </span>
                              <span className="font-mono font-bold">{formatRate(pair.price)}</span>
                              <span className="text-[var(--text-muted)]"> {pair.counterAsset.code}</span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">
                              {pair.totalTradeCount} trade{pair.totalTradeCount !== 1 ? 's' : ''} recently
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer with explanation */}
                  <div className="p-3 text-center text-[11px] text-[var(--text-muted)]">
                    {tradingPairs.length} trading pair{tradingPairs.length !== 1 ? 's' : ''} with recent activity
                  </div>
                </div>
              ) : (
                /* No markets state */
                <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                  No active trading pairs found
                </div>
              )}
            </>
          )}

          {/* Asset Holders Tab */}
          {activeTab === 'holders' && (
            <>
              {/* XLM native asset - can't query holders */}
              {holdersLoading ? (
                /* Holders Skeleton - loading in background */
                <div className="divide-y divide-[var(--border-subtle)] animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[var(--border-default)] rounded-full" />
                        <div className="h-3 w-24 bg-[var(--border-default)] rounded" />
                      </div>
                      <div className="text-right">
                        <div className="h-3 w-20 bg-[var(--border-default)] rounded mb-1" />
                        <div className="h-2 w-12 bg-[var(--border-default)] rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                  <div className="p-3 text-center text-[11px] text-[var(--text-muted)]">
                    Loading all holders...
                  </div>
                </div>
              ) : allHolders.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {/* Header showing total count */}
                  <div className="px-3 py-2 bg-[var(--bg-tertiary)] text-[11px] text-[var(--text-muted)]">
                    {allHolders.length} holders sorted by balance
                  </div>

                  {allHolders.slice(0, displayedHoldersCount).map((holder, index) => {
                    const balance = parseFloat(holder.balance);
                    const percentage = holdersTotalSupply > 0 ? (balance / holdersTotalSupply) * 100 : 0;

                    // Format percentage based on size
                    const formatPercentage = (pct: number) => {
                      if (pct >= 1) return pct.toFixed(2) + '%';
                      if (pct >= 0.01) return pct.toFixed(2) + '%';
                      if (pct >= 0.0001) return pct.toFixed(4) + '%';
                      if (pct > 0) return '< 0.0001%';
                      return '0%';
                    };

                    return (
                      <Link
                        key={holder.account_id}
                        href={`/account/${holder.account_id}`}
                        className="flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)] transition-colors active:bg-[var(--bg-primary)]"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] w-5 text-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-mono text-[var(--text-secondary)] truncate">
                            {shortenAddress(holder.account_id, 6)}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs font-mono font-medium text-[var(--text-primary)]">
                            {balance >= 1000000
                              ? (balance / 1000000).toFixed(2) + 'M'
                              : balance >= 1000
                                ? (balance / 1000).toFixed(2) + 'K'
                                : balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            <span className="text-[var(--text-muted)] ml-1">{asset.code}</span>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            ({formatPercentage(percentage)})
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {/* Infinite scroll trigger */}
                  {displayedHoldersCount < allHolders.length && (
                    <div ref={holdersEndRef} className="h-1" />
                  )}

                  {/* End of holders indicator */}
                  {displayedHoldersCount >= allHolders.length && (
                    <div className="p-3 text-center text-[11px] text-[var(--text-muted)]">
                      Showing all {allHolders.length} holders
                    </div>
                  )}
                </div>
              ) : (
                /* No holders state */
                <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                  No holders found
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <span className="text-xs font-bold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function PriceChangeItem({ label, value }: { label: string; value?: number | null }) {
  const hasValue = value !== undefined && value !== null;
  const val = value ?? 0;
  const isPositive = val >= 0;

  return (
    <div className="text-center flex-1">
      <p className="text-[10px] text-[var(--text-tertiary)] mb-0.5">{label}</p>
      {hasValue ? (
        <p className={`text-[11px] font-bold ${isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(val).toFixed(2)}%
        </p>
      ) : (
        <p className="text-[11px] font-bold text-[var(--text-muted)]">N/A</p>
      )}
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
    <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <h3 className="text-sm font-bold" style={{ color: 'var(--primary-blue)' }}>{asset.code} to USD Converter</h3>
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
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl py-2.5 px-3 pr-16 text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--primary-blue)] transition-colors"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-bold text-xs">
            {asset.code}
          </span>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center">
          <div className="w-7 h-7 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl py-2.5 px-3 pr-16 text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--primary-blue)] transition-colors"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-bold text-xs">
            USD
          </span>
        </div>

        <p className="text-[var(--text-muted)] text-[11px] text-center">
          1 {asset.code} = ${asset.price_usd >= 1 ? asset.price_usd.toFixed(2) : asset.price_usd.toFixed(6)} USD
        </p>
      </div>
    </div>
  );
}
