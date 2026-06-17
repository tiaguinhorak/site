import type { UserProfile } from "@/lib/serializers";

export type AuthSessionUser = Pick<
  UserProfile,
  "nickname" | "steamLinked" | "avatarUrl" | "steamAvatarUrl" | "plan"
>;
