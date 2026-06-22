import type ptBR from "@/messages/pt-BR.json";

export type RankedErrorKey = keyof typeof ptBR.rankedErrors;
export type LobbyErrorKey = keyof typeof ptBR.lobbyErrors;
export type PlayStateErrorKey = keyof typeof ptBR.playStateErrors;
export type RankedQueueErrorKey = keyof typeof ptBR.rankedQueueErrors;

type DomainNamespace =
  | "rankedErrors"
  | "lobbyErrors"
  | "playStateErrors"
  | "rankedQueueErrors";

export class DomainError extends Error {
  constructor(
    readonly namespace: DomainNamespace,
    readonly key: string,
    readonly status = 400,
    readonly params?: Record<string, string>,
  ) {
    super(key);
    this.name = "DomainError";
  }
}

export class RankedPartyError extends DomainError {
  constructor(
    key: RankedErrorKey,
    status = 400,
    params?: Record<string, string>,
  ) {
    super("rankedErrors", key, status, params);
    this.name = "RankedPartyError";
  }
}

export class LobbyRoomError extends DomainError {
  constructor(
    key: LobbyErrorKey,
    status = 400,
    params?: Record<string, string>,
  ) {
    super("lobbyErrors", key, status, params);
    this.name = "LobbyRoomError";
  }
}

export class PlayStateError extends DomainError {
  constructor(
    key: PlayStateErrorKey,
    status = 409,
    params?: Record<string, string>,
    readonly code?: "lobby" | "ranked_party" | "ranked_queue" | "ranked_match",
  ) {
    super("playStateErrors", key, status, params);
    this.name = "PlayStateError";
  }
}

export class RankedQueueError extends DomainError {
  constructor(
    key: RankedQueueErrorKey,
    status = 400,
    params?: Record<string, string>,
  ) {
    super("rankedQueueErrors", key, status, params);
    this.name = "RankedQueueError";
  }
}
