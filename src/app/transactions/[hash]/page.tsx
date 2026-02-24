import ClientPage from '../../transaction/[hash]/client-page';

export function generateStaticParams() {
  return [{ hash: 'test' }];
}

export default function Page() {
  return <ClientPage />;
}

export const revalidate = 60;
