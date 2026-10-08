'use client';

import Link from 'next/link';
import GuideLayout from '@/components/guides/GuideLayout';
import Card from '@/components/ui/Card';

export default function GettingStartedPage() {
  return (
    <GuideLayout title="Getting started" description="Follow a Stellar account, inspect a transaction, and explore assets using public blockchain data.">
      <Card variant="bordered" className="p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your first exploration</h2>
        <ol className="mt-4 list-decimal space-y-5 pl-5 text-sm leading-6 text-[var(--text-secondary)] marker:font-semibold marker:text-[var(--info)]">
          <li className="pl-1">
            <h3 className="font-semibold text-[var(--text-primary)]">Choose the network</h3>
            <p>Use the network selector in the navigation. Choose Mainnet for live activity or Testnet for testing, and keep the same network when checking an account or transaction.</p>
          </li>
          <li className="pl-1">
            <h3 className="font-semibold text-[var(--text-primary)]">Find an account or transaction</h3>
            <p>Paste a public account address or transaction hash into the explorer search. To inspect your wallet account, use the <Link href="/wallets" className="font-medium text-[var(--info)] underline underline-offset-4 hover:opacity-80">wallet companion</Link>. You can also start with <Link href="/transactions" className="font-medium text-[var(--info)] underline underline-offset-4 hover:opacity-80">recent transactions</Link>.</p>
          </li>
          <li className="pl-1">
            <h3 className="font-semibold text-[var(--text-primary)]">Read the details</h3>
            <p>Check the transaction result, ledger and operations. On an account page, review balances and the available activity history. A displayed label or verification badge is not a guarantee about an account.</p>
          </li>
          <li className="pl-1">
            <h3 className="font-semibold text-[var(--text-primary)]">Explore assets and network activity</h3>
            <p>Use <Link href="/markets" className="font-medium text-[var(--info)] underline underline-offset-4 hover:opacity-80">Markets</Link> to find an asset and inspect its issuer. Use <Link href="/statistics" className="font-medium text-[var(--info)] underline underline-offset-4 hover:opacity-80">Statistics</Link> for historical network charts. Coverage depends on the data indexed for each view.</p>
          </li>
        </ol>
      </Card>
      <Card variant="bordered" className="p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Understand what you are seeing</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Learn how accounts, assets, transactions and ledgers fit together before interpreting activity.</p>
        <Link href="/learn" className="mt-3 inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-[var(--info)] transition-colors hover:bg-[var(--info-muted)]">Read the explorer guide →</Link>
      </Card>
    </GuideLayout>
  );
}
