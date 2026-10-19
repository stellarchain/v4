import { API_V1_BASE_URL } from '@/services/api';
import type { PartnerCatalogResponse, PartnerEntry } from './types';

export class PartnerApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(`${API_V1_BASE_URL}${path}`, {
    ...options,
    headers,
    signal: options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new PartnerApiError(
      body?.message || 'Partner service is unavailable. Please retry.',
      response.status,
    );
  }
  return response;
}

export async function loadPartnerCatalog(
  signal: AbortSignal,
  token?: string,
): Promise<PartnerCatalogResponse> {
  return (
    await request(token ? '/admin/partners' : '/partners', { signal }, token)
  ).json();
}

export async function savePartnerCatalog(
  entries: PartnerEntry[],
  revision: string,
  token: string,
): Promise<PartnerCatalogResponse> {
  return (
    await request(
      '/admin/partners',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': `"${revision}"`,
        },
        body: JSON.stringify({ entries }),
      },
      token,
    )
  ).json();
}

export async function exportPartnerClicks(
  from: string,
  to: string,
  token: string,
): Promise<Blob> {
  return (
    await request(
      `/admin/partner-clicks.csv?${new URLSearchParams({ from, to })}`,
      {},
      token,
    )
  ).blob();
}

export function partnerClickEndpoint(): string {
  return `${API_V1_BASE_URL}/partner-clicks`;
}
