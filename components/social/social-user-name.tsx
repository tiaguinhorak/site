"use client";

import Link from "next/link";
import { ProfileDisplayName } from "@/components/profile/profile-display-name";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import { cn } from "@/lib/utils";

type SocialUser = {
  nickname: string;
  displayName: string;
  plan: string;
  customization?: PublicProfileCustomization | null;
};

type Props = {
  user: SocialUser;
  className?: string;
  nameClassName?: string;
  link?: boolean;
  badgeSize?: "sm" | "md" | "lg";
  showPlanBadge?: boolean;
};

/** Nome + badge de plano consistentes em amigos, chat, ranked e buscas. */
export function SocialUserName({
  user,
  className,
  nameClassName,
  link = false,
  badgeSize = "sm",
  showPlanBadge = false,
}: Props) {
  const plan = (user.plan === "premium" || user.plan === "elite" ? user.plan : "free") as
    | "free"
    | "premium"
    | "elite";

  const inner = (
    <ProfileDisplayName
      nickname={user.nickname}
      displayName={user.displayName}
      plan={plan}
      customization={user.customization}
      className={className}
      nameClassName={cn("font-display font-semibold text-foreground", nameClassName)}
      badgeSize={badgeSize}
      showPlanBadge={showPlanBadge}
    />
  );

  if (link) {
    return (
      <Link
        href={`/player/${user.nickname}`}
        prefetch={false}
        className="min-w-0 truncate hover:text-primary"
      >
        {inner}
      </Link>
    );
  }

  return <span className="min-w-0 truncate">{inner}</span>;
}
