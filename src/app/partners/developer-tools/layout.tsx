import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Developer tools | Partners',
  alternates: { canonical: '/partners/developer-tools' },
};

export default function PartnerCategoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
