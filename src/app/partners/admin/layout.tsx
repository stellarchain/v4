import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Partner administration',
  robots: { index: false, follow: false },
  alternates: { canonical: '/partners/admin' },
};

export default function PartnerAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
