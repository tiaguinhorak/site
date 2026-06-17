"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  inventoryCategoryLabels,
  type InventoryCategoryKey,
} from "@/lib/profile";
import { confirmPresets } from "@/lib/confirm-presets";
import { cn } from "@/lib/utils";

type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategoryKey;
  rarity: string;
  accent: string;
  equipped: boolean;
  owned: boolean;
};

const filters: { id: "all" | InventoryCategoryKey; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "knife", label: "Facas" },
  { id: "gloves", label: "Luvas" },
  { id: "rifle", label: "Rifles" },
  { id: "pistol", label: "Pistolas" },
  { id: "smg", label: "SMGs" },
  { id: "agent", label: "Agentes" },
];

export function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<"all" | InventoryCategoryKey>("all");

  useEffect(() => {
    fetch("/api/inventory", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const filtered =
    filter === "all"
      ? items
      : items.filter((i) => i.category === filter);

  const ownedCount = items.filter((i) => i.owned).length;

  return (
    <section>
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              filter === f.id
                ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted">
        {ownedCount} itens no inventário
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item, i) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "relative overflow-hidden rounded-card glass p-5",
              !item.owned && "opacity-60",
            )}
          >
            <div
              className={cn(
                "h-20 rounded-xl bg-gradient-to-br opacity-80",
                item.accent,
              )}
            />
            <h3 className="mt-4 font-display font-bold text-foreground">
              {item.name}
            </h3>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              {inventoryCategoryLabels[item.category]} · {item.rarity}
            </p>
            {item.owned && (
              <Button
                type="button"
                variant={item.equipped ? "outline" : "primary"}
                size="sm"
                className="mt-4 w-full"
                confirm={confirmPresets.equipSkin(item.name)}
                onClick={() => {}}
              >
                {item.equipped ? "Equipado" : "Equipar"}
              </Button>
            )}
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export function InventoryPreview() {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetch("/api/inventory", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const equipped = items.filter((i) => i.equipped);

  if (equipped.length === 0) {
    return (
      <p className="text-sm text-muted">Nenhum item equipado.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {equipped.slice(0, 6).map((item) => (
        <div key={item.id} className="rounded-xl border border-border p-3">
          <div
            className={cn("h-12 rounded-lg bg-gradient-to-br", item.accent)}
          />
          <p className="mt-2 text-sm font-semibold text-foreground truncate">
            {item.name}
          </p>
        </div>
      ))}
    </div>
  );
}
