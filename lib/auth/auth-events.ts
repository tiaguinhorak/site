/** Dispatched after login/register/logout so client session state can refresh. */
export const AUTH_SESSION_CHANGED_EVENT = "clutch:auth-session-changed";

export function notifyAuthSessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}
