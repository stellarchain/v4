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
                // If asset is XLM, we typically view orderbook against USDC
                const buyingAsset = asset.code === 'XLM'
                    ? { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }
                    : { code: 'XLM' };

                // Fetch bids (buying the asset, selling the counter)
                // In Horizon: 
                // To get BIDS for our ASSET:
                // We want people selling XLM (counter) to buy ASSET (base).
                // selling = XLM, buying = ASSET

                // To get ASKS for our ASSET:
                // We want people selling ASSET (base) to buy XLM (counter).
                // selling = ASSET, buying = XLM

                // Horizon 'order_book' endpoint takes selling_asset and buying_asset.
                // It returns BIDS and ASKS for that pair.
                // Bids in response = buying 'buying_asset' with 'selling_asset'
                // Asks in response = selling 'selling_asset' for 'buying_asset' ?? 
                // Actually Horizon returns everything relative to the pair.

                // Let's standard request: Base = Asset, Counter = XLM
                // We request: selling = Counter (XLM), buying = Base (Asset) -> These are Bids for Base
                // But the endpoint returns both sides usually if we define the pair?
                // No, Horizon order_book endpoint defines the PAIR.
                // selling_asset = ...
                // buying_asset = ...
                // The result `bids` are orders offering to BUY `buying_asset` using `selling_asset`.
                // The result `asks` are orders offering to SELL `buying_asset` for `selling_asset`.
                // WAIT: Horizon doc says:
                // "The offers summarized in the response are orders to buy the buying_asset using the selling_asset."
                // So this endpoint returns ONE SIDE of the orderbook (standard definitions usually imply pair).
                // Actually, typically an Order Book view needs two calls or the endpoint returns the pair?
                // Stellar Horizon `order_book` endpoint returns `bids` and `asks` relative to the *direction*?
                // Let's re-read doc: "Returns all offers to buy buying_asset using selling_asset".
                // This sounds like it only returns one side.
                // However, standard orderbook UI shows both sides.
                // Let's check the response type I defined. It has bids and asks. 
                // Actually standard Horizon endpoint returns a full book for the pair? 
                // Let's check official docs: "Returns the orderbook for a currency pair".
                // GET /order_book
                // params: selling_asset, buying_asset.
                // "Returns normalized Bids and Asks." 
                // Bids: orders to BUY buying_asset (counter) with selling_asset (base)? 
                // No. 
                // "bids": array of orders buying the "buying_asset".
                // "asks": array of orders selling the "buying_asset".
                // Wait, asks are usually selling the buying_asset?
                // Let's assume we want to view the book for ASSET/XLM.
                // Base = Asset, Counter = XLM.
                // We want to see orders BUYING Asset (with XLM) and orders SELLING Asset (for XLM).
                // So we set buying_asset = Asset, selling_asset = XLM.
                // Bids = People Buying Asset (paying XLM)
                // Asks = People Selling Asset (getting XLM) -- Wait, if I am selling Asset, I am buying XLM.
                // So Asks for Asset/XLM are technically Bids for XLM/Asset.
                // Horizon usually returns the pair view requested.
                // If I request selling=XLM, buying=Asset.
                // bids = offers buying Asset (selling XLM). Correct.
                // asks = offers selling Asset (buying XLM). Correct.
                // So one call is enough.

                const base = { code: asset.code, issuer: asset.issuer };
                const counter = asset.code === 'XLM'
                    ? { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }
                    : { code: 'XLM' };

                // We want book for Base/Counter.
                // buying_asset = Base
                // selling_asset = Counter
                const data = await getOrderBook(counter, base, 15);
                setOrderBook(data);

            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchOrderBook();
    }, [asset]);

    if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div></div>;
    if (!orderBook) return <div className="text-[var(--text-tertiary)] text-center py-8">Order book data unavailable</div>;

    const maxBid = Math.max(...orderBook.bids.map(b => parseFloat(b.amount)));
    const maxAsk = Math.max(...orderBook.asks.map(a => parseFloat(a.amount)));
    const totalMax = Math.max(maxBid, maxAsk);

    return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded overflow-hidden mt-6">
            <div className="p-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-[var(--text-primary)] font-semibold">Order Book</h3>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[var(--border-subtle)]">
                {/* Bids */}
                <div className="bg-[var(--bg-secondary)]">
                    <div className="grid grid-cols-3 text-[11px] text-[var(--text-tertiary)] p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30">
                        <span>Price ({asset.code === 'XLM' ? 'USDC' : 'XLM'})</span>
                        <span className="text-right">Amount ({asset.code})</span>
                        <span className="text-right">Total</span>
                    </div>
                    <div>
                        {orderBook.bids.map((bid, i) => {
                            const amount = parseFloat(bid.amount);
                            const price = parseFloat(bid.price);
                            const percent = (amount / totalMax) * 100;
                            return (
                                <div key={i} className="relative grid grid-cols-3 text-[12px] p-1.5 px-2 hover:bg-[var(--bg-tertiary)] group">
                                    <div className="absolute inset-y-0 right-0 bg-[var(--success)]/10" style={{ width: `${percent}%`, transition: 'width 0.3s' }}></div>
                                    <span className="relative text-[var(--success)] font-mono">{price.toFixed(7)}</span>
                                    <span className="relative text-right text-[var(--text-secondary)] font-mono">{parseFloat(bid.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                    <span className="relative text-right text-[var(--text-tertiary)] font-mono">{(price * amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Asks */}
                <div className="bg-[var(--bg-secondary)]">
                    <div className="grid grid-cols-3 text-[11px] text-[var(--text-tertiary)] p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30">
                        <span>Price ({asset.code === 'XLM' ? 'USDC' : 'XLM'})</span>
                        <span className="text-right">Amount ({asset.code})</span>
                        <span className="text-right">Total</span>
                    </div>
                    <div>
                        {orderBook.asks.map((ask, i) => {
                            const amount = parseFloat(ask.amount);
                            const price = parseFloat(ask.price); // Asks price is usually 1/price in result? No Horizon returns price per unit.
                            // In Horizon, price is always how many units of selling_asset to get 1 unit of buying_asset.
                            // For Asks: selling=Asset, buying=XLM.
                            // Price = How many Asset to get 1 XLM? Or How many XLM to get 1 Asset? 
                            // The Horizon response `asks` list:
                            // "price": "number of selling_asset / number of buying_asset" 
                            // Wait. 
                            // If we requested selling=Counter(XLM), buying=Base(Asset).
                            // Asks in the response are people willing to Sell Base? No.
                            // The `asks` array in the response (selling=X, buying=Y) are offers to SELL Y (and buy X).
                            // Price = X / Y. (How much X per 1 Y).
                            // So Price is in terms of Counter/Base. This is what we want (Price of 1 Asset in XLM).
                            // So the price field is correct.

                            const percent = (amount / totalMax) * 100;
                            return (
                                <div key={i} className="relative grid grid-cols-3 text-[12px] p-1.5 px-2 hover:bg-[var(--bg-tertiary)] group">
                                    <div className="absolute inset-y-0 right-0 bg-[var(--error)]/10" style={{ width: `${percent}%`, transition: 'width 0.3s' }}></div>
                                    <span className="relative text-[var(--error)] font-mono">{price.toFixed(7)}</span>
                                    <span className="relative text-right text-[var(--text-secondary)] font-mono">{parseFloat(ask.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                    <span className="relative text-right text-[var(--text-tertiary)] font-mono">{(price * amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
