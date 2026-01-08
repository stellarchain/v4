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

export default function AssetOrderBook({ asset }: OrderBookProps) {
    const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);
    const [processedBids, setProcessedBids] = useState<ProcessedOrder[]>([]);
    const [processedAsks, setProcessedAsks] = useState<ProcessedOrder[]>([]);
    const [xlmUsdPrice, setXlmUsdPrice] = useState<number>(0);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h3 className="text-[var(--text-primary)] font-semibold">Order Book</h3>
                <div className="text-xs text-[var(--text-muted)] flex gap-2">
                    <span>Spread: <span className="text-[var(--text-primary)]">${formatPrice(spread)}</span> ({spreadPercent.toFixed(2)}%)</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[400px] flex flex-col text-xs font-mono">
                {/* Header */}
                <div className="grid grid-cols-3 p-2 text-[var(--text-muted)] border-b border-[var(--border-color)]">
                    <div className="pl-2">Price (USD)</div>
                    <div className="text-right">Amount ({asset.code})</div>
                    <div className="text-right pr-2">Total (USD)</div>
                </div>

                {/* Asks (Sell Orders) - Red - Reversed so lowest Ask is at bottom (closest to spread) */}
                <div className="flex flex-col-reverse justify-end pb-1">
                    {processedAsks.slice(0, 15).map((ask, i) => {
                        const percent = (ask.total / maxTotal) * 100;

                        return (
                            <div key={`ask-${i}`} className="relative grid grid-cols-3 py-1 hover:bg-[var(--bg-tertiary)] cursor-pointer group">
                                <div className="absolute top-0 bottom-0 right-0 bg-[var(--error)] opacity-[0.08]" style={{ width: `${percent}%` }}></div>
                                <div className="relative pl-4 text-[var(--error)]">${formatPrice(ask.price)}</div>
                                <div className="relative text-right text-[var(--text-primary)]">{ask.amount.toLocaleString()}</div>
                                <div className="relative text-right pr-4 text-[var(--text-muted)]">${ask.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Spread / Last Price Indicator */}
                <div className="py-3 border-y border-[var(--border-color)] bg-[var(--bg-tertiary)] flex items-center justify-center gap-2">
                    <div className={`text-lg font-bold ${bestAsk > bestBid ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                        ${midPrice > 0 ? formatPrice(midPrice) : '---'}
                    </div>
                    <div className="text-[var(--text-muted)]">
                        {spread > 0 ? `↓` : `↑`} USD
                    </div>
                </div>

                {/* Bids (Buy Orders) - Green - Highest Bid at top */}
                <div className="pt-1">
                    {processedBids.slice(0, 15).map((bid, i) => {
                        const percent = (bid.total / maxTotal) * 100;

                        return (
                            <div key={`bid-${i}`} className="relative grid grid-cols-3 py-1 hover:bg-[var(--bg-tertiary)] cursor-pointer group">
                                <div className="absolute top-0 bottom-0 right-0 bg-[var(--success)] opacity-[0.08]" style={{ width: `${percent}%` }}></div>
                                <div className="relative pl-4 text-[var(--success)]">${formatPrice(bid.price)}</div>
                                <div className="relative text-right text-[var(--text-primary)]">{bid.amount.toLocaleString()}</div>
                                <div className="relative text-right pr-4 text-[var(--text-muted)]">${bid.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
