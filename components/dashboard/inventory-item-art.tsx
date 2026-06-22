import { cn } from "@/lib/utils";

type InventoryItemArtProps = {
  imageUrl?: string | null;
  accent: string;
  className?: string;
};

export function InventoryItemArt({
  imageUrl,
  accent,
  className,
}: InventoryItemArtProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-black/25 ring-1 ring-white/5",
        className,
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-contain object-center p-2"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={cn("h-full w-full bg-gradient-to-br opacity-90", accent)} />
      )}
    </div>
  );
}
