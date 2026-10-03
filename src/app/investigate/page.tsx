import type { Metadata } from 'next';
import InvestigateClient from './InvestigateClient';

export const metadata: Metadata = {
  title: { absolute: 'Account Trust Checker — StellarChain' },
};

export default function InvestigatePage() {
  return <InvestigateClient />;
}
