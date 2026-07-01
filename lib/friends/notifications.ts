import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

async function canReceiveSocialNotification(userId: string): Promise<boolean> {
  const pref = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
    select: { inAppSocial: true },
  });
  return pref?.inAppSocial ?? true;
}

async function displayNameFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: STEAM_DISPLAY_NAME_SELECT,
  });
  return user ? resolveSteamDisplayName(user) : "Jogador";
}

export async function notifyFriendRequestReceived(
  addresseeId: string,
  requesterId: string,
): Promise<void> {
  if (!(await canReceiveSocialNotification(addresseeId))) return;
  const name = await displayNameFor(requesterId);
  await prisma.notification.create({
    data: {
      userId: addresseeId,
      type: "SOCIAL",
      title: "Novo pedido de amizade",
      body: `${name} quer ser seu amigo.`,
      titleKey: "friends.requestReceived.title",
      bodyKey: "friends.requestReceived.body",
      params: { name, action: "friends", href: "/dashboard/amigos" },
    },
  });
}

export async function notifyFriendRequestAccepted(
  requesterId: string,
  addresseeId: string,
): Promise<void> {
  if (!(await canReceiveSocialNotification(requesterId))) return;
  const name = await displayNameFor(addresseeId);
  await prisma.notification.create({
    data: {
      userId: requesterId,
      type: "SOCIAL",
      title: "Pedido de amizade aceito",
      body: `${name} aceitou seu pedido de amizade.`,
      titleKey: "friends.requestAccepted.title",
      bodyKey: "friends.requestAccepted.body",
      params: { name, nickname: "", action: "friends", href: "/dashboard/amigos" },
    },
  });
}
