import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/security/constants";
import { verifySessionToken } from "@/lib/security/session";
import type { User } from "@/lib/generated/prisma/client";

export async function getServerSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function getServerIsAdmin(): Promise<boolean> {
  const user = await getServerSessionUser();
  return user?.isAdmin === true;
}
