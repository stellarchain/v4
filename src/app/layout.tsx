import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FloatingBottomNav from "@/components/mobile/FloatingBottomNav";
import MobileHeader from "@/components/mobile/MobileHeader";
import DesktopNavbar from "@/components/desktop/DesktopNavbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { NetworkProvider } from "@/contexts/NetworkContext";

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
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen transition-colors duration-300 overflow-x-hidden`}>
        <ThemeProvider>
          <NetworkProvider>
          <FavoritesProvider>
          {/* Mobile Header */}
          <MobileHeader />

          {/* Desktop Navbar */}
          <DesktopNavbar />

          {/* Main Content */}
          <main className="min-h-screen p-0 pb-20 md:pb-0 overflow-x-hidden">
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
