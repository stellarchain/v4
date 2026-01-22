'use client';

import { useState, useEffect } from 'react';
import { AssetDetails, getOrderBook, OrderBook as OrderBookType, getXLMUSDPriceFromHorizon, USDC_ISSUER } from '@/lib/stellar';

interface OrderBookProps {
    asset: AssetDetails;
}

interface ProcessedOrder {
    price: number;
    amount: number;
    total: number;
}

type ViewMode = 'both' | 'bids' | 'asks';

export default function AssetOrderBook({ asset }: OrderBookProps) {
    const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);
    const [processedBids, setProcessedBids] = useState<ProcessedOrder[]>([]);
    const [processedAsks, setProcessedAsks] = useState<ProcessedOrder[]>([]);
    const [xlmUsdPrice, setXlmUsdPrice] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('both');

    useEffect(() => {
        const fetchOrderBook = async () => {
            setLoading(true);
            try {
                // Get XLM/USD price from Horizon for conversion
                const xlmPrice = await getXLMUSDPriceFromHorizon();
                setXlmUsdPrice(xlmPrice);
                const isXLM = asset.code === 'XLM';

                const base = { code: asset.code, issuer: asset.issuer };
                // If asset is XLM, Counter is USDC. If asset is Token, Counter is XLM.
                const counter = isXLM
                    ? { code: 'USDC', issuer: USDC_ISSUER }
                    : { code: 'XLM' };

                const data = await getOrderBook(counter, base, 15);

                // DATA CORRECTION for XLM/USDC inversion
                let finalData = data;
                const samplePrice = data.bids.length > 0 ? parseFloat(data.bids[0].price) : (data.asks.length > 0 ? parseFloat(data.asks[0].price) : 0);

                if (isXLM && samplePrice > 1.0) {
                    // Invert prices for XLM/USDC pair
                    finalData = {
                        base: data.base,
                        counter: data.counter,
                        bids: data.asks.map(o => {
                            const p = parseFloat(o.price);
                            const a = parseFloat(o.amount);
                            return {
                                price: (1 / p).toFixed(7),
                                amount: (a * p).toFixed(7),
                                price_r: o.price_r
                            };
                        }),
                        asks: data.bids.map(o => {
                            const p = parseFloat(o.price);
                            const a = parseFloat(o.amount);
                            return {
                                price: (1 / p).toFixed(7),
                                amount: (a * p).toFixed(7),
                                price_r: o.price_r
                            };
                        })
                    };
                }

                setOrderBook(finalData);

                // Process orders - convert to USD
                const processOrders = (orders: typeof data.bids): ProcessedOrder[] => {
                    return orders.map(order => {
                        let price = parseFloat(order.price);
                        const amount = parseFloat(order.amount);

                        // Convert to USD
                        // For XLM: price is already in USDC (≈ USD)
                        // For non-XLM: Horizon returns price as "buying_asset per selling_asset"
                        // i.e., SHX per XLM, so we need to invert: (XLM/USD) / (SHX/XLM) = USD/SHX
                        if (!isXLM) {
                            price = xlmPrice / price;
                        }

                        return {
                            price,
                            amount,
                            total: price * amount
                        };
                    });
                };

                setProcessedBids(processOrders(finalData.bids));
                setProcessedAsks(processOrders(finalData.asks));

            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchOrderBook();

        // Refresh every 15s
        const interval = setInterval(fetchOrderBook, 15000);
        return () => clearInterval(interval);
    }, [asset]);

    if (loading && !orderBook) return <div className="h-[500px] flex items-center justify-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div></div>;
    if (!orderBook || processedBids.length === 0 && processedAsks.length === 0) return null;

    // Calculate Spread and Last Price in USD
    const bestBid = processedBids.length > 0 ? processedBids[0].price : 0;
    const bestAsk = processedAsks.length > 0 ? processedAsks[0].price : 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
    const midPrice = (bestAsk + bestBid) / 2;

    // Max total for background bars
    const allOrders = [...processedBids, ...processedAsks];
    const maxTotal = Math.max(...allOrders.map(o => o.total), 1);

    // Format price based on value
    const formatPrice = (price: number) => {
        if (price < 0.0001) return price.toFixed(8);
        if (price < 0.01) return price.toFixed(6);
        if (price < 1) return price.toFixed(4);
        return price.toFixed(2);
    };

    // Toggle button component
    const ViewToggle = ({ mode, icon }: { mode: ViewMode; icon: React.ReactNode }) => (
        <button
            onClick={() => setViewMode(mode)}
            className={`p-1.5 rounded transition-colors ${
                viewMode === mode
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
        >
            {icon}
        </button>
    );

    // Icons for the toggles
    const BothIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="6" height="3" fill="var(--success)" />
            <rect x="1" y="6.5" width="6" height="3" fill="var(--success)" />
            <rect x="1" y="11" width="6" height="3" fill="var(--success)" />
            <rect x="9" y="2" width="6" height="3" fill="var(--error)" />
            <rect x="9" y="6.5" width="6" height="3" fill="var(--error)" />
            <rect x="9" y="11" width="6" height="3" fill="var(--error)" />
        </svg>
    );

    const BidsIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="6" height="3" fill="var(--success)" />
            <rect x="1" y="6.5" width="6" height="3" fill="var(--success)" />
            <rect x="1" y="11" width="6" height="3" fill="var(--success)" />
            <rect x="9" y="2" width="6" height="3" fill="var(--text-muted)" opacity="0.3" />
            <rect x="9" y="6.5" width="6" height="3" fill="var(--text-muted)" opacity="0.3" />
            <rect x="9" y="11" width="6" height="3" fill="var(--text-muted)" opacity="0.3" />
        </svg>
    );

    const AsksIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="6" height="3" fill="var(--text-muted)" opacity="0.3" />
            <rect x="1" y="6.5" width="6" height="3" fill="var(--text-muted)" opacity="0.3" />
            <rect x="1" y="11" width="6" height="3" fill="var(--text-muted)" opacity="0.3" />
            <rect x="9" y="2" width="6" height="3" fill="var(--error)" />
            <rect x="9" y="6.5" width="6" height="3" fill="var(--error)" />
            <rect x="9" y="11" width="6" height="3" fill="var(--error)" />
        </svg>
    );

    const showBids = viewMode === 'both' || viewMode === 'bids';
    const showAsks = viewMode === 'both' || viewMode === 'asks';

    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden h-full flex flex-col">
            {/* Header with toggles */}
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-[var(--text-primary)] font-semibold">Order Book</h3>
                    <div className="flex items-center gap-1 ml-2">
                        <ViewToggle mode="both" icon={<BothIcon />} />
                        <ViewToggle mode="bids" icon={<BidsIcon />} />
                        <ViewToggle mode="asks" icon={<AsksIcon />} />
                    </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                    Spread: <span className="text-[var(--text-primary)]">${formatPrice(spread)}</span> ({spreadPercent.toFixed(2)}%)
                </div>
            </div>

            {/* Side-by-side orderbook */}
            <div className="flex-1 overflow-hidden min-h-[400px] flex flex-col text-xs font-mono">
                {/* Column Headers */}
                <div className={`grid ${viewMode === 'both' ? 'grid-cols-2' : 'grid-cols-1'} border-b border-[var(--border-color)]`}>
                    {showBids && (
                        <div className="grid grid-cols-2 p-2 text-[var(--text-muted)]">
                            <div>Amount</div>
                            <div className="text-right">Price</div>
                        </div>
                    )}
                    {showAsks && (
                        <div className={`grid grid-cols-2 p-2 text-[var(--text-muted)] ${viewMode === 'both' ? 'border-l border-[var(--border-color)]' : ''}`}>
                            <div>Price</div>
                            <div className="text-right">Amount</div>
                        </div>
                    )}
                </div>

                {/* Order rows */}
                <div className="flex-1 overflow-y-auto">
                    <div className={`grid ${viewMode === 'both' ? 'grid-cols-2' : 'grid-cols-1'} h-full`}>
                        {/* Bids Column (Buy Orders) - Green */}
                        {showBids && (
                            <div className="flex flex-col">
                                {processedBids.slice(0, 15).map((bid, i) => {
                                    const percent = (bid.total / maxTotal) * 100;
                                    return (
                                        <div key={`bid-${i}`} className="relative grid grid-cols-2 py-1.5 px-2 hover:bg-[var(--bg-tertiary)] cursor-pointer">
                                            <div
                                                className="absolute top-0 bottom-0 left-0 bg-[var(--success)] opacity-[0.12]"
                                                style={{ width: `${percent}%` }}
                                            />
                                            <div className="relative text-[var(--text-primary)]">{bid.amount.toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                                            <div className="relative text-right text-[var(--success)]">{formatPrice(bid.price)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Asks Column (Sell Orders) - Red */}
                        {showAsks && (
                            <div className={`flex flex-col ${viewMode === 'both' ? 'border-l border-[var(--border-color)]' : ''}`}>
                                {processedAsks.slice(0, 15).map((ask, i) => {
                                    const percent = (ask.total / maxTotal) * 100;
                                    return (
                                        <div key={`ask-${i}`} className="relative grid grid-cols-2 py-1.5 px-2 hover:bg-[var(--bg-tertiary)] cursor-pointer">
                                            <div
                                                className="absolute top-0 bottom-0 right-0 bg-[var(--error)] opacity-[0.12]"
                                                style={{ width: `${percent}%` }}
                                            />
                                            <div className="relative text-[var(--error)]">{formatPrice(ask.price)}</div>
                                            <div className="relative text-right text-[var(--text-primary)]">{ask.amount.toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
