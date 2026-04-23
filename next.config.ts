import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
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
