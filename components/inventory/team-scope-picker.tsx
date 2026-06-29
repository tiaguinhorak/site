"use client";

import { cn } from "@/lib/utils";
import { chipInactiveHoverClass, teamPillClass } from "@/lib/ui/theme-surfaces";

export type TeamScope = "T" | "CT" | "both";

type TeamScopePickerProps = {
  value: TeamScope;
  onChange: (scope: TeamScope) => void;
  canT?: boolean;
  canCT?: boolean;
  canBoth?: boolean;
  label?: string;
  hintBoth?: string;
  labels: {
    t: string;
    ct: string;
    both: string;
  };
  size?: "sm" | "md";
};

export function TeamScopePicker({
  value,
  onChange,
  canT = true,
  canCT = true,
  canBoth = true,
  label,
  hintBoth,
  labels,
  size = "md",
}: TeamScopePickerProps) {
  const showBoth = canBoth && canT && canCT;
  const pad = size === "sm" ? "py-2 text-xs" : "py-2.5 text-sm";

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </p>
      ) : null}
      <div
        className={cn(
          "grid gap-1.5 rounded-xl border border-border/40 p-1 glass",
          showBoth ? "grid-cols-3" : "grid-cols-2",
        )}
        role="group"
        aria-label={label}
      >
        {canCT && (
          <button
            type="button"
            onClick={() => onChange("CT")}
            className={cn(
              "rounded-lg font-semibold transition-all",
              pad,
              value === "CT"
                ? teamPillClass("CT", true)
                : cn(chipInactiveHoverClass, "text-muted"),
            )}
            aria-pressed={value === "CT"}
          >
            {labels.ct}
          </button>
        )}
        {canT && (
          <button
            type="button"
            onClick={() => onChange("T")}
            className={cn(
              "rounded-lg font-semibold transition-all",
              pad,
              value === "T"
                ? teamPillClass("T", true)
                : cn(chipInactiveHoverClass, "text-muted"),
            )}
            aria-pressed={value === "T"}
          >
            {labels.t}
          </button>
        )}
        {showBoth && (
          <button
            type="button"
            onClick={() => onChange("both")}
            className={cn(
              "rounded-lg font-semibold transition-all",
              pad,
              value === "both"
                ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-sm"
                : cn(chipInactiveHoverClass, "text-muted"),
            )}
            aria-pressed={value === "both"}
          >
            {labels.both}
          </button>
        )}
      </div>
      {value === "both" && hintBoth ? (
        <p className="text-[11px] leading-snug text-muted">{hintBoth}</p>
      ) : null}
    </div>
  );
}
