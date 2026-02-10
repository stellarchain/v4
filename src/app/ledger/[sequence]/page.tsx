import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ sequence: '1' }];
}

export default function Page() {
  return <ClientPage />;
}
