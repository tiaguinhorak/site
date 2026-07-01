import Image from "next/image";
import { cn } from "@/lib/utils";

type PixIconProps = {
  className?: string;
  /** `symbol` = só o símbolo (quadrado); `logo` = marca completa Pix. */
  variant?: "symbol" | "logo";
  size?: number;
};

/** Marca Pix oficial (Banco Central do Brasil) — `/public/icons/pix-logo.svg`. */
export function PixIcon({ className, variant = "symbol", size = 20 }: PixIconProps) {
  if (variant === "logo") {
    return (
      <Image
        src="/icons/pix-logo.svg"
        alt="Pix"
        width={Math.round(size * 2.8)}
        height={size}
        className={cn("h-auto w-auto object-contain", className)}
        unoptimized
      />
    );
  }

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/icons/pix-logo.svg"
        alt=""
        aria-hidden
        fill
        className="object-contain object-left"
        unoptimized
      />
    </span>
  );
}
