/**
 * XP / level curve. Pure functions (safe on client and server).
 *
 * The XP required to advance from level `n` to `n + 1` grows linearly:
 *   req(n) = XP_BASE + (n - 1) * XP_STEP
 *
 * This is separate from the ELO-derived "lobby level" used for matchmaking
 * gates (see lib/lobby/utils.ts) and never replaces it.
 */

export const XP_BASE = 1000;
export const XP_STEP = 450;
export const MAX_LEVEL = 100;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  const clamped = Math.max(1, Math.min(level, MAX_LEVEL));
  if (clamped >= MAX_LEVEL) return 0;
  return XP_BASE + (clamped - 1) * XP_STEP;
}

/** Total accumulated XP required to reach the start of `level`. */
export function totalXpForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(level, MAX_LEVEL));
  let total = 0;
  for (let n = 1; n < clamped; n += 1) {
    total += XP_BASE + (n - 1) * XP_STEP;
  }
  return total;
}

/** Resolve the level for a given amount of total XP. */
export function levelForXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < MAX_LEVEL && xp >= totalXpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export type LevelProgress = {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForLevel: number;
  xpToNext: number;
  progress: number;
  isMaxLevel: boolean;
};

/** Build a full progress snapshot for UI consumption. */
export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelForXp(xp);
  const isMaxLevel = level >= MAX_LEVEL;
  const floor = totalXpForLevel(level);
  const xpForLevel = xpToNextLevel(level);
  const xpIntoLevel = xp - floor;
  const xpToNext = isMaxLevel ? 0 : Math.max(0, xpForLevel - xpIntoLevel);
  const progress = isMaxLevel || xpForLevel === 0 ? 1 : Math.min(1, xpIntoLevel / xpForLevel);

  return {
    level,
    xp,
    xpIntoLevel,
    xpForLevel,
    xpToNext,
    progress,
    isMaxLevel,
  };
}
