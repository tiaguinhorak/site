import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

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

export function createScriptPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  const pool = new pg.Pool(getPoolConfig(connectionString));
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
