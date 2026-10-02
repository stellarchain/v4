import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Statistics',
  description: 'Indexed historical network statistics and metric charts for Stellar.',
};

export default function StatisticsLayout({ children }: { children: ReactNode }) {
  return children;
}
