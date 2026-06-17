import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={`${SITE_NAME} — página inicial`}
    >
      <Image
        src={showWord ? BRAND_ASSETS.logo : BRAND_ASSETS.logoMark}
        alt=""
        width={showWord ? 44 : 36}
        height={showWord ? 44 : 36}
        className={cn(
          "shrink-0 object-contain transition-transform duration-500 group-hover:scale-105",
          showWord ? "h-10 w-10 sm:h-11 sm:w-11" : "h-9 w-9",
        )}
        priority
      />
      {showWord && (
        <span className="font-display text-lg font-bold tracking-[0.08em] text-foreground sm:text-xl">
          clutch<span className="text-primary">clube</span>
        </span>
      )}
    </Link>
  );
}
