import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Partners',
  description:
    'Stellar wallets, exchanges, ramps, infrastructure and developer tools, with commercial disclosures and region/network notes.',
  alternates: { canonical: '/partners' },
};

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return children;
}
