import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Exchanges | Partners',
  alternates: { canonical: '/partners/exchanges' },
};

export default function PartnerCategoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
