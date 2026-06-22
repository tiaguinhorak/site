import type { RealtimeInvalidateScope } from "@/lib/realtime/types";
import type { RankedRefreshTier } from "@/lib/ranked/polling";

export function invalidateScopeToRefreshTier(
  scope: RealtimeInvalidateScope,
): RankedRefreshTier {
  switch (scope) {
    case "session":
      return "session";
    case "party":
    case "chat":
    case "activity":
      return "party";
    case "rooms":
      return "rooms";
    case "full":
      return "full";
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}
