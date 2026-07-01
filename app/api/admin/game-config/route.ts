import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { DEFAULT_SERVER_GAME_CONFIG } from "@/lib/csgo/server-game-config";
import { withPrismaRetry } from "@/lib/prisma-retry";

const KNOWN_POOLS = ["ranked", "warmup", "deathmatch", "public"] as const;

const upsertSchema = z.object({
  pool: z.string().min(1).max(32),
  enabled: z.boolean(),
  warmupSeconds: z.number().int().min(0).max(600),
  warmupStartMoney: z.number().int().min(0).max(65535),
  warmupMaxMoney: z.number().int().min(0).max(65535),
  warmupBuyAnywhere: z.boolean(),
  randomSpawns: z.boolean(),
  dmRespawn: z.boolean(),
  gameType: z.number().int().min(0).max(4),
  gameMode: z.number().int().min(0).max(4),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const rows = await withPrismaRetry(() =>
    prisma.serverGameConfig.findMany({
      orderBy: { pool: "asc" },
    }),
  );
  const byPool = new Map(rows.map((r) => [r.pool, r]));

  const configs = KNOWN_POOLS.map((pool) => {
    const row = byPool.get(pool);
    return row ?? { pool, ...DEFAULT_SERVER_GAME_CONFIG };
  });

  // Include any custom pools not in the known list.
  for (const row of rows) {
    if (!KNOWN_POOLS.includes(row.pool as (typeof KNOWN_POOLS)[number])) {
      configs.push(row);
    }
  }

  return NextResponse.json({ configs });
}

export async function PUT(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-game-config",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = upsertSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { pool, ...values } = parsed.data;
  const config = await withPrismaRetry(() =>
    prisma.serverGameConfig.upsert({
      where: { pool },
      create: { pool, ...values },
      update: values,
    }),
  );

  await logAdminAction({
    adminId: admin!.id,
    action: "GAME_CONFIG_UPDATE",
    targetType: "server_game_config",
    targetId: config.id,
    summary: `Atualizou regras de jogo do pool ${pool}`,
  });

  return NextResponse.json({ ok: true, config });
}
