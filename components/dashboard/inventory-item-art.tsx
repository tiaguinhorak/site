import { cn } from "@/lib/utils";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";
import { RemoteImage } from "@/components/ui/remote-image";
import {
  agentGridImageUrl,
  agentPreviewImageUrl,
  skinGridImageUrl,
  skinPreviewImageUrl,
} from "@/lib/inventory/skin-images";

type ImagePreset = "skin-grid" | "agent-grid" | "agent-preview" | "skin-preview";

type InventoryItemArtProps = {
  imageUrl?: string | null;
  accent: string;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
  imagePreset?: ImagePreset;
};

function resolveImageSrc(
  imageUrl: string | null | undefined,
  preset: ImagePreset,
): string | null {
  if (!imageUrl?.trim()) return null;
  switch (preset) {
    case "agent-preview":
      return agentPreviewImageUrl(imageUrl) ?? imageUrl;
    case "agent-grid":
      return agentGridImageUrl(imageUrl) ?? imageUrl;
    case "skin-preview":
      return skinPreviewImageUrl(imageUrl) ?? imageUrl;
    case "skin-grid":
    default:
      return skinGridImageUrl(imageUrl) ?? imageUrl;
  }
}

function sizesForPreset(preset: ImagePreset): string {
  switch (preset) {
    case "agent-preview":
      return "(max-width: 640px) 80vw, 440px";
    case "agent-grid":
      return "(max-width: 640px) 50vw, 200px";
    case "skin-preview":
      return "(max-width: 640px) 80vw, 512px";
    default:
      return "(max-width: 640px) 50vw, 160px";
  }
}

export function InventoryItemArt({
  imageUrl,
  accent,
  className,
  onClick,
  priority,
  imagePreset = "skin-grid",
}: InventoryItemArtProps) {
  const src = resolveImageSrc(imageUrl, imagePreset);
  const inner = src ? (
    <RemoteImage
      src={src}
      alt=""
      fill
      sizes={sizesForPreset(imagePreset)}
      className="object-contain object-center p-2"
      priority={priority}
      quality={85}
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
