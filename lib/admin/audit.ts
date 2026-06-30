import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_STEAM_UNLINK"
  | "PUNISHMENT_CREATE"
  | "PUNISHMENT_REVOKE"
  | "NOTIFICATION_SEND"
  | "NOTIFICATION_BROADCAST"
  | "SERVER_CREATE"
  | "SERVER_UPDATE"
  | "SERVER_DELETE"
  | "NEWS_CREATE"
  | "NEWS_UPDATE"
  | "NEWS_DELETE"
  | "STORE_CREATE"
  | "STORE_UPDATE"
  | "STORE_DELETE"
  | "GAME_MODE_CREATE"
  | "GAME_MODE_UPDATE"
  | "GAME_MODE_DELETE"
  | "GAME_MODE_ROOM_CREATE"
  | "GAME_MODE_ROOM_UPDATE"
  | "GAME_MODE_ROOM_DELETE"
  | "MEDIA_UPLOAD"
  | "RANKED_QUEUE_RESTRICT"
  | "RANKED_QUEUE_CLEAR"
  | "CSGO_SERVER_REGISTER"
  | "CSGO_SERVER_START"
  | "CSGO_SERVER_STOP"
  | "CSGO_SERVER_CHANGE_MAP"
  | "CSGO_SERVER_DELETE"
  | "CSGO_MATCH_CANCEL"
  | "CSGO_MATCH_END"
  | "RANKED_SIMULATE"
  | "RANKED_STALE_CLEANUP"
  | "RANKED_SESSION_CANCEL"
  | "RANKED_SESSION_FINISH"
  | "CATALOG_SKIN_CREATE"
  | "CATALOG_SKIN_UPDATE"
  | "CATALOG_SKIN_DELETE"
  | "CATALOG_SKIN_IMPORT_WEAPON"
  | "INVENTORY_GRANT"
  | "INVENTORY_REVOKE"
  | "STICKER_CATALOG_CREATE"
  | "STICKER_CATALOG_UPDATE"
  | "STICKER_CATALOG_DELETE"
  | "STICKER_CATALOG_IMPORT_ALL"
  | "AGENT_CATALOG_CREATE"
  | "AGENT_CATALOG_ENABLE"
  | "AGENT_CATALOG_DISABLE"
  | "AGENT_CATALOG_DELETE"
  | "AGENT_CATALOG_IMPORT_ALL"
  | "AVATAR_APPROVE"
  | "AVATAR_REJECT"
  | "BANNER_APPROVE"
  | "BANNER_REJECT"
  | "SMURF_STATUS_UPDATE";

export async function logAdminAction(params: {
  adminId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      summary: params.summary,
      metadata: JSON.stringify(params.metadata ?? {}),
    },
  });
}
