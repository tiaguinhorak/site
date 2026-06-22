"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Power, Settings2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";

type ControlResponse = {
  ok: boolean;
  message: string;
  warning?: string;
};

type Props = {
  serverName: string;
  csgoServerId: string | null | undefined;
  online: boolean;
  onActionComplete?: () => void;
};

export function LiveServerAdminActions({
  serverName,
  csgoServerId,
  online,
  onActionComplete,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!csgoServerId) {
    return (
      <div className="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-muted">
        Gerenciamento indisponível para este servidor.{" "}
        <Link href="/admin/infra-csgo" className="text-primary underline-offset-2 hover:underline">
          Abrir Infra CS:GO
        </Link>
      </div>
    );
  }

  async function stopServer() {
    setBusy(true);
    setMessage(null);
    const result = await secureApi<ControlResponse>(
      `/api/admin/csgo/servers/${csgoServerId}/stop`,
      { method: "POST" },
    );
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(result.data.message);
    onActionComplete?.();
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Admin
      </p>
      <div className="flex flex-wrap gap-2">
        {online && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            confirm={confirmPresets.csgoStopServer(serverName)}
            onClick={() => void stopServer()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            Derrubar
          </Button>
        )}
        <ButtonLink
          href="/admin/infra-csgo"
          variant="ghost"
          size="sm"
        >
          <Settings2 className="h-4 w-4" />
          Infra completa
        </ButtonLink>
      </div>
      {message && <p className="text-xs text-emerald-400">{message}</p>}
    </div>
  );
}
