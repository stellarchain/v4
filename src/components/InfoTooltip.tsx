'use client';

import { useState } from 'react';

interface InfoTooltipProps {
    label: React.ReactNode;
    content: string;
    direction?: 'top' | 'bottom';
}

export default function InfoTooltip({ label, content, direction = 'top' }: InfoTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-flex items-center">
            <button
                onClick={() => setIsOpen(!isOpen)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none"
            >
                {label}
                <svg className="w-3.5 h-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className={`absolute left-1/2 -translate-x-1/2 w-48 p-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[10px] leading-relaxed rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 ${direction === 'top'
                            ? 'bottom-full mb-2'
                            : 'top-full mt-2'
                        }`}
                >
                    {content}
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${direction === 'top' ? 'top-full border-t-[var(--text-primary)]' : 'bottom-full border-b-[var(--text-primary)]'}`}
                    ></div>
                </div>
            )}
        </div>
    );
}
