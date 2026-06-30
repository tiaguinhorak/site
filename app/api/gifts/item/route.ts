import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import { giftStoreItem, resolveRecipient, GiftError } from "@/lib/gifts/service";

const schema = z.object({
  recipient: z.discriminatedUnion("type", [
    z.object({ type: z.literal("user"), value: z.string().min(1) }),
    z.object({ type: z.literal("steam"), value: z.string().min(1) }),
  ]),
  storeItemId: z.string().min(1),
  currency: z.enum(["brl", "coins"]).default("coins"),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "gift-item",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const recipient = await resolveRecipient(parsed.data.recipient, userId);
    await giftStoreItem(userId, recipient, parsed.data.storeItemId, parsed.data.currency);
    return NextResponse.json({ ok: true, recipient: recipient.nickname });
  } catch (err) {
    if (err instanceof GiftError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao enviar presente." }, { status: 500 });
  }
}
