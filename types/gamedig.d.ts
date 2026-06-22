declare module "gamedig" {
  export type GameDigQueryOptions = {
    type: string;
    host: string;
    port: number;
    maxAttempts?: number;
    socketTimeout?: number;
  };

  export type GameDigQueryResult = {
    name?: string;
    map?: string;
    numplayers?: number;
    maxplayers?: number;
    ping?: number;
    raw?: {
      numbots?: number;
      [key: string]: unknown;
    };
  };

  export class GameDig {
    static query(options: GameDigQueryOptions): Promise<GameDigQueryResult>;
  }
}
