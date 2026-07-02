"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Coins, Loader2, Medal, Pencil, Save, Trash2, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { StickerImage } from "@/components/inventory/sticker-image";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { secureApi } from "@/lib/api/client";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { resolveCatalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { useSkinPreview } from "@/lib/use-skin-preview";
import {
  AgentCatalogPicker,
  type AgentPickerItem,
} from "@/components/admin/pickers/agent-catalog-picker";
import {
  CatalogSkinPicker,
  skinDisplayName,
  type CatalogSkinPickerItem,
} from "@/components/admin/pickers/catalog-skin-picker";
import {
  StickerCatalogPicker,
  type StickerPickerItem,
} from "@/components/admin/pickers/sticker-catalog-picker";
import { cn } from "@/lib/utils";
import { surfaceInputClass } from "@/lib/ui/theme-surfaces";
import { ModalPortal } from "@/components/ui/modal-portal";
import { PixIcon } from "@/components/ui/pix-icon";
import {
  defaultPixAmountCents,
  parsePixInputToCents,
  pixPrizeLabel,
  PIX_PRIZE_DESCRIPTION,
} from "@/lib/ranked/pix-prize";

export type SeasonPrizeDraft = {
  id?: string;
  clientKey: string;
  position: number;
  sortOrder: number;
  rewardType: "COINS" | "PIX" | "CATALOG_SKIN" | "AGENT" | "STICKER";
  amountCoins: number;
  pixAmountCents: number;
  catalogSkinId: string | null;
  agentDefIndex: number | null;
  stickerDefIndex: number | null;
  label: string;
  enabled: boolean;
  highlight: boolean;
  previewLabel?: string | null;
  previewImageUrl?: string | null;
  skinMeta?: {
    weaponName: string;
    paintkitName: string;
    rarity: string;
    category?: string;
  };
};

const POSITION_MEDAL = ["🥇", "🥈", "🥉"] as const;
const POSITIONS = [1, 2, 3] as const;

const REWARD_TYPE_LABEL: Record<SeasonPrizeDraft["rewardType"], string> = {
  COINS: "Moedas",
  PIX: "Pix",
  CATALOG_SKIN: "Skin",
  AGENT: "Agente",
  STICKER: "Sticker",
};

type CatalogTab = "skins" | "agents" | "stickers";

