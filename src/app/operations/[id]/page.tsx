import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ id: 'test' }];
}

export default function Page() {
  return <ClientPage />;
}
