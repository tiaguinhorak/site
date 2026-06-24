import "server-only";

import { prisma } from "@/lib/prisma";

export async function notifyCatalogImportResult(
  userId: string,
  type: "stickers" | "skins",
  ok: boolean,
  detail: string,
) {
  const title = ok
    ? type === "stickers"
      ? "Importação de stickers concluída"
      : "Importação de skins concluída"
    : type === "stickers"
      ? "Falha na importação de stickers"
      : "Falha na importação de skins";

  await prisma.notification.create({
    data: {
      userId,
      title,
      body: detail,
      type: "SYSTEM",
    },
  });
}
