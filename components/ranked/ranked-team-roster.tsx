"use client";

import { useTranslations } from "next-intl";
import type { RankedPartyMemberView } from "@/lib/ranked/party-shared";
import { SocialUserRow } from "@/components/social/social-user-row";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  members: RankedPartyMemberView[];
  accent?: "violet" | "cyan" | "neutral";
  compact?: boolean;
};

const ACCENT_BORDER = {
  violet: "border-violet-400/35 bg-violet-500/8",
  cyan: "border-cyan-400/35 bg-cyan-500/8",
  neutral: "border-border/60 bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]",
} as const;

export function RankedTeamRoster({
  title,
  members,
  accent = "neutral",
  compact = false,
}: Props) {
  const t = useTranslations("ranked.match");

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4", ACCENT_BORDER[accent])}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className={cn("space-y-2", compact && "space-y-1.5")}>
        {members.map((member) => (
          <li key={member.id}>
            <SocialUserRow
              user={member}
              avatarSize={compact ? "sm" : "md"}
              suffix={member.isYou ? ` ${t("you")}` : undefined}
              subtitle={<p className="text-xs text-muted">{member.elo} ELO</p>}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
