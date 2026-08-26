import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages are compiled from source so the app and the API share exactly
  // one copy of the domain rules (ADR 0001).
  transpilePackages: [
    '@probash/i18n',
    '@probash/design-tokens',
    '@probash/domain',
    '@probash/contracts',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            // The worker app asks for the microphone and camera only where a flow needs them.
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default config;
