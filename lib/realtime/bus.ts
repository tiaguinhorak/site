import "server-only";

import { EventEmitter } from "node:events";
import type { RealtimeChannel, RealtimeEvent, RealtimeInvalidateScope } from "@/lib/realtime/types";
import { channelKey } from "@/lib/realtime/types";

const bus = new EventEmitter();
bus.setMaxListeners(0);

export function subscribeRealtime(
  channels: string[],
  listener: (event: RealtimeEvent) => void,
): () => void {
  const wrapped = (event: RealtimeEvent) => listener(event);
  for (const ch of channels) {
    bus.on(ch, wrapped);
  }
  return () => {
    for (const ch of channels) {
      bus.off(ch, wrapped);
    }
  };
}

export function publishRealtime(channels: RealtimeChannel[], event: RealtimeEvent) {
  for (const channel of channels) {
    bus.emit(channelKey(channel), event);
  }
}

export function publishInvalidate(
  channels: RealtimeChannel[],
  scope: RealtimeInvalidateScope,
) {
  publishRealtime(channels, { type: "invalidate", scope, at: Date.now() });
}
