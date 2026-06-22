import type { Plan } from "@/lib/generated/prisma/client";

/** Maior = prioridade na última vaga (Elite > Premium > Free). */
export function planPriorityWeight(plan: Plan | string): number {
  const normalized = String(plan).toUpperCase();
  if (normalized === "ELITE") return 2;
  if (normalized === "PREMIUM") return 1;
  return 0;
}

export function planPriorityLabel(plan: Plan | string): string {
  const weight = planPriorityWeight(plan);
  if (weight >= 2) return "Elite";
  if (weight >= 1) return "Premium";
  return "Free";
}
