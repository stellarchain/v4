import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep dev flexible for dynamic routes; export static files only for production builds.
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' as const } : {}),
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
