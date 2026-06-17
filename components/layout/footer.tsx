import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { FooterAccountLinks } from "@/components/layout/footer-account-links";
import { SteamIcon } from "@/components/ui/icons";
import { ShieldCheck } from "lucide-react";
import { marketingNav } from "@/lib/navigation";
import { SITE_NAME } from "@/lib/brand";

const columns = [
  {
    title: "Plataforma",
    links: [
      { label: "Início", href: "/" },
      ...marketingNav.map((n) => ({ label: n.label, href: n.href })),
    ],
  },
  {
    title: "Conta",
    custom: true,
  },
  {
    title: "Comunidade",
    links: [
      { label: "Discord", href: "#" },
      { label: "Status dos serviços", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contato", href: "#" },
    ],
  },
];

const social = [
  { label: "Discord" },
  { label: "Steam", icon: SteamIcon },
  { label: "X" },
  { label: "YouTube" },
  { label: "Twitch" },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border bg-background-soft">
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
              Desde 2018 construindo evolução no Counter-Strike: treino de alta
              performance, ranking competitivo e skins liberadas. Play like a
              pro.
            </p>
            <ButtonLink
              href="/anticheat"
              variant="glass"
              size="sm"
              className="mt-6"
            >
              <ShieldCheck className="h-4 w-4" />
              Baixar Anticheat
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
            © {new Date().getFullYear()} {SITE_NAME}. Não afiliado à Valve
            Corporation. Counter-Strike é marca da Valve.
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
