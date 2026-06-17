import { ASSET_VERSION } from "@/lib/generated/asset-version";

/** Query string para quebrar cache quando arquivos em /public mudam */
export function assetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}?v=${ASSET_VERSION}`;
}

const paths = {
  logo: "/logo-clutchclube.png",
  logoMark: "/logo-CB.png",
  /** Favicon principal — gerado de logo-clutchclube.png */
  icon: "/logo-clutchclube.png",
  favicon: "/favicon.ico",
  appleIcon: "/apple-icon.png",
  banner: "/banner-clutchclube.png",
  manifest192: "/web-app-manifest-192x192.png",
  manifest512: "/web-app-manifest-512x512.png",
  /** Ícone 96px para notificações — gerado do logo */
  iconSmall: "/icon1.png",
} as const;

/** URLs versionadas dos assets de marca em /public */
export const BRAND_ASSETS = {
  logo: assetUrl(paths.logo),
  logoMark: assetUrl(paths.logoMark),
  icon: assetUrl(paths.icon),
  favicon: assetUrl(paths.favicon),
  appleIcon: assetUrl(paths.appleIcon),
  banner: assetUrl(paths.banner),
  manifest192: assetUrl(paths.manifest192),
  manifest512: assetUrl(paths.manifest512),
  iconSmall: assetUrl(paths.iconSmall),
} as const;

/** Caminhos sem query (rotas estáticas do Next em app/) */
export const BRAND_ASSET_PATHS = paths;
