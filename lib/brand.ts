/** Nome oficial do site */
export const SITE_NAME = "clutchclube";

export const SITE_TAGLINE = "Rede de Servidores CS2 | Play Like a Pro";

export const SITE_ANTICHEAT = "clutchclube Anticheat";

export const API_REQUEST_HEADER = "x-clutchclube-request";

export function pageTitle(page: string) {
  return `${page} — ${SITE_NAME}`;
}
