import path from "node:path";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (url.startsWith("file:")) {
    const filePath = url.replace(/^file:/, "");
    if (!path.isAbsolute(filePath)) {
      // turbopackIgnore: database path resolved at runtime
      return `file:${path.join(process.cwd(), filePath)}`;
    }
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
