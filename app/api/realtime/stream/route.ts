import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { subscribeRealtime } from "@/lib/realtime/bus";
import { channelKey } from "@/lib/realtime/types";
import { markOffline, markOnline } from "@/lib/realtime/presence";
import { broadcastPresence } from "@/lib/realtime/notify";
import { requireSession } from "@/lib/security/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  const userId = session!.userId;
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });

  const channelKeys = [
    channelKey({ kind: "user", userId }),
    channelKey({ kind: "ranked_rooms" }),
    channelKey({ kind: "lobby_rooms" }),
  ];

  if (membership) {
    channelKeys.push(channelKey({ kind: "party", partyId: membership.partyId }));
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* stream closed */
        }
      };

      send({ type: "connected", at: Date.now() });

      if (markOnline(userId)) {
        void broadcastPresence(userId, true);
      }

      const unsubscribe = subscribeRealtime(channelKeys, (event) => send(event));

      const heartbeat = setInterval(() => {
        send({ type: "ping", at: Date.now() });
      }, HEARTBEAT_MS);

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        if (markOffline(userId)) {
          void broadcastPresence(userId, false);
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
