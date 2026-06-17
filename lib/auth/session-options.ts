import type { User } from "@/lib/generated/prisma/client";
import type { SessionOptions } from "@/lib/security/session";

export function sessionOptionsFromUser(user: User): SessionOptions {
  return {
    profileComplete: Boolean(user.email),
    isAdmin: user.isAdmin,
  };
}
