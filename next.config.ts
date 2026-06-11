import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Match the widths previously allow-listed in Vercel's image optimizer config.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [256, 384, 512],
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
