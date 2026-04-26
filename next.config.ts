import type { NextConfig } from "next";

/**
 * Government-grade security headers per IT Act, 2000 + CERT-In guidelines.
 * STS only emitted in production (assumes TLS termination at Caddy/nginx).
 */
const isProd = process.env.NODE_ENV === "production";

const TILE_HOSTS = [
  "https://basemaps.cartocdn.com",
  "https://*.basemaps.cartocdn.com",
  "https://*.tile.openstreetmap.org",
  "https://api.maptiler.com",
  // 3D globe textures (three-globe). Self-host under /public/textures/ for prod.
  "https://unpkg.com",
];

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' blob: data: " + TILE_HOSTS.join(" "),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
  "connect-src 'self' " + TILE_HOSTS.join(" "),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  typescript: {
    // Use NEXT_IGNORE_TS_ERRORS=1 only for emergency local builds.
    ignoreBuildErrors: process.env.NEXT_IGNORE_TS_ERRORS === "1",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
