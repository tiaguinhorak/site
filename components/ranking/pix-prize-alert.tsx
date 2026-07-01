"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PixIcon } from "@/components/ui/pix-icon";
import { secureApi } from "@/lib/api/client";
import type { UserPendingPixPrize } from "@/lib/ranked/pix-prize";
import { PIX_PAYOUT_STATUS_LABEL } from "@/lib/ranked/pix-prize";

export function PixPrizeAlert() {
  const [prizes, setPrizes] = useState<UserPendingPixPrize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    secureApi<{ prizes: UserPendingPixPrize[] }>("/api/ranked/pix-prizes")
      .then((result) => {
        if (result.ok) setPrizes(result.data.prizes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  const actionable = prizes.filter(
    (prize) => prize.needsPixKey || (prize.status !== "PAID" && prize.status !== "CANCELLED"),
  );
  if (actionable.length === 0) return null;

  const needsKey = actionable.some((prize) => prize.needsPixKey);

  return (
    <section className="rounded-xl border border-[color-mix(in_srgb,#32BCAD_30%,transparent)] bg-[color-mix(in_srgb,#32BCAD_8%,transparent)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <PixIcon size={22} />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-display text-base font-bold text-foreground">Prêmio Pix da temporada</p>
            {needsKey ? (
              <p className="mt-1 text-sm text-amber-200/90">
                Você ganhou prêmio em Pix! Cadastre sua chave no perfil para recebermos o pagamento.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Seu prêmio está em processamento. Nossa equipe entrará em contato se necessário.
              </p>
            )}
          </div>

          <ul className="space-y-2 text-sm">
            {actionable.map((prize) => (
              <li
                key={prize.grantId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-black/15 px-3 py-2"
              >
                <span>
                  {prize.seasonName} · {prize.position}º lugar · {prize.pixAmountLabel}
                </span>
                <span className="text-xs text-muted">{PIX_PAYOUT_STATUS_LABEL[prize.status]}</span>
              </li>
            ))}
          </ul>

          {needsKey ? (
            <Link
              href="/dashboard/perfil?tab=general"
              className="inline-flex text-sm font-semibold text-[#32BCAD] hover:underline"
            >
              Cadastrar chave Pix no perfil →
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
