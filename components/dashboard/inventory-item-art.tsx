import { cn } from "@/lib/utils";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";
import { RemoteImage } from "@/components/ui/remote-image";

type InventoryItemArtProps = {
  imageUrl?: string | null;
  accent: string;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
};

export function InventoryItemArt({
  imageUrl,
  accent,
  className,
  onClick,
  priority,
}: InventoryItemArtProps) {
  const inner = imageUrl ? (
    <RemoteImage
      src={imageUrl}
      alt=""
      fill
      sizes="(max-width: 640px) 50vw, 160px"
      className="object-contain object-center p-2"
      priority={priority}
    />
  ) : (
    <div className={cn("h-full w-full bg-linear-to-br opacity-90", accent)} />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative overflow-hidden rounded-xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          surfaceSubtleClass,
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", surfaceSubtleClass, className)}
    >
      {inner}
    </div>
  );
}
