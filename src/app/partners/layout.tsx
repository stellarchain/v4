import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Partners',
  description: 'StellarChain advertising integrations, placement details, and disclosure rules.',
  alternates: { canonical: '/partners' },
};

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return children;
}
