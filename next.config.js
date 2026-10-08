/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autoriser les origines de développement locales courantes pour HMR
  experimental: {},
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://192.168.1.64:3000',
    'http://192.168.1.64:3001',
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            // On ne liste que les features reconnues par Chrome — on écrase
            // les headers Vercel qui incluent des features obsolètes/expérimentales
            // comme attribution-reporting, private-aggregation, join-ad-interest-group, run-ad-auction
            value: 'camera=(), microphone=(), geolocation=(), fullscreen=(self)',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

