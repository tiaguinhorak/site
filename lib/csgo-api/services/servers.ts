import { prisma } from "@/lib/prisma";
import { CsgoApiError, assertFound } from "@/lib/csgo-api/http";
import { serializeServer } from "@/lib/csgo-api/serializers";
import type { z } from "zod";
import type { createServerSchema, serverStartSchema } from "@/lib/csgo-api/schemas";
import {
  forceKillCsgoPort,
  isManagedLocally,
  isScreenRunning,
  slugifySessionName,
  startCsgoServer,
  stopCsgoServer,
} from "@/lib/csgo-api/server-manager";
import { sendRconCommand, testRconConnection } from "@/lib/csgo-api/rcon";
import { refreshCsgoServerLive } from "@/lib/csgo-api/query-live-server";

type CreateServerInput = z.infer<typeof createServerSchema>;
type StartInput = z.infer<typeof serverStartSchema>;

export async function listServers(status?: string) {
  const servers = await prisma.csgoServer.findMany({
    where: status ? { status } : undefined,
    orderBy: { name: "asc" },
  });
  return servers.map(serializeServer);
}

export async function getServer(id: string) {
  const server = await prisma.csgoServer.findUnique({ where: { id } });
  return serializeServer(assertFound(server, "Servidor"));
}

export async function createServer(input: CreateServerInput) {
  const sessionSlug = slugifySessionName(input.name);
  const server = await prisma.csgoServer.create({
    data: {
      name: input.name,
      host: input.host,
      sshPort: 22,
      sshUser: input.sshUser ?? null,
      sshPassword: input.sshPassword ?? null,
      rconPort: input.rconPort,
      rconPassword: input.rconPassword,
      csgoDir: input.csgoDir,
      screenSession: `csgo-${sessionSlug}`,
      status: "offline",
      port: input.port,
      tickrate: input.tickrate,
    },
  });
  return serializeServer(server);
}

export async function deleteServer(id: string) {
  const server = assertFound(await prisma.csgoServer.findUnique({ where: { id } }), "Servidor");
  if (server.status === "busy") {
    throw new CsgoApiError("Servidor em uso por uma partida.");
  }
  await prisma.csgoServer.delete({ where: { id } });
  return { ok: true };
}

export async function startServer(id: string, input: StartInput = {}) {
  const server = assertFound(await prisma.csgoServer.findUnique({ where: { id } }), "Servidor");
  await stopCsgoServer(server);

  const live = await refreshCsgoServerLive(server.host, server.port);
  if (live.online && isManagedLocally(server.host)) {
    await forceKillCsgoPort(server);
  }

  await startCsgoServer(server, input);
  const updated = await prisma.csgoServer.update({
    where: { id },
    data: { status: "online" },
  });
  return serializeServer(updated);
}

export async function stopServer(id: string) {
  const server = assertFound(await prisma.csgoServer.findUnique({ where: { id } }), "Servidor");
  await stopCsgoServer(server);

  const live = await refreshCsgoServerLive(server.host, server.port);
  if (live.online && isManagedLocally(server.host)) {
    await forceKillCsgoPort(server);
    await refreshCsgoServerLive(server.host, server.port);
  }

  const updated = await prisma.csgoServer.update({
    where: { id },
    data: { status: "offline" },
  });
  return serializeServer(updated);
}

export async function restartServer(id: string, input: StartInput = {}) {
  const server = assertFound(await prisma.csgoServer.findUnique({ where: { id } }), "Servidor");
  await stopCsgoServer(server);

  const live = await refreshCsgoServerLive(server.host, server.port);
  if (live.online && isManagedLocally(server.host)) {
    await forceKillCsgoPort(server);
  }

  await startCsgoServer(server, input);
  const updated = await prisma.csgoServer.update({
    where: { id },
    data: { status: server.status === "busy" ? "busy" : "online" },
  });
  return serializeServer(updated);
}

export async function getServerStatus(id: string) {
  const server = assertFound(await prisma.csgoServer.findUnique({ where: { id } }), "Servidor");
  const processRunning = await isScreenRunning(server);
  const rconOk = processRunning ? await testRconConnection(server) : false;

  let status = server.status;
  if (processRunning && server.status === "offline") {
    status = "online";
    await prisma.csgoServer.update({ where: { id }, data: { status: "online" } });
  } else if (!processRunning && server.status === "online") {
    status = "offline";
    await prisma.csgoServer.update({ where: { id }, data: { status: "offline" } });
  }

  return {
    id: server.id,
    status,
    processRunning,
    rconConnected: rconOk,
  };
}

export async function sendServerRcon(id: string, command: string) {
  const server = assertFound(await prisma.csgoServer.findUnique({ where: { id } }), "Servidor");
  const result = await sendRconCommand(server, command);
  return { result };
}

export async function pickAvailableServer(preferredId?: string) {
  if (preferredId) {
    const server = await prisma.csgoServer.findUnique({ where: { id: preferredId } });
    if (!server) throw new CsgoApiError("Servidor não encontrado.", 404);
    if (server.status === "busy") throw new CsgoApiError("Servidor ocupado.");
    return server;
  }

  const server = await prisma.csgoServer.findFirst({
    where: { status: "online" },
    orderBy: { createdAt: "asc" },
  });
  if (!server) {
    const fallback = await prisma.csgoServer.findFirst({
      where: { status: "offline" },
      orderBy: { createdAt: "asc" },
    });
    if (!fallback) throw new CsgoApiError("Nenhum servidor disponível.", 503);
    return fallback;
  }
  return server;
}

export async function markServerBusy(id: string) {
  await prisma.csgoServer.update({ where: { id }, data: { status: "busy" } });
}

export async function releaseServer(id: string) {
  await prisma.csgoServer.update({ where: { id }, data: { status: "online" } });
}
