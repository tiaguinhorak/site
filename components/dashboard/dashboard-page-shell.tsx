import { PageHeader } from "@/components/ui/page-header";
import type { ReactNode } from "react";

type DashboardPageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function DashboardPageShell({
  title,
  description,
  children,
}: DashboardPageShellProps) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-10 sm:space-y-12">
      <PageHeader title={title} description={description} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
