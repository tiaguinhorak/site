import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  resolveSteamNickname,
  syncNicknameFromSteam,
  steamPersonaToNickname,
} from "@/lib/steam/nickname";
import { prisma } from "@/lib/prisma";
import { verifySteamOpenId, getAppUrl } from "@/lib/steam/openid";
import { fetchSteamPlayerSummary } from "@/lib/steam/profile";
import {
  buildUserSteamCreate,
  buildUserSteamUpdate,
  type SteamProfileData,
} from "@/lib/steam/sync-user";
import { sessionOptionsFromUser } from "@/lib/auth/session-options";
import { createSessionToken, applySessionCookie } from "@/lib/security/session";
import { isUserBanned } from "@/lib/admin/punishments";
import { onSteamLinked } from "@/lib/anti-smurf/service";
import { recordAccountFingerprint } from "@/lib/anti-smurf/fingerprint";

function fallbackSteamProfile(steamId: string): SteamProfileData {
  return {
    steamId,
    personaName: `Player_${steamId.slice(-4)}`,
    avatarUrl: null,
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
    realName: null,
    countryCode: null,
    accountCreatedAt: null,
  };
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") ?? "login";
  const params = request.nextUrl.searchParams;

  const steamId = await verifySteamOpenId(params);
  if (!steamId) {
    return NextResponse.redirect(
      new URL("/login?error=steam_auth_failed", getAppUrl(request)),
    );
  }

  const steamProfile =
    (await fetchSteamPlayerSummary(steamId)) ?? fallbackSteamProfile(steamId);

  if (mode === "switch") {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.redirect(new URL("/login", getAppUrl(request)));
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return NextResponse.redirect(new URL("/login", getAppUrl(request)));
    }
    if (currentUser.email) {
      return NextResponse.redirect(new URL("/dashboard", getAppUrl(request)));
    }

    const existingSteam = await prisma.user.findUnique({
      where: { steamId },
    });
    if (existingSteam && existingSteam.id !== userId) {
      return NextResponse.redirect(
        new URL("/completar-perfil?error=steam_already_linked", getAppUrl(request)),
      );
    }

    const nickname = await resolveSteamNickname(
      steamProfile.personaName,
      steamId,
      userId,
    );

    const steamUpdate = buildUserSteamUpdate(currentUser, steamProfile);
    steamUpdate.nickname = nickname;

    await prisma.user.update({
      where: { id: userId },
      data: steamUpdate,
    });

    const token = createSessionToken(currentUser.id, {
      profileComplete: false,
      isAdmin: currentUser.isAdmin,
    });
    const response = NextResponse.redirect(
      new URL("/completar-perfil?steam=connected", getAppUrl(request)),
    );
    return applySessionCookie(response, token, request);
  }

  if (mode === "link") {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.redirect(new URL("/login", getAppUrl(request)));
    }

    const existingSteam = await prisma.user.findUnique({
      where: { steamId },
    });
    if (existingSteam && existingSteam.id !== userId) {
      return NextResponse.redirect(
        new URL("/dashboard/perfil?error=steam_already_linked", getAppUrl(request)),
      );
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return NextResponse.redirect(new URL("/login", getAppUrl(request)));
    }

    await prisma.user.update({
      where: { id: userId },
      data: buildUserSteamUpdate(currentUser, steamProfile),
    });
    void onSteamLinked(userId, steamProfile.accountCreatedAt);
    void recordAccountFingerprint(userId, request);

    return NextResponse.redirect(
      new URL("/dashboard/perfil?steam=linked", getAppUrl(request)),
    );
  }

  let user = await prisma.user.findUnique({ where: { steamId } });

  if (!user) {
    const nickname = await resolveSteamNickname(
      steamProfile.personaName,
      steamId,
    );

    user = await prisma.user.create({
      data: buildUserSteamCreate(steamProfile, nickname),
    });
    void onSteamLinked(user.id, steamProfile.accountCreatedAt);
    void recordAccountFingerprint(user.id, request);
  } else {
    const steamUpdate = buildUserSteamUpdate(user, steamProfile);
    const syncedNick = await syncNicknameFromSteam(
      steamProfile.personaName,
      steamId,
      user.id,
      user.nickname,
      Boolean(user.email),
    );
    if (syncedNick) steamUpdate.nickname = syncedNick;

    user = await prisma.user.update({
      where: { id: user.id },
      data: steamUpdate,
    });
    void onSteamLinked(user.id, steamProfile.accountCreatedAt);
    void recordAccountFingerprint(user.id, request);

    if (await isUserBanned(user.id)) {
      return NextResponse.redirect(
        new URL("/login?error=account_banned", getAppUrl(request)),
      );
    }
  }

  const token = createSessionToken(user.id, sessionOptionsFromUser(user));
  const redirectPath = user.email ? "/dashboard" : "/completar-perfil";
  const response = NextResponse.redirect(new URL(redirectPath, getAppUrl(request)));
  return applySessionCookie(response, token, request);
}
