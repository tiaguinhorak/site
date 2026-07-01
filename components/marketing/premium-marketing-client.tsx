"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Premium } from "@/components/sections/premium";
import { SkeletonCard } from "@/components/ui/skeleton";

type Plan = ComponentProps<typeof Premium>["plans"][number];

export function PremiumMarketingClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/marketing/plans", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { plans: [] }))
      .then((json: { plans: Plan[] }) => setPlans(json.plans ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard className="h-[520px]" />;
  return <Premium embedded plans={plans} />;
}
