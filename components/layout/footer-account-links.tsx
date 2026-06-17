"use client";

import Link from "next/link";
import { useAuthSession } from "@/lib/hooks/use-auth-session";

export function FooterAccountLinks() {
  const { authenticated } = useAuthSession();

  const links = authenticated
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Inventário", href: "/dashboard/inventario" },
        { label: "Perfil", href: "/dashboard/perfil" },
        { label: "Baixar anticheat", href: "/anticheat" },
      ]
    : [
        { label: "Entrar", href: "/login" },
        { label: "Criar conta", href: "/register" },
        { label: "Baixar anticheat", href: "/anticheat" },
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
