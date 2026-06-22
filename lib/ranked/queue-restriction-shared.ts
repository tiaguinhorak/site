/** Minutos de restrição a partir da 2ª ocorrência (1ª = só aviso). */
export const RANKED_QUEUE_BAN_MINUTES = [5, 15, 30, 60, 120, 240, 480] as const;

/** Primeiro cancelamento não puni — apenas aviso. */
export const RANKED_FREE_DODGE_COUNT = 1;

/** Cada 24h sem cancelar reduz 1 strike acumulado. */
export const RANKED_DODGE_DECAY_HOURS = 24;

export const RANKED_QUEUE_SERVER_NAME = "ranked_queue";

export type RankedQueueLastEvent = "none" | "warning" | "restricted";

export type RankedQueueRestrictionView = {
  restricted: boolean;
  restrictedUntil: string | null;
  remainingMs: number;
  dodges: number;
  banMinutes: number;
  nextBanMinutes: number | null;
  message: string;
  lastEvent: RankedQueueLastEvent;
};

type UserDodgeFields = {
  rankedQueueDodges: number;
  rankedRestrictedUntil: Date | null;
  rankedLastDodgeAt: Date | null;
};

export function getEffectiveRankedDodges(user: UserDodgeFields): number {
  if (user.rankedQueueDodges <= 0 || !user.rankedLastDodgeAt) {
    return 0;
  }

  const hoursSince =
    (Date.now() - user.rankedLastDodgeAt.getTime()) / (1000 * 60 * 60);
  const decaySteps = Math.floor(hoursSince / RANKED_DODGE_DECAY_HOURS);
  return Math.max(0, user.rankedQueueDodges - decaySteps);
}

/** Minutos de ban para a N-ésima ocorrência (2ª ocorrência = index 0 = 5 min). */
export function getRankedBanMinutesForDodgeCount(dodgeCount: number): number {
  if (dodgeCount < 2) return RANKED_QUEUE_BAN_MINUTES[0];
  const index = Math.min(
    dodgeCount - 2,
    RANKED_QUEUE_BAN_MINUTES.length - 1,
  );
  return RANKED_QUEUE_BAN_MINUTES[index]!;
}

export function getNextBanMinutes(currentDodges: number): number | null {
  const next = currentDodges + 1;
  if (next <= RANKED_FREE_DODGE_COUNT) return null;
  return getRankedBanMinutesForDodgeCount(next);
}

export function formatRestrictionDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  }
  if (minutes > 0) {
    return `${minutes}min ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export function buildRestrictionView(
  user: UserDodgeFields,
  lastEvent: RankedQueueLastEvent = "none",
): RankedQueueRestrictionView {
  const dodges = getEffectiveRankedDodges(user);
  const now = Date.now();
  const until = user.rankedRestrictedUntil;
  const restricted = Boolean(until && until.getTime() > now);
  const remainingMs = restricted ? until!.getTime() - now : 0;
  const nextBanMinutes = getNextBanMinutes(dodges);

  let message = "Você pode entrar na fila ranqueada.";
  if (restricted) {
    message = `Restrito da fila ranqueada. Aguarde ${formatRestrictionDuration(remainingMs)} para jogar novamente.`;
  } else if (dodges === 1) {
    message =
      "1º cancelamento registrado — sem punição desta vez. Na próxima falha, restrição de 5 min na fila.";
  } else if (dodges > 1 && nextBanMinutes !== null) {
    message = `${dodges} cancelamento(s) recente(s). Próxima falha: ${nextBanMinutes} min de restrição.`;
  }

  if (lastEvent === "warning") {
    message =
      "Você não confirmou a partida. Desta vez foi só um aviso — na próxima, restrição de 5 min na fila rankeada.";
  }

  const banMinutes = restricted
    ? Math.max(1, Math.ceil(remainingMs / (1000 * 60)))
    : nextBanMinutes ?? RANKED_QUEUE_BAN_MINUTES[0];

  return {
    restricted,
    restrictedUntil: until?.toISOString() ?? null,
    remainingMs,
    dodges,
    banMinutes,
    nextBanMinutes,
    message,
    lastEvent,
  };
}
