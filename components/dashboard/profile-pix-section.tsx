"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixIcon } from "@/components/ui/pix-icon";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { PIX_PRIZE_DESCRIPTION } from "@/lib/ranked/pix-prize";

export function ProfilePixSection() {
  const [pixKey, setPixKey] = useState("");
  const [pixKeyHolderName, setPixKeyHolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialKey, setInitialKey] = useState("");

  useEffect(() => {
    secureApi<{ pixKey: string; pixKeyHolderName: string }>("/api/profile/pix")
      .then((result) => {
        if (result.ok) {
          setPixKey(result.data.pixKey);
          setPixKeyHolderName(result.data.pixKeyHolderName);
          setInitialKey(result.data.pixKey);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const result = await secureApi("/api/profile/pix", {
      method: "PATCH",
      json: { pixKey, pixKeyHolderName },
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setInitialKey(pixKey);
    toast.success("Chave Pix salva.");
  }

  const dirty = pixKey !== initialKey;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-[color-mix(in_srgb,#32BCAD_24%,transparent)] bg-[color-mix(in_srgb,#32BCAD_6%,transparent)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <PixIcon size={24} />
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Chave Pix para prêmios</h3>
          <p className="mt-1 text-sm text-muted">{PIX_PRIZE_DESCRIPTION}</p>
          <p className="mt-1 text-sm text-muted">
            Se você ficar no top 3 de uma temporada com prêmio em Pix, usaremos esta chave para pagamento.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Chave Pix"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          maxLength={140}
        />
        <Input
          label="Nome do titular (opcional)"
          value={pixKeyHolderName}
          onChange={(e) => setPixKeyHolderName(e.target.value)}
          placeholder="Como aparece no banco"
          maxLength={80}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="primary" size="sm" disabled={saving || !pixKey.trim() || !dirty} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Save className="h-4 w-4" />}
          Salvar chave Pix
        </Button>
      </div>
    </section>
  );
}
