"use client";

import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PLAN_COMPARISON_ROWS,
  type PlanComparisonCell,
} from "@/lib/plans/comparison";
import { cn } from "@/lib/utils";

const PLAN_COLUMNS = ["free", "premium", "elite"] as const;

function ComparisonCell({
  kind,
  rowId,
  plan,
}: {
  kind: PlanComparisonCell;
  rowId: string;
  plan: (typeof PLAN_COLUMNS)[number];
}) {
  const t = useTranslations("plans.comparison");

  if (kind === "yes") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-emerald-400">
        <Check className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">{t("included")}</span>
      </span>
    );
  }

  if (kind === "no") {
    return (
      <span className="inline-flex items-center justify-center text-muted/50">
        <Minus className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">{t("notIncluded")}</span>
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-foreground sm:text-sm">
      {t(`values.${rowId}.${plan}` as never)}
    </span>
  );
}

export function PlanComparisonTable() {
  const t = useTranslations("plans.comparison");

  return (
    <div className="min-w-0">
      <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
        {t("title")}
      </h3>
      <p className="mt-2 text-sm text-muted sm:text-base">{t("description")}</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70 glass">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th scope="col" className="px-4 py-3.5 font-medium text-muted sm:px-5">
                {t("featureColumn")}
              </th>
              {PLAN_COLUMNS.map((plan) => (
                <th
                  key={plan}
                  scope="col"
                  className={cn(
                    "px-3 py-3.5 text-center font-display text-xs font-bold uppercase tracking-wider sm:px-4 sm:text-sm",
                    plan === "premium" && "text-primary",
                    plan === "elite" && "text-amber-300",
                    plan === "free" && "text-muted",
                  )}
                >
                  {t(`plans.${plan}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON_ROWS.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/40 last:border-b-0",
                  index % 2 === 1 && "bg-muted/5",
                )}
              >
                <th
                  scope="row"
                  className="px-4 py-3.5 font-normal text-foreground sm:px-5 sm:py-4"
                >
                  {t(`features.${row.id}`)}
                </th>
                {PLAN_COLUMNS.map((plan) => (
                  <td key={plan} className="px-3 py-3.5 text-center sm:px-4 sm:py-4">
                    <ComparisonCell kind={row[plan]} rowId={row.id} plan={plan} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
