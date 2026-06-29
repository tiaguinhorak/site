import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.steamstatic.com https://avatars.steamstatic.com https://steamcdn-a.akamaihd.net https://community.akamai.steamstatic.com https://community.cloudflare.steamstatic.com https://raw.githubusercontent.com",
      "font-src 'self'",
      "connect-src 'self' https://api.steampowered.com https://steamcommunity.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

/** Evita cache agressivo em logos, favicons e banners (dev e após trocar arquivos) */
const brandAssetCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=0, must-revalidate",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg", "ssh2", "rcon-client"],
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io", "*.ngrok.app"],
  images: {
    qualities: [75, 85, 90, 95],
    // Steam skin/agent images never change — cache them aggressively (30 days)
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "avatars.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net", pathname: "/**" },
      { protocol: "https", hostname: "community.akamai.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "community.cloudflare.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/**" },
    ],
    localPatterns: [
      { pathname: "/logo-clutchclube.png" },
      { pathname: "/logo-CB.png" },
      { pathname: "/banner-clutchclube.png" },
      { pathname: "/icon1.png" },
      { pathname: "/apple-icon.png" },
      { pathname: "/web-app-manifest-192x192.png" },
      { pathname: "/web-app-manifest-512x512.png" },
      { pathname: "/uploads/**" },
      { pathname: "/avatars/**" },
    ],
  },
  async headers() {
    return [
      {
        source:
          "/:file(favicon.ico|icon1.png|apple-icon.png|logo-clutchclube.png|logo-CB.png|banner-clutchclube.png|web-app-manifest-192x192.png|web-app-manifest-512x512.png)",
        headers: brandAssetCacheHeaders,
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
