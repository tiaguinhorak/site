export type ServerConnectEligibility = "connect" | "login" | "link_steam";

export function getServerConnectEligibility(
  authenticated: boolean,
  steamLinked: boolean,
): ServerConnectEligibility {
  if (!authenticated) return "login";
  if (!steamLinked) return "link_steam";
  return "connect";
}

export function serverConnectHref(
  eligibility: ServerConnectEligibility,
  fromPath = "/servidores",
): string {
  switch (eligibility) {
    case "login":
      return `/login?from=${encodeURIComponent(fromPath)}`;
    case "link_steam":
      return "/api/auth/steam?mode=link";
    case "connect":
      return "/dashboard";
    default: {
      const _exhaustive: never = eligibility;
      return _exhaustive;
    }
  }
}
