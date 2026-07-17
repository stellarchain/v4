import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {
    root: projectRoot,
  },
  // Keep dev flexible for dynamic routes; export static files in non-dev environments.
  ...(process.env.NODE_ENV !== 'development' ? { output: 'export' as const } : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
