'use client';

import { useState, useEffect } from 'react';
import { AssetDetails, getOrderBook, OrderBook as OrderBookType } from '@/lib/stellar';

interface OrderBookProps {
    asset: AssetDetails;
}

export default function AssetOrderBook({ asset }: OrderBookProps) {
    const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderBook = async () => {
            setLoading(true);
            try {
                // To get the standard Base/Counter (e.g. XLM/USDC) view:
                // We typically represent this as "Price of Base in Counter".
                // Bids = Buying Base (selling Counter)
                // Asks = Selling Base (buying Counter)
                // Horizon `order_book` params:
                // selling_asset = Counter (USDC)
                // buying_asset = Base (XLM)
                // This returns:
                // "bids": offers to BUY Base using Counter. price = Counter/Base. (Correct)
                // "asks": offers to SELL Base for Counter. price = Counter/Base. (Correct)

                const base = { code: asset.code, issuer: asset.issuer };
                // If asset is XLM, Counter is USDC. If asset is Token, Counter is XLM.
                const counter = asset.code === 'XLM'
                    ? { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }
                    : { code: 'XLM' };

                const data = await getOrderBook(counter, base, 15);

                // DATA CORRECTION:
                // Horizon sometimes returns data such that Price = Counter/Base, but sometimes inverted depending on asset direction.
                // Specifically for XLM (Base) / USDC (Counter), we expect Price ~0.22.
                // If we get Price ~4.4, it means we have USDC/XLM data (Price = XLM per USDC).
                // We MUST Detect and Invert this so the UI matches the Chart (XLM/USDC).

                // Detection: If XLM is Base, Price should be < 1.0 (currently ~0.2). If > 1.0, it's inverted.
                let finalData = data;

                const samplePrice = data.bids.length > 0 ? parseFloat(data.bids[0].price) : (data.asks.length > 0 ? parseFloat(data.asks[0].price) : 0);

                if (asset.code === 'XLM' && samplePrice > 1.0) {
                    // INVERSION LOGIC:
                    // We have USDC/XLM (e.g. Price 4.4 XLM/USDC).
                    // We want XLM/USDC (e.g. Price 0.22 USDC/XLM).

                    // 1. Swap Bids and Asks.
                    //    (Bids for USD using XLM are effectively Asks for XLM getting USD).
                    // 2. Invert Price: newPrice = 1 / oldPrice.
                    // 3. Convert Amount: 
                    //    OldAmount = USDC Amount. 
                    //    NewAmount (Base=XLM) = OldAmount * OldPrice.
                    //    Example: 100 USDC * 4.4 XLM/USDC = 440 XLM.

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
    if (!orderBook) return null;

    // Calculate Spread and Last Price approximation
    const bestBid = orderBook.bids.length > 0 ? parseFloat(orderBook.bids[0].price) : 0;
    const bestAsk = orderBook.asks.length > 0 ? parseFloat(orderBook.asks[0].price) : 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
    const midPrice = (bestAsk + bestBid) / 2;
    const counterCode = asset.code === 'XLM' ? 'USDC' : 'XLM';

    // Max amount for background bars
    const allOrders = [...orderBook.bids, ...orderBook.asks];
    const maxTotal = Math.max(...allOrders.map(o => parseFloat(o.amount) * parseFloat(o.price)));

    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h3 className="text-[var(--text-primary)] font-semibold">Order Book</h3>
                <div className="text-xs text-[var(--text-muted)] flex gap-2">
                    <span>Spread: <span className="text-[var(--text-primary)]">{spread.toFixed(7)}</span> ({spreadPercent.toFixed(2)}%)</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[400px] flex flex-col text-xs font-mono">
                {/* Header */}
                <div className="grid grid-cols-3 p-2 text-[var(--text-muted)] border-b border-[var(--border-color)]">
                    <div className="pl-2">Price ({counterCode})</div>
                    <div className="text-right">Amount ({asset.code})</div>
                    <div className="text-right pr-2">Total ({counterCode})</div>
                </div>

                {/* Asks (Sell Orders) - Red - Reversed so lowest Ask is at bottom (closest to spread) */}
                <div className="flex flex-col-reverse justify-end pb-1">
                    {orderBook.asks.slice(0, 15).map((ask, i) => {
                        const price = parseFloat(ask.price);
                        const amount = parseFloat(ask.amount);
                        const total = price * amount;
                        const percent = (total / maxTotal) * 100;

                        return (
                            <div key={`ask-${i}`} className="relative grid grid-cols-3 py-1 hover:bg-[var(--bg-tertiary)] cursor-pointer group">
                                <div className="absolute top-0 bottom-0 right-0 bg-[var(--error)] opacity-[0.08]" style={{ width: `${percent}%` }}></div>
                                <div className="relative pl-4 text-[var(--error)]">{price.toFixed(7)}</div>
                                <div className="relative text-right text-[var(--text-primary)]">{amount.toLocaleString()}</div>
                                <div className="relative text-right pr-4 text-[var(--text-muted)]">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Spread / Last Price Indicator */}
                <div className="py-3 border-y border-[var(--border-color)] bg-[var(--bg-tertiary)] flex items-center justify-center gap-2">
                    <div className={`text-lg font-bold ${bestAsk > bestBid ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                        {midPrice > 0 ? midPrice.toFixed(7) : '---'}
                    </div>
                    <div className="text-[var(--text-muted)]">
                        {spread > 0 ? `↓` : `↑`} {counterCode}
                    </div>
                </div>

                {/* Bids (Buy Orders) - Green - Highest Bid at top */}
                <div className="pt-1">
                    {orderBook.bids.slice(0, 15).map((bid, i) => {
                        const price = parseFloat(bid.price);
                        const amount = parseFloat(bid.amount);
                        const total = price * amount;
                        const percent = (total / maxTotal) * 100;

                        return (
                            <div key={`bid-${i}`} className="relative grid grid-cols-3 py-1 hover:bg-[var(--bg-tertiary)] cursor-pointer group">
                                <div className="absolute top-0 bottom-0 right-0 bg-[var(--success)] opacity-[0.08]" style={{ width: `${percent}%` }}></div>
                                <div className="relative pl-4 text-[var(--success)]">{price.toFixed(7)}</div>
                                <div className="relative text-right text-[var(--text-primary)]">{amount.toLocaleString()}</div>
                                <div className="relative text-right pr-4 text-[var(--text-muted)]">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
