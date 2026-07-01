import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <SkeletonText className="w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="rounded-card glass-strong p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <SkeletonAvatar />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <SkeletonText className="w-64" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="rounded-card glass p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText className="w-32" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventoryPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row" aria-busy="true" aria-live="polite">
      <div className="w-full space-y-3 lg:w-72 shrink-0">
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-card" />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LobbyPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-card" />
        ))}
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="space-y-6 pt-24" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full max-w-md rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}

export function MarketingPageSkeleton() {
  return (
    <div className="layout-container space-y-12 py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <Skeleton className="mx-auto h-10 w-64" />
        <SkeletonText className="mx-auto w-96 max-w-full" />
        <Skeleton className="mx-auto h-12 w-48 rounded-xl" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="h-52" />
        ))}
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div
      className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full space-y-4 rounded-card glass p-8">
        <Skeleton className="mx-auto h-8 w-48" />
        <SkeletonText />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
