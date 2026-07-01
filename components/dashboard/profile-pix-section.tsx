"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Save, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixIcon } from "@/components/ui/pix-icon";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import {
  detectPixKeyType,
  formatBrazilPhone,
  formatPixKeyInput,
  PIX_KEY_TYPES,
  type PixKeyType,
} from "@/lib/pix/pix-key-utils";
import { cn } from "@/lib/utils";

type PixProfilePayload = {
  pixKeyType: PixKeyType;
  pixKey: string;
  pixKeyHolderName: string;
  pixContactEmail: string;
  pixContactPhone: string;
  lgpdConsented: boolean;
};

const EMPTY: PixProfilePayload = {
  pixKeyType: "CPF",
  pixKey: "",
  pixKeyHolderName: "",
  pixContactEmail: "",
  pixContactPhone: "",
  lgpdConsented: false,
};

function formatPixFormPayload(data: PixProfilePayload): PixProfilePayload {
  return {
    ...data,
    pixContactEmail: data.pixContactEmail.trim().toLowerCase(),
  };
}

export function ProfilePixSection() {
  const t = useTranslations("pix.profile");
  const tToast = useTranslations("pix.toast");
  const tDesc = useTranslations("pix");

  const [form, setForm] = useState<PixProfilePayload>(EMPTY);
  const [initial, setInitial] = useState<PixProfilePayload>(EMPTY);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    secureApi<PixProfilePayload>("/api/profile/pix")
      .then((result) => {
        if (result.ok) {
          const formatted = formatPixFormPayload(result.data);
          setForm(formatted);
          setInitial(formatted);
          setLgpdConsent(result.data.lgpdConsented);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const dirty = useMemo(
    () =>
      form.pixKey !== initial.pixKey ||
      form.pixKeyType !== initial.pixKeyType ||
      form.pixKeyHolderName !== initial.pixKeyHolderName ||
      form.pixContactEmail !== initial.pixContactEmail ||
      form.pixContactPhone !== initial.pixContactPhone ||
      lgpdConsent !== initial.lgpdConsented,
    [form, initial, lgpdConsent],
  );

  const pixKeyFieldProps = useMemo(() => {
    switch (form.pixKeyType) {
      case "PHONE":
        return { inputMode: "tel" as const, maxLength: 16 };
      case "CPF":
        return { inputMode: "numeric" as const, maxLength: 14 };
      case "CNPJ":
        return { inputMode: "numeric" as const, maxLength: 18 };
      case "EMAIL":
        return { type: "email" as const, maxLength: 140 };
      default:
        return { maxLength: 140 };
    }
  }, [form.pixKeyType]);

  const pixKeyPlaceholder = useMemo(() => {
    switch (form.pixKeyType) {
      case "EMAIL":
        return t("placeholders.email");
      case "PHONE":
        return t("placeholders.phone");
      case "CPF":
        return t("placeholders.cpf");
      case "CNPJ":
        return t("placeholders.cnpj");
      default:
        return t("placeholders.random");
    }
  }, [form.pixKeyType, t]);

  function updateKeyType(nextType: PixKeyType) {
    setForm((prev) => ({
      ...prev,
      pixKeyType: nextType,
      pixKey: formatPixKeyInput(nextType, prev.pixKey),
    }));
  }

  function updatePixKey(raw: string) {
    setForm((prev) => {
      const detected = detectPixKeyType(raw);
      const type = prev.pixKeyType === "RANDOM" && raw.includes("@") ? detected : prev.pixKeyType;
      return {
        ...prev,
        pixKeyType: type,
        pixKey: formatPixKeyInput(type, raw),
      };
    });
  }

  async function save() {
    if (!form.pixKeyHolderName.trim()) {
      toast.error(tToast("holderRequired"));
      return;
    }
    if (!form.pixContactEmail.trim() || !form.pixContactPhone.trim()) {
      toast.error(tToast("contactRequired"));
      return;
    }
    if (!lgpdConsent) {
      toast.error(tToast("lgpdRequired"));
      return;
    }

    setSaving(true);
    const result = await secureApi("/api/profile/pix", {
      method: "PATCH",
      json: {
        ...form,
        lgpdConsent: true,
      },
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const saved = formatPixFormPayload(result.data as PixProfilePayload);
    setForm(saved);
    setInitial(saved);
    setLgpdConsent(true);
    toast.success(tToast("saved"));
  }

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
          <h3 className="font-display text-base font-bold text-foreground">{t("title")}</h3>
          <p className="mt-1 text-sm text-muted">{tDesc("description")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-black/10 p-3 text-sm text-muted">
        <p className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{t.rich("privacyNotice", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}</span>
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("keyTypeLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {PIX_KEY_TYPES.map((optionId) => (
            <button
              key={optionId}
              type="button"
              onClick={() => updateKeyType(optionId)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                form.pixKeyType === optionId
                  ? "border-[#32BCAD] bg-[color-mix(in_srgb,#32BCAD_18%,transparent)] text-[#32BCAD]"
                  : "border-border text-muted hover:border-primary/30 hover:text-foreground",
              )}
            >
              {t(`keyTypes.${optionId}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("fields.pixKey")}
          value={form.pixKey}
          onChange={(e) => updatePixKey(e.target.value)}
          placeholder={pixKeyPlaceholder}
          autoComplete="off"
          {...pixKeyFieldProps}
        />
        <Input
          label={t("fields.holderName")}
          value={form.pixKeyHolderName}
          onChange={(e) => setForm((prev) => ({ ...prev, pixKeyHolderName: e.target.value }))}
          placeholder={t("placeholders.holderName")}
          maxLength={80}
          required
        />
        <Input
          label={t("fields.contactEmail")}
          type="email"
          value={form.pixContactEmail}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              pixContactEmail: e.target.value.trim().toLowerCase(),
            }))
          }
          placeholder={t("placeholders.email")}
          maxLength={120}
          required
        />
        <Input
          label={t("fields.contactPhone")}
          value={form.pixContactPhone}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              pixContactPhone: formatBrazilPhone(e.target.value),
            }))
          }
          placeholder={t("placeholders.phone")}
          inputMode="tel"
          maxLength={16}
          required
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-black/10 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={lgpdConsent}
          onChange={(e) => setLgpdConsent(e.target.checked)}
        />
        <span className="text-muted">
          <ShieldCheck className="mb-1 inline h-4 w-4 text-emerald-400" /> {t("lgpdConsent")}
        </span>
      </label>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving || !form.pixKey.trim() || !dirty}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Save className="h-4 w-4" />}
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
