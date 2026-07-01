import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { SESSION_COOKIE } from "@/lib/security/constants";
import { verifySessionToken } from "@/lib/security/session";
import type { User } from "@/lib/generated/prisma/client";

export async function getServerSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  return withPrismaRetry(() =>
    prisma.user.findUnique({ where: { id: session.userId } }),
  );
}

export async function getServerIsAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (session) return session.isAdmin === true;

  const user = await getServerSessionUser();
  return user?.isAdmin === true;
}
