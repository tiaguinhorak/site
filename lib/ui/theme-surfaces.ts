import { cn } from "@/lib/utils";

export type LoadoutTeam = "T" | "CT";

/** Subtle card row (loadout items, sticker slots). */
export const surfaceSubtleClass =
  "bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] ring-1 ring-border dark:bg-black/20 dark:ring-white/5";

/** Text field styled for dashboard panels. */
export const surfaceInputClass =
  "border border-border bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] text-foreground placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-black/25";

/** Hover for inactive filter/chip buttons. */
export const chipInactiveHoverClass =
  "text-muted hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] hover:text-foreground dark:hover:bg-white/5";

export function teamPillClass(team: LoadoutTeam, active: boolean): string {
  if (!active) return chipInactiveHoverClass;
  if (team === "T") {
    return "bg-amber-100 text-amber-950 ring-1 ring-amber-600/45 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/40";
  }
  return "bg-sky-100 text-sky-950 ring-1 ring-sky-600/45 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/40";
}

export function teamLabelClass(team: LoadoutTeam): string {
  return team === "T"
    ? "text-amber-800 dark:text-amber-300"
    : "text-sky-800 dark:text-sky-300";
}

export const textWarningClass = "text-amber-800 dark:text-amber-200";
export const textWarningSoftClass = "text-amber-700 dark:text-amber-300";
export const textWarningPanelClass =
  "border-amber-600/25 bg-amber-100/80 text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100";

export function cnSurface(...parts: string[]) {
  return cn(...parts);
}