function newClientKey(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function coinsLabel(amount: number): string {
  return `${amount.toLocaleString("pt-BR")} moedas`;
}

function defaultCoinsAmount(position: number): number {
  if (position === 1) return 5000;
  if (position === 2) return 3000;
  return 1500;
}

function emptyCoinsPrize(position: number, sortOrder = 0): SeasonPrizeDraft {
  const amount = defaultCoinsAmount(position);
  return {
    clientKey: newClientKey(),
    position,
    sortOrder,
    rewardType: "COINS",
    amountCoins: amount,
    pixAmountCents: 0,
    catalogSkinId: null,
    agentDefIndex: null,
    stickerDefIndex: null,
    label: coinsLabel(amount),
    enabled: true,
    highlight: false,
  };
}

function emptyPixPrize(position: number, sortOrder = 0): SeasonPrizeDraft {
  const pixAmountCents = defaultPixAmountCents(position);
  const label = pixPrizeLabel(pixAmountCents);
  return {
    clientKey: newClientKey(),
    position,
    sortOrder,
    rewardType: "PIX",
    amountCoins: 0,
    pixAmountCents,
    catalogSkinId: null,
    agentDefIndex: null,
    stickerDefIndex: null,
    label,
    previewLabel: label,
    enabled: true,
    highlight: true,
  };
}

function skinPrizeFromItem(position: number, sortOrder: number, item: CatalogSkinPickerItem): SeasonPrizeDraft {
  const label = skinDisplayName(item);
  return {
    clientKey: newClientKey(),
    position,
    sortOrder,
    rewardType: "CATALOG_SKIN",
    amountCoins: 0,
    pixAmountCents: 0,
    catalogSkinId: item.id,
    agentDefIndex: null,
    stickerDefIndex: null,
    label,
    previewLabel: label,
    previewImageUrl: resolveCatalogSkinImageUrl(item.imageUrl, item.id),
    skinMeta: {
      weaponName: item.weaponName,
      paintkitName: item.paintkitName,
      rarity: item.rarity,
      category: item.category,
    },
    enabled: true,
    highlight: false,
  };
}

function agentPrizeFromItem(position: number, sortOrder: number, item: AgentPickerItem): SeasonPrizeDraft {
  return {
    clientKey: newClientKey(),
    position,
    sortOrder,
    rewardType: "AGENT",
    amountCoins: 0,
    pixAmountCents: 0,
    catalogSkinId: null,
    agentDefIndex: item.defIndex,
    stickerDefIndex: null,
    label: item.name,
    previewLabel: item.name,
    previewImageUrl: item.imageUrl,
    enabled: true,
    highlight: false,
  };
}

function stickerPrizeFromItem(position: number, sortOrder: number, item: StickerPickerItem): SeasonPrizeDraft {
  return {
    clientKey: newClientKey(),
    position,
    sortOrder,
    rewardType: "STICKER",
    amountCoins: 0,
    pixAmountCents: 0,
    catalogSkinId: null,
    agentDefIndex: null,
    stickerDefIndex: item.defIndex,
    label: item.name,
    previewLabel: item.name,
    previewImageUrl: item.imageUrl,
    enabled: true,
    highlight: false,
  };
}

function prizeSummary(prize: SeasonPrizeDraft): string {
  if (prize.rewardType === "COINS") return coinsLabel(prize.amountCoins);
  if (prize.rewardType === "PIX") return pixPrizeLabel(prize.pixAmountCents);
  if (prize.previewLabel?.trim()) return prize.previewLabel;
  if (prize.label.trim()) return prize.label;
  return REWARD_TYPE_LABEL[prize.rewardType];
}

function prizesFingerprint(prizes: SeasonPrizeDraft[]): string {
  return JSON.stringify(
    prizes.map((prize) => ({
      id: prize.id ?? null,
      position: prize.position,
      sortOrder: prize.sortOrder,
      rewardType: prize.rewardType,
      amountCoins: prize.amountCoins,
      pixAmountCents: prize.pixAmountCents,
      catalogSkinId: prize.catalogSkinId,
      agentDefIndex: prize.agentDefIndex,
      stickerDefIndex: prize.stickerDefIndex,
      label: prize.label,
      enabled: prize.enabled,
      highlight: prize.highlight,
    })),
  );
}

function reindexSortOrder(prizes: SeasonPrizeDraft[]): SeasonPrizeDraft[] {
  return prizes.map((prize, index) => ({
    ...prize,
    sortOrder: index,
  }));
}

export function buildPrizeDraftsFromSeason(
  prizes: Array<{
    id?: string;
    position: number;
    sortOrder?: number;
    rewardType: SeasonPrizeDraft["rewardType"];
    amountCoins: number;
    pixAmountCents?: number;
    catalogSkinId: string | null;
    agentDefIndex: number | null;
    stickerDefIndex: number | null;
    label: string;
    enabled: boolean;
    highlight?: boolean;
    previewImageUrl?: string | null;
  }>,
): SeasonPrizeDraft[] {
  if (prizes.length === 0) {
    return POSITIONS.map((position) => emptyCoinsPrize(position, 0));
  }

  return [...prizes]
    .sort(
      (a, b) =>
        a.position - b.position ||
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    )
    .map((prize, index) => ({
      id: prize.id,
      clientKey: prize.id ?? `pos-${prize.position}-${index}`,
      position: prize.position,
      sortOrder: prize.sortOrder ?? index,
      rewardType: prize.rewardType,
      amountCoins: prize.amountCoins,
      pixAmountCents: prize.pixAmountCents ?? 0,
      catalogSkinId: prize.catalogSkinId,
      agentDefIndex: prize.agentDefIndex,
      stickerDefIndex: prize.stickerDefIndex,
      label:
        prize.rewardType === "COINS"
          ? coinsLabel(prize.amountCoins)
          : prize.rewardType === "PIX"
            ? pixPrizeLabel(prize.pixAmountCents ?? 0)
            : prize.label,
      enabled: prize.enabled,
      highlight: prize.highlight ?? false,
      previewLabel:
        prize.rewardType === "COINS"
          ? coinsLabel(prize.amountCoins)
          : prize.rewardType === "PIX"
            ? pixPrizeLabel(prize.pixAmountCents ?? 0)
            : prize.label,
      previewImageUrl:
        prize.rewardType === "COINS" || prize.rewardType === "PIX"
          ? null
          : prize.previewImageUrl ??
            resolveCatalogSkinImageUrl(prize.previewImageUrl, prize.catalogSkinId),
      skinMeta:
        prize.rewardType === "CATALOG_SKIN"
          ? (() => {
              const parsed = parseSkinMetaFromLabel(prize.label);
              return parsed ? { ...parsed, rarity: "common" } : undefined;
            })()
          : undefined,
    }));
}

function parseSkinMetaFromLabel(label: string): {
  weaponName: string;
  paintkitName: string;
} | null {
  if (!label.includes(" | ")) return null;
  const [weaponName, paintkitName] = label.split(" | ").map((part) => part.trim());
  if (!weaponName || !paintkitName) return null;
  return { weaponName, paintkitName };
}

function prizeDraftToSkinPreview(prize: SeasonPrizeDraft) {
  if (prize.rewardType !== "CATALOG_SKIN" || !prize.catalogSkinId) return null;

  const name = prizeSummary(prize);
  const meta = prize.skinMeta ?? parseSkinMetaFromLabel(name);
  const rarity = prize.skinMeta?.rarity ?? "common";

  return {
    id: prize.catalogSkinId,
    name,
    imageUrl: resolvePrizePreviewUrl(prize),
    accent: rarityAccent(rarity),
    rarity,
    category: prize.skinMeta?.category,
    weaponName: meta?.weaponName,
    paintkitName: meta?.paintkitName,
  };
}

function resolvePrizePreviewUrl(prize: SeasonPrizeDraft): string | null {
  if (prize.rewardType === "COINS" || prize.rewardType === "PIX") return null;
  if (prize.previewImageUrl) return prize.previewImageUrl;
  if (prize.rewardType === "CATALOG_SKIN" && prize.catalogSkinId) {
    return resolveCatalogSkinImageUrl(null, prize.catalogSkinId);
  }
  return null;
}

function PrizePreviewThumb({
  prize,
  size = "md",
  onSkinPreview,
}: {
  prize: SeasonPrizeDraft;
  size?: "sm" | "md";
  onSkinPreview?: () => void;
}) {
  const imageUrl = resolvePrizePreviewUrl(prize);
  const boxClass = size === "sm" ? "h-10 w-10" : "h-12 w-12 sm:h-14 sm:w-14";
  const isSkin = prize.rewardType === "CATALOG_SKIN" && Boolean(onSkinPreview);

  const content =
    prize.rewardType === "COINS" ? (
      <div className="flex h-full w-full items-center justify-center">
        <Coins className={cn("text-amber-400", size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
      </div>
    ) : prize.rewardType === "PIX" ? (
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-1">
        <PixIcon size={size === "sm" ? 20 : 24} />
        <span className="text-[8px] font-bold uppercase tracking-wide text-[#32BCAD]">Pix</span>
      </div>
    ) : prize.rewardType === "CATALOG_SKIN" && imageUrl ? (
      <InventoryItemArt
        imageUrl={imageUrl}
        accent={rarityAccent(prize.skinMeta?.rarity ?? "common")}
        imagePreset="skin-grid"
        className="h-full w-full"
      />
    ) : prize.rewardType === "AGENT" && imageUrl ? (
      <InventoryItemArt
        imageUrl={imageUrl}
        accent="#a855f7"
        imagePreset="agent-grid"
        className="h-full w-full rounded-lg"
      />
    ) : prize.rewardType === "STICKER" && imageUrl ? (
      <div className="flex h-full w-full items-center justify-center p-1">
        <StickerImage
          src={imageUrl}
          alt={prizeSummary(prize)}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    ) : (
      <div className="flex h-full w-full items-center justify-center">
        <Medal className={cn("text-primary", size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
      </div>
    );

  if (isSkin) {
    return (
      <button
        type="button"
        onClick={onSkinPreview}
        aria-label={`Ver preview de ${prizeSummary(prize)}`}
        className={cn(
          "group relative shrink-0 overflow-hidden rounded-lg border border-border/50 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] transition-colors hover:border-primary/40",
          boxClass,
        )}
      >
        {content}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--background)_40%,transparent)] opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-4 w-4 text-foreground" />
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-border/50 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
        boxClass,
      )}
    >
      {content}
    </div>
  );
}

function pixNotificationPreview(pixAmountCents: number): string {
  return `Parabéns! Você ganhou ${pixPrizeLabel(pixAmountCents).replace(" via Pix", "")} via Pix. Nossa equipe entrará em contato para efetuar o pagamento.`;
}

function PrizeListItem({
  prize,
  variant,
  onToggleEnabled,
  onToggleHighlight,
  onRemove,
  onSkinPreview,
  onCoinsAmountChange,
  onPixAmountChange,
}: {
  prize: SeasonPrizeDraft;
  variant: "summary" | "editor";
  onToggleEnabled?: (enabled: boolean) => void;
  onToggleHighlight?: (highlight: boolean) => void;
  onRemove?: () => void;
  onSkinPreview?: (prize: SeasonPrizeDraft) => void;
  onCoinsAmountChange?: (amount: number) => void;
  onPixAmountChange?: (pixAmountCents: number) => void;
}) {
  const skinPreview =
    prize.rewardType === "CATALOG_SKIN" && onSkinPreview
      ? () => onSkinPreview(prize)
      : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border/60 px-2.5 py-2 sm:px-3 sm:py-2.5",
        variant === "editor" && (prize.rewardType === "COINS" || prize.rewardType === "PIX")
          ? "sm:flex-row sm:items-center"
          : "",
        !prize.enabled && "opacity-50",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <PrizePreviewThumb
          prize={prize}
          size={variant === "summary" ? "sm" : "md"}
          onSkinPreview={skinPreview}
        />

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {REWARD_TYPE_LABEL[prize.rewardType]}
          </p>
          <p className="truncate text-sm font-medium text-foreground">{prizeSummary(prize)}</p>
          {variant === "editor" && prize.rewardType === "PIX" ? (
            <>
              <p className="truncate text-[11px] text-muted">{PIX_PRIZE_DESCRIPTION}</p>
              <p className="truncate text-[11px] text-muted">
                Notificação: {pixNotificationPreview(prize.pixAmountCents)}
              </p>
            </>
          ) : variant === "editor" ? (
            <p className="truncate text-[11px] text-muted">Notificação: {prizeSummary(prize)}</p>
          ) : null}
        </div>

        {variant === "editor" && onToggleEnabled && onRemove ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {onToggleHighlight ? (
              <ConfigToggle
                label="Destacar"
                checked={prize.highlight}
                onChange={onToggleHighlight}
              />
            ) : null}
            <ConfigToggle label="Ativo" checked={prize.enabled} onChange={onToggleEnabled} />
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label="Remover prêmio">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {variant === "editor" && prize.rewardType === "COINS" && onCoinsAmountChange ? (
        <label className="block w-full sm:max-w-[10rem]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Quantidade
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={prize.amountCoins}
            onChange={(e) => {
              const raw = Number(e.target.value);
              if (!Number.isFinite(raw)) return;
              onCoinsAmountChange(raw);
            }}
            className={cn("h-9 w-full rounded-lg px-3 text-sm tabular-nums", surfaceInputClass)}
          />
        </label>
      ) : null}

      {variant === "editor" && prize.rewardType === "PIX" && onPixAmountChange ? (
        <label className="block w-full sm:max-w-[10rem]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Valor (R$)
          </span>
          <input
            type="number"
            min={1}
            step={0.01}
            value={Number((prize.pixAmountCents / 100).toFixed(2))}
            onChange={(e) => {
              const raw = Number(e.target.value);
              if (!Number.isFinite(raw)) return;
              onPixAmountChange(parsePixInputToCents(raw));
            }}
            className={cn("h-9 w-full rounded-lg px-3 text-sm tabular-nums", surfaceInputClass)}
          />
        </label>
      ) : null}
    </div>
  );
}

function ConfigToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-[color-mix(in_srgb,var(--foreground)_22%,transparent)]",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.33rem]" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

function CompactPrizeRow({
  prize,
  onToggleEnabled,
  onToggleHighlight,
  onRemove,
  onSkinPreview,
  onCoinsAmountChange,
  onPixAmountChange,
}: {
  prize: SeasonPrizeDraft;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleHighlight: (highlight: boolean) => void;
  onRemove: () => void;
  onSkinPreview?: (prize: SeasonPrizeDraft) => void;
  onCoinsAmountChange?: (amount: number) => void;
  onPixAmountChange?: (pixAmountCents: number) => void;
}) {
  return (
    <PrizeListItem
      prize={prize}
      variant="editor"
      onToggleEnabled={onToggleEnabled}
      onToggleHighlight={onToggleHighlight}
      onRemove={onRemove}
      onSkinPreview={onSkinPreview}
      onCoinsAmountChange={onCoinsAmountChange}
      onPixAmountChange={onPixAmountChange}
    />
  );
}

function PositionPrizesModal({
  position,
  columnPrizes,
  onClose,
  onReplaceColumnPrizes,
  onSkinPreview,
  onDraftChange,
  escapeDisabled = false,
}: {
  position: number;
  columnPrizes: SeasonPrizeDraft[];
  onClose: () => void;
  onReplaceColumnPrizes: (position: number, nextColumn: SeasonPrizeDraft[]) => void;
  onSkinPreview?: (prize: SeasonPrizeDraft) => void;
  onDraftChange?: (position: number, draft: SeasonPrizeDraft[]) => void;
  escapeDisabled?: boolean;
}) {
  const [localPrizes, setLocalPrizes] = useState(() => reindexSortOrder(columnPrizes));
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("skins");

  useEffect(() => {
    setLocalPrizes(reindexSortOrder(columnPrizes));
  }, [columnPrizes]);

  useEffect(() => {
    onDraftChange?.(position, localPrizes);
  }, [position, localPrizes, onDraftChange]);

  const excludeSkinIds = localPrizes
    .filter((prize) => prize.rewardType === "CATALOG_SKIN" && prize.catalogSkinId)
    .map((prize) => prize.catalogSkinId as string);

  const excludeAgentDefIndexes = localPrizes
    .filter((prize) => prize.rewardType === "AGENT" && prize.agentDefIndex != null)
    .map((prize) => prize.agentDefIndex as number);

  const excludeStickerDefIndexes = localPrizes
    .filter((prize) => prize.rewardType === "STICKER" && prize.stickerDefIndex != null)
    .map((prize) => prize.stickerDefIndex as number);

  function sync(next: SeasonPrizeDraft[]) {
    setLocalPrizes(reindexSortOrder(next));
  }

  function updatePrize(clientKey: string, patch: Partial<SeasonPrizeDraft>) {
    sync(
      localPrizes.map((prize) => {
        if (prize.clientKey !== clientKey) return prize;

        const next = { ...prize, ...patch };
        if (next.rewardType === "COINS") {
          const rawAmount = patch.amountCoins ?? next.amountCoins;
          const amount = Number.isFinite(rawAmount) ? Math.max(1, Math.floor(rawAmount)) : next.amountCoins;
          return {
            ...next,
            amountCoins: amount,
            label: coinsLabel(amount),
            previewLabel: coinsLabel(amount),
          };
        }
        if (next.rewardType === "PIX") {
          const rawCents = patch.pixAmountCents ?? next.pixAmountCents;
          const pixAmountCents = Number.isFinite(rawCents) ? Math.max(100, Math.round(rawCents)) : next.pixAmountCents;
          const label = pixPrizeLabel(pixAmountCents);
          return {
            ...next,
            pixAmountCents,
            label,
            previewLabel: label,
          };
        }
        return next;
      }),
    );
  }

  function addCoinsPrize() {
    sync([
      ...localPrizes,
      emptyCoinsPrize(position, localPrizes.length),
    ]);
  }

  function addPixPrize() {
    sync([
      ...localPrizes,
      emptyPixPrize(position, localPrizes.length),
    ]);
  }

  function removePrize(clientKey: string) {
    sync(localPrizes.filter((prize) => prize.clientKey !== clientKey));
  }

  function appendCatalogPrizes(newPrizes: SeasonPrizeDraft[]) {
    if (newPrizes.length === 0) return;
    sync([
      ...localPrizes,
      ...newPrizes.map((prize, index) => ({
        ...prize,
        sortOrder: localPrizes.length + index,
      })),
    ]);
  }

  const commitDraft = useCallback(() => {
    onReplaceColumnPrizes(position, reindexSortOrder(localPrizes));
    onClose();
  }, [localPrizes, onClose, onReplaceColumnPrizes, position]);

  useEffect(() => {
    if (escapeDisabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") commitDraft();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commitDraft, escapeDisabled]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-140 flex flex-col">
        <button
          type="button"
          className="scrim-dim absolute inset-0"
          aria-label="Fechar premiação"
          onClick={commitDraft}
        />

        <motion.div
          role="dialog"
          aria-modal
          aria-labelledby={`position-prizes-title-${position}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 flex h-full w-full flex-col overflow-hidden glass-modal"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Premiação da temporada
              </p>
              <h2
                id={`position-prizes-title-${position}`}
                className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-foreground sm:text-2xl"
              >
                <span>{POSITION_MEDAL[position - 1]}</span>
                {position}º lugar
              </h2>
              <p className="mt-1 text-sm text-muted">
                Adicione quantos prêmios quiser: moedas, Pix, skins, agentes e stickers na mesma colocação.
              </p>
            </div>
            <button
              type="button"
              onClick={commitDraft}
              className="shrink-0 rounded-xl p-2 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-6">
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold">
                      Prêmios adicionados ({localPrizes.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addCoinsPrize}>
                        <Coins className="h-4 w-4" />
                        Adicionar moedas
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={addPixPrize}>
                        <PixIcon size={16} />
                        Adicionar Pix
                      </Button>
                    </div>
                  </div>

                  {localPrizes.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted">
                      Nenhum prêmio ainda. Adicione moedas, Pix ou selecione itens do catálogo ao lado.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {localPrizes.map((prize) => (
                        <CompactPrizeRow
                          key={prize.clientKey}
                          prize={prize}
                          onToggleEnabled={(enabled) => updatePrize(prize.clientKey, { enabled })}
                          onToggleHighlight={(highlight) => updatePrize(prize.clientKey, { highlight })}
                          onRemove={() => removePrize(prize.clientKey)}
                          onSkinPreview={onSkinPreview}
                          onCoinsAmountChange={
                            prize.rewardType === "COINS"
                              ? (amount) => updatePrize(prize.clientKey, { amountCoins: amount })
                              : undefined
                          }
                          onPixAmountChange={
                            prize.rewardType === "PIX"
                              ? (pixAmountCents) => updatePrize(prize.clientKey, { pixAmountCents })
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="space-y-3">
                <h3 className="font-display text-sm font-bold">Adicionar do catálogo</h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["skins", "Skins / Luvas"],
                      ["agents", "Agentes"],
                      ["stickers", "Stickers"],
                    ] as const
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCatalogTab(tab)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        catalogTab === tab
                          ? "bg-primary/15 text-primary"
                          : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {catalogTab === "skins" ? (
                  <CatalogSkinPicker
                    batchMode
                    excludeIds={excludeSkinIds}
                    onBatchAdd={(items) =>
                      appendCatalogPrizes(
                        items.map((item, index) =>
                          skinPrizeFromItem(position, localPrizes.length + index, item),
                        ),
                      )
                    }
                  />
                ) : null}

                {catalogTab === "agents" ? (
                  <AgentCatalogPicker
                    batchMode
                    excludeDefIndexes={excludeAgentDefIndexes}
                    onBatchAdd={(items) =>
                      appendCatalogPrizes(
                        items.map((item, index) =>
                          agentPrizeFromItem(position, localPrizes.length + index, item),
                        ),
                      )
                    }
                  />
                ) : null}

                {catalogTab === "stickers" ? (
                  <StickerCatalogPicker
                    batchMode
                    excludeDefIndexes={excludeStickerDefIndexes}
                    onBatchAdd={(items) =>
                      appendCatalogPrizes(
                        items.map((item, index) =>
                          stickerPrizeFromItem(position, localPrizes.length + index, item),
                        ),
                      )
                    }
                  />
                ) : null}
              </section>
            </div>
          </div>

          <footer className="flex shrink-0 justify-end border-t border-border/40 px-4 py-4 sm:px-6 lg:px-8">
            <Button type="button" variant="primary" onClick={commitDraft}>
              Concluir
            </Button>
          </footer>
        </motion.div>
      </div>
    </ModalPortal>
  );
}

export function AdminRankedSeasonPrizesEditor({
  seasonId,
  initialPrizes,
  onSaved,
  onError,
}: {
  seasonId: string;
  initialPrizes: SeasonPrizeDraft[];
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [prizes, setPrizes] = useState<SeasonPrizeDraft[]>(initialPrizes);
  const [saving, setSaving] = useState(false);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();
  const syncedFingerprintRef = useRef(prizesFingerprint(initialPrizes));
  const modalDraftRef = useRef<{ position: number; prizes: SeasonPrizeDraft[] } | null>(null);

  function handleSkinPreview(prize: SeasonPrizeDraft) {
    const skin = prizeDraftToSkinPreview(prize);
    if (skin) openPreview(skin);
  }

  const handleModalDraftChange = useMemo(
    () => (position: number, draft: SeasonPrizeDraft[]) => {
      modalDraftRef.current = { position, prizes: draft };
    },
    [],
  );

  useEffect(() => {
    const nextFingerprint = prizesFingerprint(initialPrizes);
    if (nextFingerprint === syncedFingerprintRef.current) return;
    syncedFingerprintRef.current = nextFingerprint;
    setPrizes(initialPrizes);
    setEditingPosition(null);
    modalDraftRef.current = null;
  }, [seasonId, initialPrizes]);

  useEffect(() => {
    if (editingPosition === null) {
      modalDraftRef.current = null;
    }
  }, [editingPosition]);

  const grouped = useMemo(() => {
    return POSITIONS.map((position) =>
      prizes
        .filter((prize) => prize.position === position)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }, [prizes]);

  function replaceColumnPrizes(position: number, nextColumn: SeasonPrizeDraft[]) {
    const normalized = reindexSortOrder(nextColumn).map((prize, index) => ({
      ...prize,
      position,
      sortOrder: index,
    }));
    setPrizes((prev) => [
      ...prev.filter((prize) => prize.position !== position),
      ...normalized,
    ]);
  }

  function resolvePrizesForSave(): SeasonPrizeDraft[] {
    const draft = modalDraftRef.current;
    if (!draft) return prizes;

    const normalized = reindexSortOrder(draft.prizes).map((prize, index) => ({
      ...prize,
      position: draft.position,
      sortOrder: index,
    }));

    return [
      ...prizes.filter((prize) => prize.position !== draft.position),
      ...normalized,
    ];
  }

  async function save() {
    setSaving(true);
    const prizesToSave = resolvePrizesForSave();
    const payload = prizesToSave.map((prize, index) => {
      const label =
        prize.rewardType === "COINS"
          ? coinsLabel(prize.amountCoins)
          : prize.rewardType === "PIX"
            ? pixPrizeLabel(prize.pixAmountCents)
            : prize.previewLabel?.trim() || prize.label.trim() || REWARD_TYPE_LABEL[prize.rewardType];

      return {
        id: prize.id,
        position: prize.position,
        sortOrder: prize.sortOrder ?? index,
        rewardType: prize.rewardType,
        amountCoins: prize.rewardType === "COINS" ? Math.max(1, prize.amountCoins) : prize.amountCoins,
        pixAmountCents:
          prize.rewardType === "PIX" ? Math.max(100, prize.pixAmountCents) : prize.pixAmountCents,
        catalogSkinId: prize.catalogSkinId,
        agentDefIndex: prize.agentDefIndex,
        stickerDefIndex: prize.stickerDefIndex,
        label,
        enabled: prize.enabled,
        highlight: prize.highlight,
      };
    });

    const result = await secureApi(`/api/admin/ranked/seasons/${seasonId}/prizes`, {
      method: "PUT",
      json: { prizes: payload },
    });
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }

    setPrizes(prizesToSave);
    syncedFingerprintRef.current = prizesFingerprint(prizesToSave);
    onSaved();
  }

  const editingColumnIndex =
    editingPosition !== null ? editingPosition - 1 : null;
  const editingColumnPrizes =
    editingColumnIndex !== null ? grouped[editingColumnIndex] ?? [] : [];

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Premiação top 3</h3>
            <p className="text-xs text-muted">
              Configure vários prêmios por colocação: moedas, Pix, skins, agentes e stickers.
            </p>
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Save className="h-4 w-4" />}
            Salvar prêmios
          </Button>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          {POSITIONS.map((position, columnIndex) => {
            const columnPrizes = grouped[columnIndex] ?? [];
            const activeCount = columnPrizes.filter((prize) => prize.enabled).length;

            return (
              <section key={position} className="flex flex-col rounded-card glass p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{POSITION_MEDAL[position - 1]}</span>
                  <div>
                    <p className="font-display text-sm font-bold">{position}º lugar</p>
                    <p className="text-xs text-muted">
                      {columnPrizes.length}{" "}
                      {columnPrizes.length === 1 ? "prêmio" : "prêmios"}
                      {activeCount !== columnPrizes.length
                        ? ` · ${activeCount} ativo${activeCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                </div>

                <ul className="mt-4 min-h-20 flex-1 space-y-2">
                  {columnPrizes.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted">
                      Nenhum prêmio configurado
                    </li>
                  ) : (
                    columnPrizes.map((prize) => (
                      <li key={prize.clientKey}>
                        <PrizeListItem
                          prize={prize}
                          variant="summary"
                          onSkinPreview={handleSkinPreview}
                        />
                      </li>
                    ))
                  )}
                </ul>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setEditingPosition(position)}
                >
                  <Pencil className="h-4 w-4" />
                  Configurar prêmios
                </Button>
              </section>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {editingPosition !== null && (
          <PositionPrizesModal
            position={editingPosition}
            columnPrizes={editingColumnPrizes}
            onClose={() => setEditingPosition(null)}
            onReplaceColumnPrizes={replaceColumnPrizes}
            onSkinPreview={handleSkinPreview}
            onDraftChange={handleModalDraftChange}
            escapeDisabled={isPreviewOpen}
          />
        )}
      </AnimatePresence>

      <SkinPreviewModal
        open={isPreviewOpen}
        skin={previewSkin}
        onClose={closePreview}
        elevated
      />
    </>
  );
}
