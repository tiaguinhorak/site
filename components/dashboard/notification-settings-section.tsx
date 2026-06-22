"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { secureApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Preferences = {
  emailNewsletter: boolean;
  inAppMatch: boolean;
  inAppSocial: boolean;
  inAppPromo: boolean;
  inAppSystem: boolean;
  browserPush: boolean;
};

const defaultPrefs: Preferences = {
  emailNewsletter: true,
  inAppMatch: true,
  inAppSocial: true,
  inAppPromo: true,
  inAppSystem: true,
  browserPush: false,
};

type PrefKey = keyof Preferences;

export function NotificationSettingsSection() {
  const t = useTranslations("notificationSettings");
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/notification-preferences", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const p = data.preferences ?? {};
        setPrefs({
          emailNewsletter: p.emailNewsletter ?? true,
          inAppMatch: p.inAppMatch ?? true,
          inAppSocial: p.inAppSocial ?? true,
          inAppPromo: p.inAppPromo ?? true,
          inAppSystem: p.inAppSystem ?? true,
          browserPush: p.browserPush ?? false,
        });
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  async function toggle(key: PrefKey) {
    const next = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: next }));
    setSavingKey(key);
    setError(null);

    const result = await secureApi("/api/user/notification-preferences", {
      method: "PATCH",
      json: { [key]: next },
    });

    setSavingKey(null);
    if (!result.ok) {
      setPrefs((prev) => ({ ...prev, [key]: !next }));
      setError(result.error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">{t("title")}</h3>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("inAppGroup")}
        </p>
        <ul className="divide-y divide-border rounded-xl glass overflow-hidden">
          {(["inAppMatch", "inAppSocial", "inAppPromo", "inAppSystem"] as PrefKey[]).map(
            (key) => (
              <li key={key}>
                <PrefRow
                  label={t(`${key}.label`)}
                  description={t(`${key}.description`)}
                  checked={prefs[key]}
                  disabled={savingKey === key}
                  onChange={() => toggle(key)}
                />
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("emailGroup")}
        </p>
        <ul className="divide-y divide-border rounded-xl glass overflow-hidden">
          <li>
            <PrefRow
              label={t("emailNewsletter.label")}
              description={t("emailNewsletter.description")}
              checked={prefs.emailNewsletter}
              disabled={savingKey === "emailNewsletter"}
              onChange={() => toggle("emailNewsletter")}
            />
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("browserGroup")}
        </p>
        <ul className="divide-y divide-border rounded-xl glass overflow-hidden">
          <li>
            <PrefRow
              label={t("browserPush.label")}
              description={t("browserPush.description")}
              checked={prefs.browserPush}
              disabled={savingKey === "browserPush"}
              onChange={() => toggle("browserPush")}
            />
          </li>
        </ul>
      </div>
    </div>
  );
}

function PrefRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-primary" : "bg-muted/30",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "left-6" : "left-1",
          )}
        />
        {disabled && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          </span>
        )}
      </button>
    </div>
  );
}
