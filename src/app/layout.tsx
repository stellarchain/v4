import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MobileHeader from "@/components/MobileHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StellarChain - Blockchain Explorer",
  description: "Explore the Stellar blockchain - transactions, accounts, ledgers, and operations",
  keywords: ["Stellar", "blockchain", "explorer", "XLM", "crypto", "Lumens"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-black text-white min-h-screen`}>
        {/* Mobile Header */}
        <MobileHeader />

        <div className="flex">
          {/* Desktop Sidebar - hidden on mobile */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 min-h-screen p-4 pb-20 md:pb-4">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </body>
    </html>
  );
}
