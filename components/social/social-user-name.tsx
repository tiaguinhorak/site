"use client";

import Link from "next/link";
import { ProfileDisplayName } from "@/components/profile/profile-display-name";
import {
  normalizeSocialPlan,
  resolveSocialDisplayName,
  type SocialUserFields,
} from "@/lib/profile/social-user";
import { cn } from "@/lib/utils";

type Props = {
  user: SocialUserFields;
  className?: string;
  nameClassName?: string;
  link?: boolean;
  badgeSize?: "sm" | "md" | "lg";
  showPlanBadge?: boolean;
  /** Texto após o nome (ex.: " (você)"). */
  suffix?: string;
};

/** Nome + badge de plano consistentes em toda a plataforma. */
export function SocialUserName({
  user,
  className,
  nameClassName,
  link = false,
  badgeSize = "sm",
  showPlanBadge = false,
  suffix,
}: Props) {
  const displayName = resolveSocialDisplayName(user);
  const plan = normalizeSocialPlan(user.plan);

  const inner = (
    <ProfileDisplayName
      nickname={user.nickname}
      displayName={displayName}
      plan={plan}
      customization={user.customization}
      className={className}
      nameClassName={cn("font-display font-semibold text-foreground", nameClassName)}
      badgeSize={badgeSize}
      showPlanBadge={showPlanBadge}
    />
  );

  const content = suffix ? (
    <span className="inline-flex min-w-0 items-center gap-0 truncate">
      {inner}
      <span className="shrink-0 text-muted">{suffix}</span>
    </span>
  ) : (
    inner
  );

  if (link) {
    return (
      <Link
        href={`/player/${user.nickname}`}
        prefetch={false}
        className="min-w-0 truncate hover:text-primary"
      >
        {content}
      </Link>
    );
  }

  return <span className="min-w-0 truncate">{content}</span>;
}
