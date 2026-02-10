import ClientPage from '../../account/[id]/client-page';

export function generateStaticParams() {
  return [{ id: 'test' }];
}

export default function Page() {
  return <ClientPage />;
}

export const revalidate = 30;
