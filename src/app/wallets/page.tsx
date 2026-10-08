'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { StrKey } from '@stellar/stellar-sdk';
import GuideLayout from '@/components/guides/GuideLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getRouteFromSearchQuery } from '@/lib/searchRouting';

export default function WalletsPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = address.trim().toUpperCase();
    if (!StrKey.isValidEd25519PublicKey(normalized)) {
      setError('Enter a valid Stellar public account address starting with G.');
      inputRef.current?.focus();
      return;
    }
    const route = getRouteFromSearchQuery(normalized);
    if (route) router.push(route);
  }

  function clearAddress() {
    setAddress('');
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <GuideLayout title="Wallet companion" description="Use your wallet’s public address to check balances and follow activity in StellarChain. Account inspection is read-only.">
      <Card variant="bordered" className="p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">From your wallet to the explorer</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-[var(--text-secondary)] marker:font-semibold marker:text-[var(--info)]">
          <li>Open your Stellar wallet and copy its public account address, starting with G.</li>
          <li>Choose the matching network in StellarChain, then enter the address below.</li>
          <li>Inspect balances and available activity. To follow a payment, open its transaction hash from your wallet in the explorer search.</li>
        </ol>
        <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-5">
          <label htmlFor="wallet-public-address" className="block text-sm font-semibold text-[var(--text-primary)]">Public account address</label>
          <div className="relative">
            <input
              id="wallet-public-address"
              ref={inputRef}
              value={address}
              onChange={(event) => { setAddress(event.target.value); setError(null); }}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="G…"
              aria-invalid={Boolean(error)}
              aria-describedby={`wallet-address-help${error ? ' wallet-address-error' : ''}`}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] py-3 pl-3 pr-12 font-mono text-sm text-[var(--text-primary)]"
            />
            {address && (
              <button type="button" onClick={clearAddress} aria-label="Clear public account address" className="absolute right-0 top-0 flex h-full min-w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l12 12M6 18L18 6" /></svg>
              </button>
            )}
          </div>
          <p id="wallet-address-help" className="text-xs leading-5 text-[var(--text-secondary)]">Use only your public address. Never enter a secret key or recovery phrase. StellarChain does not sign or submit transactions from this page.</p>
          {error && <p id="wallet-address-error" role="alert" className="text-sm text-[var(--error)]">{error}</p>}
          <Button type="submit" variant="primary" className="min-h-11">View account</Button>
        </form>
      </Card>

      <Card variant="bordered" className="p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Need a wallet?</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">StellarKey is a Stellar wallet. Set up and manage your wallet through its official site; then return here with your public address.</p>
        <a href="https://stellarkey.io/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-[var(--info)] transition-colors hover:bg-[var(--info-muted)]">Visit StellarKey <span className="sr-only"> (opens in a new tab)</span> ↗</a>
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">This wallet resource is not a paid placement or a listed advertising partner.</p>
      </Card>
    </GuideLayout>
  );
}
