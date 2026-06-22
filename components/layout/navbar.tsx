"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Menu,
  X,
  ShieldCheck,
  LogIn,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { UserMenuDropdown } from "@/components/layout/user-menu-dropdown";
import { ButtonLink } from "@/components/ui/button";
import { marketingNav } from "@/lib/navigation";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { cn } from "@/lib/utils";

const links = marketingNav;

type NavbarProps = {
  variant?: "default" | "auth";
};

export function Navbar({ variant = "default" }: NavbarProps) {
  const pathname = usePathname();
  const { authenticated } = useAuthSession();
  const [open, setOpen] = useState(false);
  const tNav = useTranslations("nav");
  const tBar = useTranslations("navbar");
  const tCommon = useTranslations("common");
  const isAuthPage =
    variant === "auth" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/completar-perfil";

  const mobileMenuHidden = isAuthPage ? "sm:hidden" : "lg:hidden";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        className={cn(
          "relative z-[52] mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-all duration-500 sm:px-5",
          "glass-strong glow-ring",
        )}
      >
        <Logo className="shrink-0" />

        {!isAuthPage && (
          <ul className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 px-4 lg:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-foreground bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {tNav(link.i18nKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {isAuthPage && (
            <ButtonLink
              href="/"
              variant="outline"
              size="sm"
              className="normal-case tracking-normal"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tNav("backToSite")}</span>
              <span className="sm:hidden">{tCommon("back")}</span>
            </ButtonLink>
          )}

          {!isAuthPage && (
            <div className="hidden items-center gap-2 lg:flex">
              <ButtonLink
                href="/anticheat"
                variant="ghost"
                size="sm"
                className="hidden xl:inline-flex"
              >
                <ShieldCheck className="h-4 w-4" />
                {tNav("anticheat")}
              </ButtonLink>
              {authenticated && (
                <>
                  <UserMenuDropdown className="hidden lg:block" />
                  {/* <ButtonLink
                    href="/dashboard"
                    variant="primary"
                    size="sm"
                    className="hidden xl:inline-flex"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </ButtonLink> */}
                </>
              )}
              {!authenticated && (
                <>
                  <ButtonLink href="/login" variant="outline" size="sm">
                    {tBar("login")}
                  </ButtonLink>
                  <ButtonLink href="/register" variant="primary" size="sm">
                    {tBar("register")}
                  </ButtonLink>
                </>
              )}
            </div>
          )}

          {authenticated && !isAuthPage && (
            <>
              <NotificationsDropdown />
              <UserMenuDropdown className="lg:hidden" />
            </>
          )}

          {(!authenticated || isAuthPage) && (
            <LanguageSwitcher className="hidden sm:block" />
          )}
          {(!authenticated || isAuthPage) && <ThemeToggle />}

          <button
            type="button"
            aria-label={open ? tNav("closeMenu") : tNav("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "glass inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground",
              mobileMenuHidden,
            )}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label={tNav("closeMenu")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("scrim-dismiss fixed inset-0 z-[48]", mobileMenuHidden)}
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "glass-menu relative z-[51] mx-auto mt-3 max-w-6xl overflow-hidden rounded-2xl p-3",
                mobileMenuHidden,
              )}
            >
              {!isAuthPage && (
                <ul className="flex flex-col">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
                      >
                        {tNav(link.i18nKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className={cn("grid gap-2", !isAuthPage && "mt-2")}>
                {authenticated ? (
                  <div className="space-y-2">
                    <UserMenuDropdown align="left" className="w-full" />
                    <ButtonLink
                      href="/dashboard"
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => setOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {tBar("dashboard")}
                    </ButtonLink>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <ButtonLink
                      href="/login"
                      variant="outline"
                      size="md"
                      onClick={() => setOpen(false)}
                    >
                      <LogIn className="h-4 w-4" />
                      {tBar("login")}
                    </ButtonLink>
                    <ButtonLink
                      href="/register"
                      variant="primary"
                      size="md"
                      onClick={() => setOpen(false)}
                    >
                      {tBar("register")}
                    </ButtonLink>
                  </div>
                )}
              </div>

              {!isAuthPage && (
                <ButtonLink
                  href="/anticheat"
                  variant="glass"
                  size="md"
                  className="mt-2 w-full"
                  onClick={() => setOpen(false)}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {tBar("downloadAnticheat")}
                </ButtonLink>
              )}

              {!isAuthPage && !authenticated && (
                <div className="mt-2 flex justify-center py-1 lg:hidden">
                  <LanguageSwitcher variant="inline" />
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
