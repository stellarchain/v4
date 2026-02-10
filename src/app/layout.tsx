import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FloatingBottomNav from "@/components/mobile/FloatingBottomNav";
import MobileHeader from "@/components/mobile/MobileHeader";
import DesktopNavbar from "@/components/desktop/DesktopNavbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import ScrollToTop from "@/components/ScrollToTop";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1118" },
  ],
};

export const metadata: Metadata = {
  title: "StellarChain - Blockchain Explorer",
  description: "Explore the Stellar blockchain - transactions, accounts, ledgers, and operations",
  keywords: ["Stellar", "blockchain", "explorer", "XLM", "crypto", "Lumens"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stellarchain",
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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: `
          html[data-theme="dark"] { background-color: #0a0f1a; }
          html[data-theme="light"] { background-color: #f8fafc; }
        ` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen transition-colors duration-300 overflow-x-hidden`}>
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

          {/* Mobile Bottom Navigation - iOS 26 Style */}
          <FloatingBottomNav />
          </FavoritesProvider>
          </NetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
