import type { NextConfig } from "next";

/**
 * Next.js Production Configuration - Performance Optimized
 * 
 * Features:
 * - HTTP compression
 * - Image optimization (AVIF, WebP)
 * - Bundle optimization
 * - Cache control headers
 * - Performance optimizations
 * - Security headers
 * - SEO optimizations
 */

const nextConfig: NextConfig = {
  // Enable compression
  compress: process.env.ENABLE_COMPRESSION !== "false",

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true,

  // Image optimization
  // Set NEXT_IMAGE_UNOPTIMIZED=true in production to bypass proxy and fix 504 Gateway Timeout
  // when Cloudinary images timeout during Next.js image optimization.
  images: {
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "true",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // Environment variables
  env: {
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED || "true",
    NEXT_PUBLIC_BETA_MODE: process.env.BETA_MODE || "false",
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
      {
        // Static assets caching
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Image caching
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Font caching
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Output configuration for Docker
  output: "standalone",

  // Server external packages (moved from experimental in Next.js 16)
  serverExternalPackages: ["@prisma/client"],

  // Experimental features
  experimental: {
    // optimizeCss disabled: lightningcss linux-musl binary fails on Railway (SIGSEGV)
    // optimizeCss: true,
  },

  // Turbopack configuration (Next.js 16 default)
  // Empty config silences the warning when webpack config is present
  // Webpack config is kept for explicit --webpack builds
  turbopack: {},

  // TypeScript configuration
  typescript: {
    // Ignore build errors in generated Next.js types (known issue in Next.js 16)
    ignoreBuildErrors: false,
  },

  // Webpack optimizations (used when --webpack flag is explicitly passed)
  // Note: Next.js 16 uses Turbopack by default, webpack is optional
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: "vendor",
              chunks: "all",
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },
};

// Bundle analyzer (optional, enabled via ANALYZE env var)
// Only load when ANALYZE=true to avoid build failures
let withBundleAnalyzer = (config: NextConfig) => config;

if (process.env.ANALYZE === "true") {
  try {
    withBundleAnalyzer = require("@next/bundle-analyzer")({
      enabled: true,
    });
  } catch (error) {
    console.warn(
      "Bundle analyzer not available. Install @next/bundle-analyzer to use it."
    );
  }
}

// Export with bundle analyzer wrapper (no-op if analyzer not enabled)
export default withBundleAnalyzer(nextConfig);
