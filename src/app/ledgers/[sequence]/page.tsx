import ClientPage from '../../ledger/[sequence]/client-page';

export function generateStaticParams() {
  return [{ sequence: '1' }];
}

export default function Page() {
  return <ClientPage />;
}

export const revalidate = 60;
