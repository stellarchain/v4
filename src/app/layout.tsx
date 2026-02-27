import type { Metadata, Viewport } from 'next';
import './globals.css';
import FloatingBottomNav from '@/components/mobile/FloatingBottomNav';
import MobileHeader from '@/components/mobile/MobileHeader';
import DesktopNavbar from '@/components/desktop/DesktopNavbar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import ScrollToTop from '@/components/ScrollToTop';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export const viewport: Viewport = {
  width: 'device-width',
  height: 'device-height',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1118' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://stellarchain.io'),
  title: {
    default: 'Explore Stellar Lumens (XLM) - Real-time Price, Assets, Charts & More',
    template: '%s | StellarChain Explorer',
  },
  alternates: {
    canonical: './',
  },
  description: 'Explore the Stellar blockchain - transactions, accounts, ledgers, and operations',
  keywords: ['Stellar', 'blockchain', 'explorer', 'XLM', 'crypto', 'Lumens'],
  openGraph: {
    type: 'website',
    url: 'https://stellarchain.io',
    siteName: 'StellarChain Explorer',
    title: 'Explore Stellar Lumens (XLM) - Real-time Price, Assets, Charts & More',
    description: 'Explore the Stellar blockchain - transactions, accounts, ledgers, and operations',
    images: [
      {
        url: '/stellar-xlm9125.jpg',
        width: 866,
        height: 650,
        alt: 'StellarChain Explorer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Stellar Lumens (XLM) - Real-time Price, Assets, Charts & More',
    description: 'Explore the Stellar blockchain - transactions, accounts, ledgers, and operations',
    images: ['/stellar-xlm9125.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellarchain',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Script to prevent white flash by setting theme before render
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('stellarchain-theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  `;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'StellarChain Explorer',
        url: 'https://stellarchain.io',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://stellarchain.io/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'StellarChain',
        url: 'https://stellarchain.io',
        logo: 'https://stellarchain.io/stellarchain-logo.svg',
      },
    ],
  };

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          data-host='https://stats.co'
          data-dnt='false'
          src='https://stats.co/js/script.js'
          id='ZwSg9rf6GA'
          async
          defer
        />
        <script async src='https://www.googletagmanager.com/gtag/js?id=G-B75TPW6R2T' />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-B75TPW6R2T');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          html[data-theme="dark"] { background-color: #0a0f1a; }
          html[data-theme="light"] { background-color: #f8fafc; }
        ` }} />
      </head>
      <body className='font-sans antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen transition-colors duration-300 overflow-x-hidden'>
        <ThemeProvider>
          <NetworkProvider>
          <FavoritesProvider>
          {/* Skip Navigation */}
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-[var(--bg-secondary)] focus:text-[var(--text-primary)] focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--info)]">
            Skip to content
          </a>

          <ScrollToTop />

          {/* Mobile Header */}
          <MobileHeader />

          {/* Desktop Navbar */}
          <DesktopNavbar />

          {/* Main Content */}
          <main id="main-content" className="min-h-screen p-0 pb-20 md:pb-0 overflow-x-hidden">
            <div className="w-full max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>

          <CookieConsentBanner />
          <ServiceWorkerRegistration />

          {/* Mobile Bottom Navigation - iOS 26 Style */}
          <FloatingBottomNav />
          </FavoritesProvider>
          </NetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
