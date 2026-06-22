"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { ConfirmOptions } from "@/components/providers/confirm-provider";

type Tone = ConfirmOptions["tone"];

/**
 * Translated counterparts of the user-facing confirm presets.
 * Admin-only presets remain in `confirm-presets.ts` (out of i18n scope).
 */
export function useConfirmPresets() {
  const t = useTranslations("confirm");
  const tc = useTranslations("confirmDialog");

  return useMemo(() => {
    const cancel = tc("cancel");
    const make = (
      key: string,
      tone: Tone,
      values?: Record<string, string>,
      confirmKey?: string,
      cancelLabel?: string,
      icon?: ConfirmOptions["icon"],
    ): ConfirmOptions => ({
      title: t(`${key}Title`, values),
      description: t(`${key}Desc`, values),
      confirmLabel: confirmKey ? t(confirmKey) : t(`${key}Confirm`),
      cancelLabel: cancelLabel ?? cancel,
      tone,
      icon,
    });

    return {
      logout: make("logout", "danger", undefined, undefined, t("logoutCancel"), "logout"),
      editProfile: make("editProfile", "default", undefined, undefined, undefined, "edit"),
      enableMfa: make("enableMfa", "default"),
      disableMfa: make("disableMfa", "danger", undefined, undefined, t("disableMfaCancel")),
      changePassword: make("changePassword", "warning"),
      removeAvatar: make("removeAvatar", "warning", undefined, undefined, undefined, "delete"),
      unlinkSteam: make("unlinkSteam", "danger"),
      switchSteam: make("switchSteam", "warning"),
      useAnotherAccount: make("useAnotherAccount", "warning"),
      markAllRead: make("markAllRead", "warning"),
      connectServer: (serverName: string, mode: string) =>
        make("connectServer", "default", { serverName, mode }),
      joinQueue: (serverName: string) => make("joinQueue", "warning", { serverName }),
      createLobbyRoom: make("createLobbyRoom", "default"),
      autoLobby: (roomName: string, modeName: string) =>
        make("autoLobby", "default", { roomName, modeName }),
      joinRankedQueue: make("joinRankedQueue", "default"),
      leaveRankedQueue: make(
        "leaveRankedQueue",
        "warning",
        undefined,
        undefined,
        t("leaveRankedQueueCancel"),
      ),
      downloadAnticheat: make("downloadAnticheat", "default"),
      subscribePremium: (plan = "Premium") => make("subscribePremium", "default", { plan }),
      purchaseItem: (itemName: string, price: string) =>
        make("purchaseItem", "warning", { itemName, price }),
      openSupport: (channel: string) => make("openSupport", "default", { channel }),
      equipSkin: (itemName: string) => make("equipSkin", "default", { itemName }),
      unequipSkin: (itemName: string) => make("unequipSkin", "warning", { itemName }),
      quickConnect: make("quickConnect", "default"),
      rankedCancelMatch: make(
        "rankedCancelMatch",
        "danger",
        undefined,
        undefined,
        t("rankedCancelMatchCancel"),
      ),
    };
  }, [t, tc]);
}
