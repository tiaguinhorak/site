"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  Gamepad2,
  Newspaper,
  ShoppingBag,
  ShieldCheck,
  Crown,
  Headphones,
  Package,
  Shield,
  Trophy,
  Users,
  Zap,
  Menu,
  X,
  ChevronDown,
  MoreHorizontal,
  Medal,
  Target,
  Award,
  Swords,
  UserPlus,
  History,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { AccountDropdown } from "@/components/dashboard/account-dropdown";
import { WalletDropdown } from "@/components/dashboard/wallet-dropdown";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Gamepad2,
  Newspaper,
  ShoppingBag,
  ShieldCheck,
  Crown,
  Headphones,
  Package,
  Shield,
  Trophy,
  Users,
  Zap,
  MoreHorizontal,
  Medal,
  Target,
  Award,
  Swords,
  UserPlus,
  History,
  Coins,
};

type NavLinkItem = {
  href: string;
  icon: string;
  i18nKey: string;
};

type NavGroup = {
  id: string;
  i18nKey: string;
  icon: string;
  items: NavLinkItem[];
};

const OVERVIEW: NavLinkItem = {
  href: "/dashboard",
  icon: "LayoutDashboard",
  i18nKey: "overview",
};

const RANKED_LINK: NavLinkItem = {
  href: "/dashboard/ranked",
  icon: "Trophy",
  i18nKey: "ranked",
};

const FRIENDS_LINK: NavLinkItem = {
  href: "/dashboard/amigos",
  icon: "UserPlus",
  i18nKey: "friends",
};

const NEWS_LINK: NavLinkItem = {
  href: "/dashboard/noticias",
  icon: "Newspaper",
  i18nKey: "news",
};

const PLAY_GROUP: NavGroup = {
  id: "play",
  i18nKey: "play",
  icon: "Gamepad2",
  items: [
    { href: "/dashboard/lobby", icon: "Users", i18nKey: "lobby" },
    { href: "/dashboard/warmup", icon: "Zap", i18nKey: "warmup" },
    { href: "/dashboard/partidas", icon: "History", i18nKey: "matches" },
  ],
};

const PROGRESS_GROUP: NavGroup = {
  id: "progress",
  i18nKey: "progress",
  icon: "Target",
  items: [
    { href: "/dashboard/ranking", icon: "Medal", i18nKey: "ranking" },
    { href: "/dashboard/passe", icon: "Crown", i18nKey: "battlePass" },
    { href: "/dashboard/missoes", icon: "Target", i18nKey: "missions" },
    { href: "/dashboard/conquistas", icon: "Award", i18nKey: "achievements" },
    { href: "/dashboard/clas", icon: "Swords", i18nKey: "clans" },
  ],
};

const SHOP_GROUP: NavGroup = {
  id: "commerce",
  i18nKey: "commerce",
  icon: "ShoppingBag",
  items: [
    { href: "/dashboard/loja", icon: "ShoppingBag", i18nKey: "store" },
    { href: "/dashboard/loja-moedas", icon: "Coins", i18nKey: "coinShop" },
    { href: "/dashboard/inventario", icon: "Package", i18nKey: "inventory" },
    { href: "/dashboard/premium", icon: "Crown", i18nKey: "premium" },
  ],
};

const MORE_GROUP: NavGroup = {
  id: "more",
  i18nKey: "more",
  icon: "MoreHorizontal",
  items: [
    { href: "/dashboard/anticheat", icon: "ShieldCheck", i18nKey: "anticheat" },
    { href: "/dashboard/suporte", icon: "Headphones", i18nKey: "support" },
  ],
};

const ADMIN_LINK: NavLinkItem = {
  href: "/admin",
  icon: "Shield",
  i18nKey: "admin",
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/admin") return pathname.startsWith("/admin");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => isActive(pathname, item.href));
}

function NavDirectLink({
  item,
  pathname,
  tNav,
}: {
  item: NavLinkItem;
  pathname: string;
  tNav: ReturnType<typeof useTranslations<"nav">>;
}) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      prefetch={false}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap",
        active
          ? "text-foreground bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
          : "text-muted hover:text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="hidden lg:inline">{tNav(item.i18nKey)}</span>
    </Link>
  );
}

function NavDropdown({
  group,
  pathname,
  tNav,
  isOpen,
  onToggle,
  onClose,
}: {
  group: NavGroup;
  pathname: string;
  tNav: ReturnType<typeof useTranslations<"nav">>;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const Icon = iconMap[group.icon] ?? MoreHorizontal;
  const active = groupIsActive(pathname, group);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 220)),
      minWidth: "12.5rem",
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("click", onClickOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClickOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap",
          active || isOpen
            ? "text-foreground bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
            : "text-muted hover:text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="hidden lg:inline">{tNav(group.i18nKey)}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <>
            <button
              type="button"
              className="scrim-dismiss fixed inset-0 z-[79]"
              aria-label={tNav("closeMenu")}
              onClick={onClose}
            />
            <motion.div
              ref={menuRef}
              role="menu"
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={menuStyle}
              className="glass-nav-dropdown z-[80] overflow-hidden rounded-xl p-1 shadow-2xl"
            >
              {group.items.map((item) => {
                const ItemIcon = iconMap[item.icon] ?? LayoutDashboard;
                const itemActive = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    role="menuitem"
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      itemActive
                        ? "text-foreground bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
                        : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                    )}
                  >
                    <ItemIcon className="h-4 w-4 shrink-0 text-primary" />
                    {tNav(item.i18nKey)}
                  </Link>
                );
              })}
            </motion.div>
          </>,
          document.body,
        )}
    </>
  );
}

