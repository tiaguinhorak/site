import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { FooterAccountLinks } from "@/components/layout/footer-account-links";
import { SteamIcon } from "@/components/ui/icons";
import { ShieldCheck } from "lucide-react";
import { marketingNav } from "@/lib/navigation";
import { SITE_NAME } from "@/lib/brand";

const social = [
  { label: "Discord" },
  { label: "Steam", icon: SteamIcon },
  { label: "X" },
  { label: "YouTube" },
  { label: "Twitch" },
];

export async function Footer() {
  const tFooter = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tBar = await getTranslations("navbar");

  const columns = [
    {
      title: tFooter("platform"),
      links: [
        { label: tFooter("home"), href: "/" },
        ...marketingNav.map((n) => ({ label: tNav(n.i18nKey), href: n.href })),
      ],
    },
    {
      title: tFooter("account"),
      custom: true,
    },
    {
      title: tFooter("community"),
      links: [
        { label: "Discord", href: "#" },
        { label: tFooter("status"), href: "#" },
        { label: tFooter("blog"), href: "#" },
        { label: tFooter("contact"), href: "#" },
      ],
    },
  ];

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border glass-strong">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: "var(--glow-1)" }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {tFooter("tagline")}
            </p>
            <ButtonLink
              href="/anticheat"
              variant="glass"
              size="sm"
              className="mt-6"
            >
              <ShieldCheck className="h-4 w-4" />
              {tBar("downloadAnticheat")}
            </ButtonLink>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                {col.title}
              </h3>
              {"custom" in col && col.custom ? (
                <FooterAccountLinks />
              ) : (
                <ul className="mt-4 space-y-3">
                  {col.links!.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {SITE_NAME}. {tFooter("disclaimer")}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {social.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href="#"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] hover:text-foreground"
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
