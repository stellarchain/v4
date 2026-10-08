import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Learn',
  description: 'Learn to interpret Stellar accounts, assets, transactions, ledgers and indexed history.',
  alternates: { canonical: '/learn' },
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  return children;
}
