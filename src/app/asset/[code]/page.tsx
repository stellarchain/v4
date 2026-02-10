import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ code: 'XLM' }];
}

export default function Page() {
  return <ClientPage />;
}
