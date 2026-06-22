import "server-only";

import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DEFAULT_DATABASE_URL =
  "postgresql://luhanvini:8OZPFobNkQvlrRIR%27o%2FI@srv1500242.hstgr.cloud:5432/clutchclube";

/** pg v8 treats sslmode=require as verify-full; strip it and set SSL on the pool. */
function sanitizeDatabaseUrl(connectionString: string): string {
  const questionIndex = connectionString.indexOf("?");
  if (questionIndex === -1) return connectionString;

  const base = connectionString.slice(0, questionIndex);
  const params = new URLSearchParams(connectionString.slice(questionIndex + 1));
  params.delete("sslmode");
  params.delete("uselibpqcompat");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function getPoolConfig(connectionString: string): pg.PoolConfig {
  const sanitized = sanitizeDatabaseUrl(connectionString);
  const isLocal =
    /@(localhost|127\.0\.0\.1)([:/]|$)/.test(sanitized) ||
    sanitized.includes("host=localhost");

  return {
    connectionString: sanitized,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const pool = new pg.Pool(getPoolConfig(connectionString));
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
