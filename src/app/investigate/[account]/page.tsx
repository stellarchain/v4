import type { Metadata } from 'next';
import ClientPage from './client-page';

export const metadata: Metadata = {
  title: { absolute: 'Account Trust Checker — StellarChain' },
};

export function generateStaticParams() {
  return [{ account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' }];
}

export default function Page() {
  return <ClientPage />;
}
