/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators : false,
  basePath: '/Syst-me-Administratif-Scolaire',
  assetPrefix: '/Syst-me-Administratif-Scolaire',
  output: 'export',
}

export default nextConfig
