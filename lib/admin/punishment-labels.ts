import type { PunishmentType } from "@/lib/generated/prisma/client";

export function punishmentTypeLabel(type: PunishmentType): string {
  switch (type) {
    case "BAN":
      return "Banimento";
    case "MUTE":
      return "Silenciamento";
    case "WARNING":
      return "Advertência";
    case "KICK":
      return "Kick";
    case "RESTRICT":
      return "Restrição";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
