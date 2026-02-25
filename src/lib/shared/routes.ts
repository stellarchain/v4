function enc(v: string) {
  return encodeURIComponent(v);
}

export function txRoute(hash: string) {
  return `/tx/${enc(hash)}`;
}

export function ledgerRoute(sequence: string | number) {
  return `/ledger/${enc(String(sequence))}`;
}

export function contractRoute(id: string) {
  return `/contracts/${enc(id)}`;
}

export function addressRoute(accountId: string) {
  return `/address/${enc(accountId)}`;
}

export function assetRoute(assetCode: string, assetIssuer?: string | null) {
  const code = enc(assetCode);
  const issuer = assetIssuer && assetIssuer !== 'native' ? enc(assetIssuer) : 'native';
  return `/assets/${code}-${issuer}`;
}

