import { prisma } from "@/lib/prisma";

export type ServerGameConfigPayload = {
  pool: string;
  enabled: boolean;
  warmupSeconds: number;
  warmupStartMoney: number;
  warmupMaxMoney: number;
  warmupBuyAnywhere: boolean;
  randomSpawns: boolean;
  dmRespawn: boolean;
  gameType: number;
  gameMode: number;
};

export const DEFAULT_SERVER_GAME_CONFIG: Omit<ServerGameConfigPayload, "pool"> = {
  enabled: true,
  warmupSeconds: 60,
  warmupStartMoney: 16000,
  warmupMaxMoney: 16000,
  warmupBuyAnywhere: true,
  randomSpawns: true,
  dmRespawn: false,
  gameType: 0,
  gameMode: 1,
};

/** Resolve the effective config for a pool, falling back to defaults when unset. */
export async function resolveServerGameConfig(
  pool: string,
): Promise<ServerGameConfigPayload> {
  const row = await prisma.serverGameConfig.findUnique({ where: { pool } });
  if (!row) {
    return { pool, ...DEFAULT_SERVER_GAME_CONFIG };
  }
  return {
    pool: row.pool,
    enabled: row.enabled,
    warmupSeconds: row.warmupSeconds,
    warmupStartMoney: row.warmupStartMoney,
    warmupMaxMoney: row.warmupMaxMoney,
    warmupBuyAnywhere: row.warmupBuyAnywhere,
    randomSpawns: row.randomSpawns,
    dmRespawn: row.dmRespawn,
    gameType: row.gameType,
    gameMode: row.gameMode,
  };
}
