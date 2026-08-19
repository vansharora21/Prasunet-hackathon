import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),

  // ── Performance ──────────────────────────────────────────────
  // Compress responses (gzip/brotli) for faster transfers
  compress: true,

  // Generate standalone output for smaller deploys
  output: 'standalone',

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24h
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable experimental optimizations
  experimental: {
    // Reduce JS bundle size
    optimizePackageImports: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
  },
};

export default nextConfig;