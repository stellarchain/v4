'use client';

import { useParams } from 'next/navigation';
import InvestigateClient from '../InvestigateClient';

export default function ClientPage() {
  const params = useParams<{ account?: string }>();

  return <InvestigateClient pathAccount={params.account ?? ''} />;
}
