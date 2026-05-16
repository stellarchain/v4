import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' }];
}

export default function Page() {
  return <ClientPage />;
}
