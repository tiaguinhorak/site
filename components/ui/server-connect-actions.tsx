"use client";

import { useState } from "react";
import { Copy, Check, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { steamConnectUrl } from "@/lib/servers/connect";
import { cn } from "@/lib/utils";

type ServerConnectActionsProps = {
  host: string;
  port: number;
  className?: string;
  size?: "sm" | "md";
  showSteamLink?: boolean;
};

export function ServerConnectActions({
  host,
  port,
  className,
  size = "sm",
  showSteamLink = true,
}: ServerConnectActionsProps) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const connectCommand = `connect ${host}:${port}`;
  const steamUrl = steamConnectUrl(host, port);

  async function copyConnect() {
    try {
      await navigator.clipboard.writeText(connectCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
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
