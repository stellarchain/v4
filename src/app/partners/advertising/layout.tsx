import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Advertising | Partners',
  alternates: { canonical: '/partners/advertising' },
};

export default function PartnerCategoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
