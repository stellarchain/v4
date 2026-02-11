import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ slug: 'test' }];
}

export default function Page() {
  return <ClientPage />;
}
