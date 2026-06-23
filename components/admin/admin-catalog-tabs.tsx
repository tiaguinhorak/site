"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AdminSkinsSection } from "@/components/admin/admin-skins-section";
import { AdminStickersSection } from "@/components/admin/admin-stickers-section";

type Tab = "skins" | "stickers";

export function AdminCatalogTabs() {
  const [tab, setTab] = useState<Tab>("skins");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setTab("skins")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            tab === "skins"
              ? "bg-primary/20 text-primary"
              : "text-muted hover:text-foreground",
          )}
        >
          Skins
        </button>
        <button
          type="button"
          onClick={() => setTab("stickers")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            tab === "stickers"
              ? "bg-primary/20 text-primary"
              : "text-muted hover:text-foreground",
          )}
        >
          Stickers
        </button>
      </div>
      {tab === "skins" ? <AdminSkinsSection /> : <AdminStickersSection />}
    </div>
  );
}
