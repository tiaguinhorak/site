"use client";

import { Wifi, Gauge, Server, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

export function InfrastructurePanel({ serverCount }: { serverCount: string }) {
  const t = useTranslations("infraPanel");
  const infra = [
    {
      icon: MapPin,
      label: t("locationLabel"),
      value: t("locationValue"),
      detail: t("locationDetail"),
    },
    {
      icon: Gauge,
      label: t("linksLabel"),
      value: t("linksValue"),
      detail: t("linksDetail"),
    },
    {
      icon: Wifi,
      label: t("pingLabel"),
      value: t("pingValue"),
      detail: t("pingDetail"),
    },
    {
      icon: Server,
      label: t("serversLabel"),
      value: serverCount,
      detail: t("serversDetail"),
    },
  ];

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
      {infra.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-card glass p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs uppercase tracking-wider text-muted">
              {item.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">
              {item.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {item.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}
