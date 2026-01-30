'use client';

import { useState, useRef, useEffect } from 'react';
import { useNetwork, NetworkType, NETWORK_CONFIGS } from '@/contexts/NetworkContext';

export default function NetworkSwitcher() {
  const { network, setNetwork, isChangingNetwork } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentConfig = NETWORK_CONFIGS[network];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNetworkChange = (newNetwork: NetworkType) => {
    if (newNetwork !== network) {
      setNetwork(newNetwork);
    }
    setIsOpen(false);
  };

  const networks: NetworkType[] = ['mainnet', 'testnet', 'futurenet'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChangingNetwork}
        className="flex items-center justify-between w-full px-4 py-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentConfig.color }}
          />
          <div className="text-left">
            <div className="text-xs font-bold text-[var(--text-primary)]">
              {currentConfig.displayName}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
              {currentConfig.horizonUrl.replace('https://', '')}
            </div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] shadow-lg overflow-hidden z-50">
          {networks.map((net) => {
            const config = NETWORK_CONFIGS[net];
            const isActive = net === network;

            return (
              <button
                key={net}
                onClick={() => handleNetworkChange(net)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'bg-[var(--primary-blue)]/10'
                    : 'hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isActive ? 'text-[var(--primary-blue)]' : 'text-[var(--text-primary)]'}`}>
                      {config.displayName}
                    </span>
                    {isActive && (
                      <svg className="w-3.5 h-3.5 text-[var(--primary-blue)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">
                    {config.friendbotUrl ? 'Test network with free XLM' : 'Production network'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading overlay */}
      {isChangingNetwork && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-tertiary)]/80 rounded-xl">
          <svg className="w-5 h-5 animate-spin text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Compact version for header/nav
export function NetworkBadge() {
  const { network, networkConfig } = useNetwork();

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{
        backgroundColor: `${networkConfig.color}20`,
        color: networkConfig.color,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: networkConfig.color }}
      />
      {networkConfig.displayName}
    </div>
  );
}
