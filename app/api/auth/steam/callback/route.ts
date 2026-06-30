import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  resolveSteamNickname,
  syncNicknameFromSteam,
} from "@/lib/steam/nickname";
import { prisma } from "@/lib/prisma";
import { verifySteamOpenId, getAppUrl } from "@/lib/steam/openid";
import { getRequestOrigin } from "@/lib/app-url";
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

function redirectUrl(request: NextRequest, path: string): URL {
  try {
    return new URL(path, getAppUrl(request));
  } catch {
    return new URL(path, getRequestOrigin(request));
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleSteamCallback(request);
  } catch (error) {
    console.error("[auth/steam/callback]", error);
    return NextResponse.redirect(redirectUrl(request, "/login?error=steam_server_error"));
  }
}

async function handleSteamCallback(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") ?? "login";
  const params = request.nextUrl.searchParams;

  const steamId = await verifySteamOpenId(params);
  if (!steamId) {
    return NextResponse.redirect(
      redirectUrl(request, "/login?error=steam_auth_failed"),
    );
  }

  const steamProfile =
    (await fetchSteamPlayerSummary(steamId)) ?? fallbackSteamProfile(steamId);

  if (mode === "switch") {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.redirect(redirectUrl(request, "/login"));
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return NextResponse.redirect(redirectUrl(request, "/login"));
    }
    if (currentUser.email) {
      return NextResponse.redirect(redirectUrl(request, "/dashboard"));
    }

    const existingSteam = await prisma.user.findUnique({
      where: { steamId },
    });
    if (existingSteam && existingSteam.id !== userId) {
      return NextResponse.redirect(
        redirectUrl(request, "/completar-perfil?error=steam_already_linked"),
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
      redirectUrl(request, "/completar-perfil?steam=connected"),
    );
    return applySessionCookie(response, token, request);
  }

  if (mode === "link") {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.redirect(redirectUrl(request, "/login"));
    }

    const existingSteam = await prisma.user.findUnique({
      where: { steamId },
    });
    if (existingSteam && existingSteam.id !== userId) {
      return NextResponse.redirect(
        redirectUrl(request, "/dashboard/perfil?error=steam_already_linked"),
      );
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return NextResponse.redirect(redirectUrl(request, "/login"));
    }

    await prisma.user.update({
      where: { id: userId },
      data: buildUserSteamUpdate(currentUser, steamProfile),
    });
    void onSteamLinked(userId, steamProfile.accountCreatedAt);
    void recordAccountFingerprint(userId, request);

    return NextResponse.redirect(
      redirectUrl(request, "/dashboard/perfil?steam=linked"),
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
        redirectUrl(request, "/login?error=account_banned"),
      );
    }
  }

  const token = createSessionToken(user.id, sessionOptionsFromUser(user));
  const redirectPath = user.email ? "/dashboard" : "/completar-perfil";
  const response = NextResponse.redirect(redirectUrl(request, redirectPath));
  return applySessionCookie(response, token, request);
}
