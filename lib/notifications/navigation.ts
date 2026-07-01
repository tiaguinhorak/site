export type NotificationActionKind =
  | "ranked"
  | "lobby"
  | "profile"
  | "payment"
  | "store"
  | "cart"
  | "checkout"
  | "news"
  | "newsletter"
  | "settings"
  | "support"
  | "inventory"
  | "notifications"
  | "external";

export function parseNotificationParams(params: unknown): Record<string, string> {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (typeof value === "number") out[key] = String(value);
  }
  return out;
}

function safeInternalPath(path: string | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/** Resolve in-app navigation target for a notification click. */
export function resolveNotificationHref(
  type: string,
  params: Record<string, string> | null | undefined,
): string {
  const p = params ?? {};
  const explicit =
    safeInternalPath(p.href) ??
    safeInternalPath(p.actionHref) ??
    safeInternalPath(p.path);
  if (explicit) return explicit;

  const action = (p.action ?? p.actionKind ?? "").toLowerCase();

  switch (action) {
    case "ranked":
    case "match":
      return "/dashboard/ranked";
    case "lobby":
      return p.lobbyId ? `/dashboard/lobby/${p.lobbyId}` : "/dashboard/lobby";
    case "friends":
      return "/dashboard/amigos";
    case "profile":
      if (p.nickname) return `/player/${encodeURIComponent(p.nickname)}`;
      return "/dashboard/perfil";
    case "payment":
    case "premium":
      return "/dashboard/premium";
    case "store":
      return "/dashboard/loja";
    case "cart":
    case "checkout":
      return "/dashboard/loja?cart=1";
    case "news":
    case "newsletter":
      if (p.newsSlug) return `/dashboard/noticias/${encodeURIComponent(p.newsSlug)}`;
      return "/dashboard/noticias";
    case "settings":
      return "/dashboard/perfil?tab=notifications";
    case "support":
      return "/dashboard/suporte";
    case "inventory":
      return "/dashboard/inventario";
    case "notifications":
      return p.notificationId
        ? `/dashboard/notificacoes/${p.notificationId}`
        : "/dashboard/notificacoes";
    case "external":
      return "/dashboard/notificacoes";
    default:
      break;
  }

  switch (type.toLowerCase()) {
    case "match":
      return "/dashboard/ranked";
    case "social":
      if (p.href && safeInternalPath(p.href)) return p.href;
      if (p.action === "friends") return "/dashboard/amigos";
      if (p.nickname) return `/player/${encodeURIComponent(p.nickname)}`;
      return "/dashboard/amigos";
    case "promo":
      return "/dashboard/loja";
    case "system":
      return "/dashboard/notificacoes";
    default:
      return "/dashboard/notificacoes";
  }
}
