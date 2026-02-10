'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import TransactionPageClient from '@/components/TransactionPageClient';
import TransactionsDesktopView from '@/components/desktop/TransactionsDesktopView';
import TransactionDetailsClientPage from '@/app/transaction/[hash]/client-page';

function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}

export default function TransactionsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cleanPath = pathname.replace(/\/+$/, '');
  const txHashFromPath = cleanPath.startsWith('/transactions/') ? cleanPath.slice('/transactions/'.length) : '';
  const txHashFromQuery = searchParams.get('hash') || '';
  const hasDetailsRoute = Boolean((txHashFromPath || txHashFromQuery).trim());
  const isMobile = useIsMobile();

  if (hasDetailsRoute) {
    return <TransactionDetailsClientPage />;
  }

  // Wait for client-side hydration to determine viewport
  if (isMobile === null) {
    return null;
  }

  return isMobile ? (
    <TransactionPageClient limit={100} />
  ) : (
    <TransactionsDesktopView limit={100} />
  );
}
