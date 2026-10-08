import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Getting started',
  description: 'Start exploring Stellar accounts, transactions, assets and historical network activity.',
  alternates: { canonical: '/getting-started' },
};

export default function GettingStartedLayout({ children }: { children: ReactNode }) {
  return children;
}
