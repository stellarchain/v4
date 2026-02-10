import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' }];
}

export default function Page() {
  return <ClientPage />;
}
