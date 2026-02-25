export function getRouteFromSearchQuery(rawQuery: string): string | null {
  const query = rawQuery.trim();
  if (!query) return null;

  const upperQuery = query.toUpperCase();

  // Contract ID (starts with C, 56 chars) - case insensitive
  if (query.length === 56 && upperQuery.startsWith('C')) {
    return `/contracts/${upperQuery}`;
  }

  // Account ID (starts with G, 56 chars) - case insensitive
  if (query.length === 56 && upperQuery.startsWith('G')) {
    return `/address/${upperQuery}`;
  }

  // Transaction hash (64 chars)
  if (query.length === 64) {
    return `/tx/${query.toLowerCase()}`;
  }

  // Ledger sequence (all digits)
  if (/^\d+$/.test(query)) {
    return `/ledger/${query}`;
  }

  // Asset code (e.g. USDC, AQUA, yXLM) -> open Markets search
  if (/^[a-z0-9]{2,12}$/i.test(query)) {
    return `/markets?q=${encodeURIComponent(query.toUpperCase())}`;
  }

  // Default to account route
  return `/address/${query}`;
}
