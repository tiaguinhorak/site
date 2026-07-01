import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type DashboardPageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
};

export function DashboardPageShell({
  title,
  description,
  children,
  wide = false,
}: DashboardPageShellProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 space-y-10 sm:space-y-12",
        wide ? "layout-container-flush" : "layout-container",
      )}
    >
      <PageHeader title={title} description={description} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
