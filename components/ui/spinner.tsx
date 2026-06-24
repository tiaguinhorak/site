import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<SpinnerSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
  label?: string;
};

/** Animated loading ring — keeps spinning even when prefers-reduced-motion is active. */
export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <Loader2
      data-motion-safe
      className={cn(sizeClasses[size], "motion-safe-spin", className)}
      aria-hidden={!label}
      aria-label={label}
    />
  );
}

type CenteredLoaderProps = {
  className?: string;
  size?: SpinnerSize;
  label?: string;
};

export function CenteredLoader({
  className,
  size = "lg",
  label = "Loading",
}: CenteredLoaderProps) {
  return (
    <div
      className={cn("flex items-center justify-center py-16", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size={size} className="text-primary" label={label} />
    </div>
  );
}
