"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SteamRequiredCard } from "@/components/dashboard/steam-required-card";
import { RankedHubLayout } from "@/components/dashboard/ranked-hub-layout";
import { RankedCreateTeamModal } from "@/components/dashboard/ranked-create-team-modal";
import { RankedJoinPasswordModal } from "@/components/dashboard/ranked-join-password-modal";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import { useUser } from "@/lib/hooks/use-user";
import type { RankedPartyView } from "@/lib/ranked/party-shared";

export function RankedExperience() {
  const { user, loading: userLoading } = useUser();
  const { party, loading, eligibility, createTeam, updateTeam, joinRoom } = useRankedParty();
  const t = useTranslations("ranked");

  const [teamModal, setTeamModal] = useState<{ open: boolean; mode: "create" | "edit" }>({
    open: false,
    mode: "create",
  });
  const [passwordModal, setPasswordModal] = useState<RankedPartyView | null>(null);

  if (userLoading || loading) {
    return (
      <div className="rounded-card glass p-8 text-center text-muted">
        <Loader2 className="mx-auto h-6 w-6 motion-safe-spin" />
        <p className="mt-3">{t("loading")}</p>
      </div>
    );
  }

  const canPlay = eligibility?.canPlay ?? false;
  const showSteamCard = Boolean(party) && !user?.steamLinked;

  if (showSteamCard) {
    return (
      <SteamRequiredCard
        title={t("experience.steamTitle")}
        description={t("experience.steamDesc")}
      />
    );
  }

  return (
    <>
      <RankedHubLayout
        party={party}
        onEditTeam={() => setTeamModal({ open: true, mode: "edit" })}
        onCreateTeam={
          canPlay ? () => setTeamModal({ open: true, mode: "create" }) : undefined
        }
        onJoinPrivate={(room) => setPasswordModal(room)}
      />

      <RankedCreateTeamModal
        open={teamModal.open}
        mode={teamModal.mode}
        team={party}
        onClose={() => setTeamModal((s) => ({ ...s, open: false }))}
        onSubmit={(config) =>
          teamModal.mode === "create" ? createTeam(config) : updateTeam(config)
        }
      />

      <RankedJoinPasswordModal
        open={Boolean(passwordModal)}
        teamName={passwordModal?.name}
        onClose={() => setPasswordModal(null)}
        onConfirm={async (password) => {
          if (!passwordModal) return false;
          return joinRoom(passwordModal.id, password);
        }}
      />
    </>
  );
}
