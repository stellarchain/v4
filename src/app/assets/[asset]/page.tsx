import ClientPage from './client-page';

export function generateStaticParams() {
  return [{ asset: 'XLM-native' }];
}

export default function Page() {
  return <ClientPage />;
}
