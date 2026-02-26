'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);
    const isDevelopment = process.env.NODE_ENV === 'development';

    useEffect(() => {
        setMounted(true);
        // Check localStorage first
        const stored = localStorage.getItem('stellarchain-theme') as Theme | null;
        if (stored) {
            setThemeState(stored);
            document.documentElement.setAttribute('data-theme', stored);
        } else {
            // Default to light mode
            const defaultTheme = 'light';
            setThemeState(defaultTheme);
            document.documentElement.setAttribute('data-theme', defaultTheme);
        }

    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('stellarchain-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        document.documentElement.style.colorScheme = newTheme;
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        if (isDevelopment) {
            return;
        }
        Sentry.setTag('theme', theme);
        Sentry.setContext('ui', { theme });
    }, [isDevelopment, theme]);

    // Prevent flash of wrong theme
    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
