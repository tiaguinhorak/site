"use client";

import { useState } from "react";
import { Copy, Check, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { steamConnectUrl } from "@/lib/servers/connect";
import {
  getServerConnectEligibility,
  serverConnectHref,
} from "@/lib/servers/connect-eligibility";
import { cn } from "@/lib/utils";

type ServerConnectActionsProps = {
  host: string;
  port: number;
  className?: string;
  size?: "sm" | "md";
  showSteamLink?: boolean;
  fromPath?: string;
};

export function ServerConnectActions({
  host,
  port,
  className,
  size = "sm",
  showSteamLink = true,
  fromPath = "/dashboard",
}: ServerConnectActionsProps) {
  const t = useTranslations("common");
  const { authenticated, steamLinked, loading } = useAuthSession();
  const [copied, setCopied] = useState(false);
  const connectCommand = `connect ${host}:${port}`;
  const eligibility = getServerConnectEligibility(authenticated, steamLinked);
  const steamUrl =
    eligibility === "connect" ? steamConnectUrl(host, port) : null;

  async function copyConnect() {
    try {
      await navigator.clipboard.writeText(connectCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  if (loading) {
    return null;
  }

  if (eligibility !== "connect") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <ButtonLink
          href={serverConnectHref(eligibility, fromPath)}
          variant="primary"
          size={size}
        >
          <Play className="h-3.5 w-3.5" />
          {eligibility === "login" ? t("loginToConnect") : t("linkSteamToConnect")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <code className="rounded-md bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2.5 py-1.5 font-mono text-xs text-foreground">
        {connectCommand}
      </code>
      <Button variant="outline" size={size} onClick={() => void copyConnect()}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t("copied") : t("copy")}
      </Button>
      {showSteamLink && steamUrl && (
        <ButtonLink href={steamUrl} variant="primary" size={size}>
          <Play className="h-3.5 w-3.5" />
          {t("openCsgo")}
        </ButtonLink>
      )}
    </div>
  );
}
