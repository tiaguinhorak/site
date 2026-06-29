import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Manrope } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ConfirmProvider } from "@/components/providers/confirm-provider";
import { BrowserNotificationListener } from "@/components/notifications/browser-notification-listener";
import { UserProvider } from "@/components/providers/user-provider";
import { AppToaster } from "@/components/providers/app-toaster";
import { NavigationProgress } from "@/components/providers/navigation-progress";
import { IntlClientProvider } from "@/components/providers/intl-client-provider";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
  preload: false,
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "optional",
  preload: false,
});

const metadataBaseUrl =
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description:
    "A rede competitiva de CS2 do Brasil. Retakes, Deathmatch, ranking com ELO, skins liberadas e anticheat próprio. Conecte-se em um clique e domine o servidor.",
  keywords: [
    "CS2",
    "Counter-Strike",
    "clutchclube",
    "servidor CS2",
    "retake",
    "deathmatch",
    "ranking",
    "anticheat",
    "skins",
  ],
  authors: [{ name: SITE_NAME }],
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: BRAND_ASSETS.favicon, sizes: "any" },
      {
        url: BRAND_ASSETS.icon,
        sizes: "741x615",
        type: "image/png",
      },
      { url: BRAND_ASSETS.iconSmall, sizes: "96x96", type: "image/png" },
      {
        url: BRAND_ASSETS.manifest192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: BRAND_ASSETS.manifest512,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: BRAND_ASSETS.appleIcon,
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: BRAND_ASSETS.favicon,
  },
  openGraph: {
    title: `${SITE_NAME} — Rede de Servidores CS2`,
    description:
      "Treine como os profissionais. Servidores de alta performance, ranking com ELO e skins liberadas.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: BRAND_ASSETS.banner, width: 1672, height: 941, alt: SITE_NAME }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#07050d" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className={`${chakra.variable} ${manrope.variable} min-h-dvh antialiased`}
      >
        <IntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ConfirmProvider>
              <UserProvider>
                <NavigationProgress />
                <AppToaster />
                <BrowserNotificationListener />
                {children}
              </UserProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </IntlClientProvider>
      </body>
    </html>
  );
}
