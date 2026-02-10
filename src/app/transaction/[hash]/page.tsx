import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ hash: 'test' }];
}

export default function Page() {
  return <ClientPage />;
}
