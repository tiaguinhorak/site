"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  RANKED_FLOW_STEPS,
  type RankedFlowStep,
} from "@/lib/ranked/match-flow";
import { cn } from "@/lib/utils";

type Props = {
  current: RankedFlowStep;
  className?: string;
};

function stepIndex(step: RankedFlowStep): number {
  if (step === "idle") return -1;
  return RANKED_FLOW_STEPS.indexOf(step);
}

export function RankedFlowStepper({ current, className }: Props) {
  const t = useTranslations("ranked.flow.steps");

  if (current === "idle") return null;

  const activeIdx = stepIndex(current);

  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1 sm:gap-2",
        className,
      )}
      aria-label="Match flow"
    >
      {RANKED_FLOW_STEPS.map((step, idx) => {
        const done = activeIdx > idx;
        const active = activeIdx === idx;
        return (
          <li key={step} className="flex items-center gap-1 sm:gap-2">
            {idx > 0 && (
              <span
                className={cn(
                  "hidden h-px w-3 sm:block sm:w-5",
                  done ? "bg-emerald-400/60" : "bg-border",
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-[11px]",
                active
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                  : done
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] text-muted",
              )}
            >
              {done ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                    active ? "bg-primary text-primary-foreground" : "bg-border text-muted",
                  )}
                >
                  {idx + 1}
                </span>
              )}
              {t(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
