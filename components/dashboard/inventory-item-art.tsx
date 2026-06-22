import { cn } from "@/lib/utils";
import { RemoteImage } from "@/components/ui/remote-image";

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
        "relative overflow-hidden rounded-xl bg-black/25 ring-1 ring-white/5",
        className,
      )}
    >
      {imageUrl ? (
        <RemoteImage
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, 120px"
          className="object-contain object-center p-2"
        />
      ) : (
        <div className={cn("h-full w-full bg-gradient-to-br opacity-90", accent)} />
      )}
    </div>
  );
}
