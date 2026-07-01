"use client";

import type { ReactNode } from "react";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { SocialUserName } from "@/components/social/social-user-name";
import type { SocialUserFields } from "@/lib/profile/social-user";
import { cn } from "@/lib/utils";

type Props = {
  user: SocialUserFields & { avatarUrl: string | null };
  avatarSize?: "sm" | "md" | "lg";
  subtitle?: ReactNode;
  link?: boolean;
  showPlanBadge?: boolean;
  suffix?: string;
  className?: string;
  nameClassName?: string;
};

/** Avatar + nome público padronizados (Steam/nickname/plano). */
export function SocialUserRow({
  user,
  avatarSize = "sm",
  subtitle,
  link = false,
  showPlanBadge = false,
  suffix,
  className,
  nameClassName,
}: Props) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <UserProfileAvatar
        avatarUrl={user.avatarUrl}
        nickname={user.nickname}
        customization={user.customization}
        size={avatarSize}
      />
      <div className="min-w-0 flex-1">
        <SocialUserName
          user={user}
          link={link}
          showPlanBadge={showPlanBadge}
          suffix={suffix}
          nameClassName={nameClassName}
        />
        {subtitle ? <div className="mt-0.5">{subtitle}</div> : null}
      </div>
    </div>
  );
}
