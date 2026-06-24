export type CsgoGameServer = {
  id: string;
  name: string;
  host: string;
  port: number;
  status: "online" | "offline" | "busy";
  tickrate: number;
  screenSession?: string;
  rconPort?: number;
  csgoDir?: string;
  currentMatchId?: string;
  pool?: "ranked" | "warmup" | "public";
};

export type CsgoMatchSummary = {
  id: string;
  roomId?: string;
  serverId?: string;
  selectedMap?: string;
  status: string;
};
