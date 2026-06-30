import type { Plan } from "@/lib/generated/prisma/client";

export function canCustomizeProfile(plan: Plan | string): boolean {
  return plan === "ELITE" || plan === "elite";
}

export function profileCustomizationRequiredPlanLabel(): string {
  return "Elite";
}
