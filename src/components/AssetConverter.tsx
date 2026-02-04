'use client';

import { useState, useEffect } from 'react';
import { AssetDetails } from '@/lib/stellar';

interface AssetConverterProps {
  asset: AssetDetails;
}

export default function AssetConverter({ asset }: AssetConverterProps) {
  const [assetAmount, setAssetAmount] = useState<string>('1');
  const [usdAmount, setUsdAmount] = useState<string>(asset.price_usd.toString());
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

  const handleAssetChange = (value: string) => {
    setActiveInput('asset');
    setAssetAmount(value);
  };

  const handleUsdChange = (value: string) => {
    setActiveInput('usd');
    setUsdAmount(value);
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-5">
      <h3 className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-4 pb-2 border-b border-slate-100">
        {asset.code} to USD Converter
      </h3>

      <div className="space-y-3">
        {/* Asset Input */}
        <div className="relative">
          <input
            type="number"
            value={assetAmount}
            onChange={(e) => handleAssetChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 text-slate-900 font-mono text-[15px] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            placeholder="0"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-[13px]">
            {asset.code}
          </span>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center">
          <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>

        {/* USD Input */}
        <div className="relative">
          <input
            type="number"
            value={usdAmount}
            onChange={(e) => handleUsdChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 text-slate-900 font-mono text-[15px] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            placeholder="0"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-[13px]">
            USD
          </span>
        </div>
      </div>

      <p className="text-slate-400 text-[11px] text-center mt-3">
        1 {asset.code} = ${asset.price_usd >= 1 ? asset.price_usd.toFixed(2) : asset.price_usd.toFixed(6)} USD
      </p>
    </div>
  );
}
