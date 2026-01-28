import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import FloatingBottomNav from "@/components/mobile/FloatingBottomNav";
import MobileHeader from "@/components/mobile/MobileHeader";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
          {/* Mobile Header */}
          <MobileHeader />

          <div className="flex">
            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:block">
              <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 min-h-screen p-0 pb-20 md:p-0 overflow-x-hidden">
              <div className="w-full max-w-full overflow-x-hidden">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile Bottom Navigation - iOS 26 Style */}
          <FloatingBottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