function MobileNavSection({
  group,
  pathname,
  tNav,
  onNavigate,
  defaultOpen,
}: {
  group: NavGroup;
  pathname: string;
  tNav: ReturnType<typeof useTranslations<"nav">>;
  onNavigate: () => void;
  defaultOpen?: boolean;
}) {
  const Icon = iconMap[group.icon] ?? MoreHorizontal;
  const active = groupIsActive(pathname, group);

  return (
    <details open={defaultOpen || active} className="group">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors [&::-webkit-details-marker]:hidden",
          active
            ? "text-foreground"
            : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-foreground",
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0 text-primary" />
        <span className="flex-1">{tNav(group.i18nKey)}</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mb-1 space-y-0.5 pl-2">
        {group.items.map((item) => {
          const ItemIcon = iconMap[item.icon] ?? LayoutDashboard;
          const itemActive = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  itemActive
                    ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground"
                    : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                )}
              >
                <ItemIcon className="h-4 w-4 shrink-0 text-primary" />
                {tNav(item.i18nKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function DashboardNavbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const tNav = useTranslations("nav");

  const moreGroup: NavGroup = user?.isAdmin
    ? { ...MORE_GROUP, items: [...MORE_GROUP.items, ADMIN_LINK] }
    : MORE_GROUP;

  const navGroups = [PLAY_GROUP, PROGRESS_GROUP, SHOP_GROUP, moreGroup];

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [pathname]);

  const overviewActive = isActive(pathname, OVERVIEW.href);
  const OverviewIcon = iconMap[OVERVIEW.icon] ?? LayoutDashboard;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav
          className={cn(
            "relative z-[52] mx-auto flex w-full max-w-[1920px] items-center gap-2 rounded-2xl px-3 py-2.5 sm:gap-3 sm:px-4",
            "glass-strong glow-ring",
          )}
        >
          <Logo className="shrink-0" />

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 md:flex">
            <NavDirectLink item={OVERVIEW} pathname={pathname} tNav={tNav} />
            <NavDirectLink item={RANKED_LINK} pathname={pathname} tNav={tNav} />
            <NavDirectLink item={FRIENDS_LINK} pathname={pathname} tNav={tNav} />
            <NavDirectLink item={NEWS_LINK} pathname={pathname} tNav={tNav} />

            {navGroups.map((group) => (
              <NavDropdown
                key={group.id}
                group={group}
                pathname={pathname}
                tNav={tNav}
                isOpen={openDropdown === group.id}
                onToggle={() =>
                  setOpenDropdown((prev) => (prev === group.id ? null : group.id))
                }
                onClose={() => setOpenDropdown(null)}
              />
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <WalletDropdown />
            <AccountDropdown />
            <NotificationsDropdown />

            <button
              type="button"
              aria-label={mobileOpen ? tNav("closeMenu") : tNav("openMenu")}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button
                type="button"
                aria-label={tNav("closeMenu")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="scrim-dismiss fixed inset-0 z-[48] md:hidden"
                onClick={() => setMobileOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="glass-nav-dropdown relative z-[51] mx-auto mt-3 max-h-[min(85vh,calc(100dvh-5.5rem))] max-w-[1920px] overflow-y-auto rounded-2xl p-3 md:hidden"
              >
                <Link
                  href={OVERVIEW.href}
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                    overviewActive
                      ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground"
                      : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                  )}
                >
                  <OverviewIcon className="h-4.5 w-4.5 shrink-0 text-primary" />
                  {tNav(OVERVIEW.i18nKey)}
                </Link>

                <div className="mt-1 space-y-0.5">
                  <Link
                    href={RANKED_LINK.href}
                    prefetch={false}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                      isActive(pathname, RANKED_LINK.href)
                        ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground"
                        : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                    )}
                  >
                    <Trophy className="h-4.5 w-4.5 shrink-0 text-primary" />
                    {tNav(RANKED_LINK.i18nKey)}
                  </Link>
                  <Link
                    href={FRIENDS_LINK.href}
                    prefetch={false}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                      isActive(pathname, FRIENDS_LINK.href)
                        ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground"
                        : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                    )}
                  >
                    <UserPlus className="h-4.5 w-4.5 shrink-0 text-primary" />
                    {tNav(FRIENDS_LINK.i18nKey)}
                  </Link>
                  <Link
                    href={NEWS_LINK.href}
                    prefetch={false}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                      isActive(pathname, NEWS_LINK.href)
                        ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground"
                        : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                    )}
                  >
                    <Newspaper className="h-4.5 w-4.5 shrink-0 text-primary" />
                    {tNav(NEWS_LINK.i18nKey)}
                  </Link>
                </div>

                <div className="mt-1 space-y-0.5">
                  {navGroups.map((group) => (
                    <MobileNavSection
                      key={group.id}
                      group={group}
                      pathname={pathname}
                      tNav={tNav}
                      onNavigate={() => setMobileOpen(false)}
                      defaultOpen={groupIsActive(pathname, group)}
                    />
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
