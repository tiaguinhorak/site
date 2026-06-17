import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
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
      "img-src 'self' data: blob: https://avatars.steamstatic.com https://steamcdn-a.akamaihd.net",
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
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io", "*.ngrok.app"],
  images: {
    localPatterns: [
      { pathname: "/logo-clutchclube.png" },
      { pathname: "/logo-CB.png" },
      { pathname: "/banner-clutchclube.png" },
      { pathname: "/icon1.png" },
      { pathname: "/apple-icon.png" },
      { pathname: "/web-app-manifest-192x192.png" },
      { pathname: "/web-app-manifest-512x512.png" },
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

export default nextConfig;
