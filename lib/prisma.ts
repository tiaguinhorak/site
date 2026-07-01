import "server-only";

import { statSync } from "node:fs";
import { join } from "node:path";
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
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 20_000),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    maxUses: 5_000,
    allowExitOnIdle: false,
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: pg.Pool | undefined;
  prismaClientMtimeMs: number | undefined;
  prismaPoolKey: string | undefined;
};

function getOrCreatePool(connectionString: string): pg.Pool {
  const poolKey = sanitizeDatabaseUrl(connectionString);

  if (globalForPrisma.prismaPool && globalForPrisma.prismaPoolKey === poolKey) {
    return globalForPrisma.prismaPool;
  }

  const pool = new pg.Pool(getPoolConfig(connectionString));
  pool.on("error", (error) => {
    console.error("[prisma:pool]", error.message);
  });
  pool.on("connect", (client) => {
    void client.query("SET statement_timeout = 30000").catch(() => undefined);
  });

  globalForPrisma.prismaPool = pool;
  globalForPrisma.prismaPoolKey = poolKey;
  return pool;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const pool = getOrCreatePool(connectionString);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function generatedClientMtimeMs(): number {
  try {
    return statSync(join(process.cwd(), "lib/generated/prisma/internal/class.ts")).mtimeMs;
  } catch {
    return 0;
  }
}

function resolvePrismaClient(): PrismaClient {
  const clientMtime = generatedClientMtimeMs();
  const existing = globalForPrisma.prisma;

  if (
    existing &&
    globalForPrisma.prismaClientMtimeMs === clientMtime &&
    "userAchievement" in existing
  ) {
    return existing;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaClientMtimeMs = clientMtime;
  return client;
}

export const prisma = resolvePrismaClient();
