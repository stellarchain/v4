'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STELLAR_ADDRESS = 'GAI3GJ2Q3B35AOZJ36C4ANE3HSS4NK7WI6DNO4ZSHRAX6NG7BMX6VJER';
const COINBASE_COMMERCE_URL = 'https://commerce.coinbase.com/checkout/d21e084f-f942-4b2f-866c-177d11a38b7a';

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [showStellarAddress, setShowStellarAddress] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(STELLAR_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setShowStellarAddress(false);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Coffee icon */}
        <div className="flex justify-center mb-4">
          <div className="text-[var(--primary-blue)]">
            <svg className="w-16 h-16" viewBox="0 0 64 64" fill="currentColor">
              {/* Steam */}
              <path d="M20 8c0-2 1-4 3-4s3 2 3 4c0 1.5-1 3-3 3s-3-1.5-3-3zm-2 6c0-1.5.75-3 2.25-3s2.25 1.5 2.25 3c0 1.125-.75 2.25-2.25 2.25S18 15.125 18 14zm12-6c0-2 1-4 3-4s3 2 3 4c0 1.5-1 3-3 3s-3-1.5-3-3z" opacity="0.6"/>
              {/* Cup */}
              <path d="M8 24h36v4c0 12-6 20-18 20S8 40 8 28v-4zm36 8h6c3 0 6-2 6-6s-3-6-6-6h-6v12z"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Do you like the project?
        </h2>

        {/* Subtitle */}
        <p className="text-gray-500 text-center mb-4">
          Buy us a coffee and share the love
        </p>

        {/* Buttons */}
        {!showStellarAddress ? (
          <div className="space-y-3">
            <button
              onClick={() => setShowStellarAddress(true)}
              className="w-full py-3 px-4 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.3 2.1c5.4 0 9.8 4.4 9.8 9.8 0 1.8-.5 3.5-1.3 5l1.2.4c.9-1.7 1.4-3.5 1.4-5.4C23.4 5.4 18.4.4 12 .4c-2 0-3.9.5-5.5 1.4l.4 1.2c1.5-.6 3.2-1 5-1h.4zM2.1 12c0-1.8.5-3.5 1.3-5L2.2 6.6C1.3 8.3.8 10.1.8 12c0 6.5 5 11.5 11.5 11.6 2 0 3.9-.5 5.5-1.4l-.4-1.2c-1.5.8-3.3 1.2-5.1 1.2-5.4 0-9.8-4.4-9.8-9.8-.4 0-.4-.3-.4-.4zm8.5-3.3l-5.3-1.8 5.3 1.8.4-1.3L5.7 5.6v1.3l5.3 1.8.4-1.3-5.3-1.8v1.3l5.3 1.8zm2.9 6.6l5.3 1.8-5.3-1.8-.4 1.3 5.3 1.8v-1.3l-5.3-1.8-.4 1.3 5.3 1.8v-1.3l-5.3-1.8z"/>
              </svg>
              Donate Stellar
            </button>

            <a
              href={COINBASE_COMMERCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.7-.17-1.053-.252l.53-2.12-1.315-.33-.54 2.153c-.286-.065-.567-.13-.84-.2l.001-.008-1.815-.454-.35 1.407s.975.224.955.238c.535.136.63.495.614.78l-.614 2.453c.037.01.085.025.138.047l-.14-.036-.86 3.437c-.065.16-.23.4-.6.31.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.254 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z"/>
              </svg>
              Donate BTC & Others
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={() => setShowStellarAddress(false)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white rounded-xl border border-gray-200">
                <QRCodeSVG
                  value={STELLAR_ADDRESS}
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Stellar address display */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Send XLM to this address:</p>
              <p className="font-mono text-xs text-gray-800 break-all mb-3">
                {STELLAR_ADDRESS}
              </p>
              <button
                onClick={handleCopyAddress}
                className="w-full py-2.5 px-4 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Address
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-center text-gray-400">
              Thank you for your support!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
