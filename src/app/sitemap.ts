import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const SITE_URL = 'https://stellarchain.io';

const STATIC_ROUTES = [
  '',
  '/markets',
  '/transactions',
  '/ledgers',
  '/accounts',
  '/accounts/directory',
  '/contracts',
  '/liquidity-pools',
  '/assets',
  '/projects',
  '/news',
  '/statistics',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'hourly' : 'daily',
    priority: path === '' ? 1 : 0.7,
  }));
}
