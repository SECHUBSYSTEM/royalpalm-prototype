import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - next-pwa types are for Next.js 13, but we're on 16 - works at runtime
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Fix Turbopack/webpack conflict with next-pwa
  turbopack: {},

  // Security Headers
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Allow all origins for prototype
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self' https: localhost:* 127.0.0.1:*; script-src 'self' 'unsafe-eval' 'unsafe-inline' https: localhost:* 127.0.0.1:*; style-src 'self' 'unsafe-inline' https: localhost:* 127.0.0.1:*; img-src 'self' data: https: blob: localhost:* 127.0.0.1:*; font-src 'self' data: https: localhost:* 127.0.0.1:*; connect-src 'self' https: ws: wss: localhost:* 127.0.0.1:*; media-src 'self' https: localhost:* 127.0.0.1:*;",
          },
        ],
      },
    ];
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable in dev for faster reloads
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

// Type assertion to work around Next.js version mismatch in types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default pwaConfig(nextConfig as any) as NextConfig;
