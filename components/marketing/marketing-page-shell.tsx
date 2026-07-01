import { PageHeader } from "@/components/ui/page-header";
import { AmbientGlow } from "@/components/ui/ambient";
import type { ReactNode } from "react";

type MarketingPageShellProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  children: ReactNode;
  withGlow?: boolean;
};

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
  withGlow = true,
}: MarketingPageShellProps) {
  return (
    <div className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
      {withGlow && <AmbientGlow />}
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_75%)] opacity-50" aria-hidden />
      <div className="layout-container relative">
        <PageHeader eyebrow={eyebrow} title={title} description={description} size="lg" />
        <div className="mt-10 min-w-0 sm:mt-12">{children}</div>
      </div>
    </div>
  );
}
