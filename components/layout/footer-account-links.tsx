"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuthSession } from "@/lib/hooks/use-auth-session";

export function FooterAccountLinks() {
  const { authenticated } = useAuthSession();
  const t = useTranslations("auth.accountLinks");

  const links = authenticated
    ? [
        { label: t("dashboard"), href: "/dashboard" },
        { label: t("inventory"), href: "/dashboard/inventario" },
        { label: t("profile"), href: "/dashboard/perfil" },
        { label: t("downloadAnticheat"), href: "/anticheat" },
      ]
    : [
        { label: t("login"), href: "/login" },
        { label: t("register"), href: "/register" },
        { label: t("downloadAnticheat"), href: "/anticheat" },
      ];

  return (
    <ul className="mt-4 space-y-3">
      {links.map((link) => (
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
  );
}
