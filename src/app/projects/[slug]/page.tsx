import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ slug: '1' }];
}

export default function Page() {
  return <ClientPage />;
}
