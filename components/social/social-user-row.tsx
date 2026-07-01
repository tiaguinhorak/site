"use client";

import type { ReactNode } from "react";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { SocialUserName } from "@/components/social/social-user-name";
import {
  normalizeSocialUser,
  type SerializedSocialUser,
  type SocialUserView,
} from "@/lib/profile/social-user";
import { cn } from "@/lib/utils";

type Props = {
  user: SerializedSocialUser | SocialUserView;
  avatarSize?: "sm" | "md" | "lg";
  subtitle?: ReactNode;
  link?: boolean;
  showPlanBadge?: boolean;
  suffix?: string;
  className?: string;
  nameClassName?: string;
};

/** Avatar + nome público padronizados (Steam/nickname/plano) — igual em amigos, ranked e clãs. */
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
  const view = normalizeSocialUser(user);

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <UserProfileAvatar
        avatarUrl={view.avatarUrl}
        nickname={view.nickname}
        customization={view.customization}
        size={avatarSize}
      />
      <div className="min-w-0 flex-1">
        <SocialUserName
          user={view}
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
