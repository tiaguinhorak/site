"use client";

import { usePathname } from "next/navigation";

type RouteKeyProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Remounts children on route change so client pages don't keep stale UI ("ghost layouts").
 */
export function RouteKey({ children, className }: RouteKeyProps) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={className}>
      {children}
    </div>
  );
}
