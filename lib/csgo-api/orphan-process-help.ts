import "server-only";

export function orphanCsgoProcessHelp(port: number, screenSession?: string): string {
  const sessionHint = screenSession
    ? ` A API espera o screen "${screenSession}", mas outro processo pode estar na porta.`
    : "";

  return (
    `Há um processo CS:GO ainda respondendo na porta ${port}.${sessionHint} ` +
    `Na VPS (SSH): (1) sudo -u csgo screen -ls — (2) sudo -u csgo screen -S <pid>.${screenSession ?? "csgo-*"} -X quit — ` +
    `(3) se persistir: sudo fuser -k ${port}/udp e ${port}/tcp — (4) confira: ss -ulnp | grep ${port}`
  );
}
