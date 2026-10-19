import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'On/off ramps | Partners',
  alternates: { canonical: '/partners/ramps' },
};

export default function PartnerCategoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
