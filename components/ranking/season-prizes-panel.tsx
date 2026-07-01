"use client";

import { useEffect, useState } from "react";
import { Coins, Medal, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { RemoteImage } from "@/components/ui/remote-image";
import { PixIcon } from "@/components/ui/pix-icon";
import { skinPreviewImageUrl } from "@/lib/inventory/skin-images";
import type { PublicSeasonPrizeDisplay } from "@/lib/ranked/season-prize-display";
import { cn } from "@/lib/utils";
import { ModalPortal } from "@/components/ui/modal-portal";

const POSITION_MEDAL = ["🥇", "🥈", "🥉"] as const;

type SeasonPrizesPanelProps = {
  seasonName: string;
  archived?: boolean;
  prizes: PublicSeasonPrizeDisplay[];
  className?: string;
};

function groupPrizesByPosition(prizes: PublicSeasonPrizeDisplay[]) {
  const groups: PublicSeasonPrizeDisplay[][] = [[], [], []];
  for (const prize of prizes) {
    const index = prize.position - 1;
    if (index >= 0 && index < 3) {
      groups[index]!.push(prize);
    }
  }
  return groups;
}

function skinTileUrl(prize: PublicSeasonPrizeDisplay): string | null {
  if (prize.rewardType !== "CATALOG_SKIN" || !prize.imageUrl) return null;
  return skinPreviewImageUrl(prize.imageUrl) ?? prize.imageUrl;
}

function SkinPreviewModal({
  prize,
  onClose,
}: {
  prize: PublicSeasonPrizeDisplay;
  onClose: () => void;
}) {
  const previewUrl = skinTileUrl(prize);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!previewUrl) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-120 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={prize.displayName}
    >
      <button
        type="button"
        aria-label="Fechar"
        className="scrim-dismiss absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border glass-strong shadow-2xl">
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-[color-mix(in_srgb,var(--background)_80%,transparent)] text-foreground transition-colors hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative aspect-square w-full bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]">
          <RemoteImage
            src={previewUrl}
            alt={prize.displayName}
            fill
            sizes="(max-width: 640px) 90vw, 512px"
            className="object-contain p-6 sm:p-10"
            priority
          />
        </div>

        <div className="border-t border-border px-5 py-4">
          <p className="font-display text-lg font-bold text-foreground">{prize.displayName}</p>
          {prize.label && prize.label !== prize.displayName && (
            <p className="mt-1 text-sm text-muted">{prize.label}</p>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function SkinPrizeCard({
  prize,
  onPreview,
}: {
  prize: PublicSeasonPrizeDisplay;
  onPreview: () => void;
}) {
  const tileUrl = skinTileUrl(prize);
  if (!tileUrl) return null;

  return (
    <li>
      <button
        type="button"
        onClick={onPreview}
        className="group flex w-full cursor-zoom-in flex-col overflow-hidden rounded-xl border border-border/70 bg-[color-mix(in_srgb,var(--background)_70%,transparent)] text-left transition-colors hover:border-primary/40 hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
      >
        <div className="relative aspect-4/3 w-full bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]">
          <RemoteImage
            src={tileUrl}
            alt={prize.displayName}
            fill
            sizes="(max-width: 768px) 80vw, 240px"
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-105 sm:p-4"
          />
          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg border border-border/80 bg-[color-mix(in_srgb,var(--background)_75%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="h-3 w-3" />
            Ampliar
          </span>
        </div>

        <div className="border-t border-border/60 px-3 py-2.5">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {prize.displayName}
          </p>
          {prize.label && prize.label !== prize.displayName && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{prize.label}</p>
          )}
        </div>
      </button>
    </li>
  );
}

function CompactPrizeRow({ prize }: { prize: PublicSeasonPrizeDisplay }) {
  const tPix = useTranslations("pix");
  const isPix = prize.rewardType === "PIX";
  const featured = prize.highlight;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        featured
          ? isPix
            ? "border-[color-mix(in_srgb,#32BCAD_50%,transparent)] bg-[color-mix(in_srgb,#32BCAD_8%,transparent)] shadow-[0_0_24px_color-mix(in_srgb,#32BCAD_18%,transparent)]"
            : "border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
          : "border-border/60",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        {prize.rewardType === "COINS" ? (
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]">
            <Coins className="h-5 w-5 text-amber-400" />
          </span>
        ) : isPix ? (
          <PixIcon size={24} />
        ) : prize.imageUrl ? (
          <RemoteImage
            src={prize.imageUrl}
            alt={prize.displayName}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]">
            <Medal className="h-5 w-5 text-primary" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{prize.displayName}</p>
          {featured ? (
            <span className="rounded-full border border-primary/35 bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
              Destaque
            </span>
          ) : null}
        </div>
        {isPix ? (
          <p className="truncate text-xs text-muted">
            {prize.description ?? tPix("description")}
          </p>
        ) : prize.label && prize.label !== prize.displayName ? (
          <p className="truncate text-xs text-muted">{prize.label}</p>
        ) : null}
      </div>
    </li>
  );
}

function PositionPrizes({
  positionPrizes,
  onPreviewSkin,
}: {
  positionPrizes: PublicSeasonPrizeDisplay[];
  onPreviewSkin: (prize: PublicSeasonPrizeDisplay) => void;
}) {
  const skins = positionPrizes.filter((prize) => prize.rewardType === "CATALOG_SKIN");
  const others = positionPrizes.filter((prize) => prize.rewardType !== "CATALOG_SKIN");

  return (
    <div className="space-y-3">
      {skins.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          {skins.map((prize) => (
            <SkinPrizeCard
              key={prize.id}
              prize={prize}
              onPreview={() => onPreviewSkin(prize)}
            />
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className="space-y-2">
          {others.map((prize) => (
            <CompactPrizeRow key={prize.id} prize={prize} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function SeasonPrizesPanel({
  seasonName,
  archived = false,
  prizes,
  className,
}: SeasonPrizesPanelProps) {
  const [previewSkin, setPreviewSkin] = useState<PublicSeasonPrizeDisplay | null>(null);
  const groups = groupPrizesByPosition(prizes);
  const hasPrizes = prizes.length > 0;

  if (!hasPrizes) return null;

  return (
    <>
      <section
        className={cn(
          "overflow-hidden rounded-card glass border border-[color-mix(in_srgb,var(--primary)_16%,transparent)]",
          className,
        )}
      >
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Premiações da temporada
          </p>
          <p className="mt-1 font-display text-lg font-bold text-foreground">{seasonName}</p>
          {archived && (
            <p className="mt-1 text-sm text-muted">
              Histórico de prêmios — temporada encerrada.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 md:p-5">
          {groups.map((positionPrizes, index) => (
            <div
              key={index + 1}
              className="rounded-xl border border-border/80 bg-[color-mix(in_srgb,var(--background)_55%,transparent)] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">{POSITION_MEDAL[index]}</span>
                <span className="font-display text-sm font-bold text-foreground">
                  {index + 1}º lugar
                </span>
              </div>

              {positionPrizes.length === 0 ? (
                <p className="text-sm text-muted">Sem prêmios configurados.</p>
              ) : (
                <PositionPrizes
                  positionPrizes={positionPrizes}
                  onPreviewSkin={setPreviewSkin}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {previewSkin && (
        <SkinPreviewModal prize={previewSkin} onClose={() => setPreviewSkin(null)} />
      )}
    </>
  );
}
