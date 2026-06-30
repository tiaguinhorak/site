import "server-only";

import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function hashIp(ip: string): string {
  const salt = process.env.ANTI_SMURF_SALT ?? "clutchclube-smurf-salt";
  return hashValue(`${salt}:ip:${ip}`);
}

export function hashUserAgent(userAgent: string | null): string {
  const salt = process.env.ANTI_SMURF_SALT ?? "clutchclube-smurf-salt";
  return hashValue(`${salt}:ua:${userAgent ?? "unknown"}`);
}

export async function recordAccountFingerprint(
  userId: string,
  request: NextRequest,
): Promise<void> {
  const ipHash = hashIp(extractClientIp(request));
  const userAgentHash = hashUserAgent(request.headers.get("user-agent"));

  await prisma.accountFingerprint.upsert({
    where: {
      userId_ipHash_userAgentHash: { userId, ipHash, userAgentHash },
    },
    create: { userId, ipHash, userAgentHash },
    update: { lastSeenAt: new Date() },
  });
}
