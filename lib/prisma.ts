import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? "postgresql://luhanvini:8OZPFobNkQvlrRIR%27o%2FI@srv1500242.hstgr.cloud:5432/clutchclube?sslmode=require";
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
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
