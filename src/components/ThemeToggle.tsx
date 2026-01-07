'use client';

import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-[var(--text-secondary)] hover:text-[var(--primary)] rounded hover:bg-[var(--bg-tertiary)] transition-all duration-200 text-[13px] group"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {/* Icon Container with Toggle Effect */}
            <div className="relative w-[18px] h-[18px]">
                {/* Sun Icon */}
                <svg
                    className={`absolute inset-0 w-[18px] h-[18px] transition-all duration-300 ${theme === 'light'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 rotate-90 scale-50'
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>

                {/* Moon Icon */}
                <svg
                    className={`absolute inset-0 w-[18px] h-[18px] transition-all duration-300 ${theme === 'dark'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 -rotate-90 scale-50'
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>
            </div>

            <span className="font-medium flex-1 text-left">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>

            {/* Toggle Switch */}
            <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${theme === 'light' ? 'bg-[var(--primary)]' : 'bg-[var(--bg-hover)]'
                }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${theme === 'light' ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
            </div>
        </button>
    );
}
