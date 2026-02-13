import { withSentryConfig } from '@sentry/nextjs';
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

const sentryConfig = {
  org: 'remote-tech',
  project: 'stellarchain-v4',
  sentryUrl: 'https://monitoring.wifcloud.com/',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

export default process.env.NODE_ENV === 'development'
  ? nextConfig
  : withSentryConfig(nextConfig, sentryConfig);
