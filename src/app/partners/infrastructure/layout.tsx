import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Infrastructure | Partners',
  alternates: { canonical: '/partners/infrastructure' },
};

export default function PartnerCategoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
