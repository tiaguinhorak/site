import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      data-skeleton
      className={cn(
        "rounded-md bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] dark:bg-white/5",
        "animate-pulse",
        className,
      )}
      aria-hidden
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-40 rounded-card", className)} />;
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-20 w-20 rounded-2xl", className)} />;
}
