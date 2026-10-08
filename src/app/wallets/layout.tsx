import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Wallet companion',
  description: 'Inspect your Stellar wallet account with a public address and follow on-chain activity.',
  alternates: { canonical: '/wallets' },
};

export default function WalletsLayout({ children }: { children: ReactNode }) {
  return children;
}
