import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true',
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'coingecko_error', status: res.status },
        {
          status: 502,
          headers: {
            // Cache the error briefly to avoid stampedes if CoinGecko is rate-limiting.
            'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
          },
        }
      );
    }

    const data = await res.json();
    const usd = Number(data?.stellar?.usd ?? 0);
    const usd_24h_change = Number(data?.stellar?.usd_24h_change ?? 0);

    return NextResponse.json(
      { usd, usd_24h_change },
      {
        headers: {
          // CDN cache + SWR; browser will respect this too.
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { error: 'coingecko_fetch_failed' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
        },
      }
    );
  }
}
