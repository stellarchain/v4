'use client';

import { Operation, getDecodedParameters } from '@/lib/stellar';
import { useState } from 'react';

interface DecodedParamsProps {
    operation: Operation;
}

export default function DecodedParams({ operation }: DecodedParamsProps) {
    const [isOpen, setIsOpen] = useState(true);
    const params = getDecodedParameters(operation);

    if (!params || params.length === 0) return null;

    return (
        <div className="mt-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs text-[var(--primary)] hover:underline mb-2"
            >
                <svg
                    className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {isOpen ? 'Hide Decoded Parameters' : 'Show Decoded Parameters'}
            </button>

            {isOpen && (
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 space-y-2 border border-[var(--border-default)]">
                    {params.map((param, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 text-xs">
                            <span className="text-[var(--text-tertiary)] font-mono whitespace-nowrap min-w-[120px]">{param.name}:</span>
                            <span className="text-[var(--text-primary)] font-mono break-all">{param.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
