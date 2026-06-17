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
  | "MEDIA_UPLOAD";

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
