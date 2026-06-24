"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/ui/honeypot-field";
import { SteamIcon } from "@/components/ui/icons";
import { secureApi } from "@/lib/api/client";
import { notifyAuthSessionChanged } from "@/lib/auth/auth-events";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "@/lib/toast";
import {
  loginSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useUser();
  const t = useTranslations("authForm");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  async function submitLogin() {
    setFieldErrors({});

    const parsed = loginSchema.safeParse({
      email,
      password,
      remember,
      website: honeypot,
    });

    if (!parsed.success) {
      setFieldErrors(formatZodErrors(parsed.error));
      toast.error(firstZodError(parsed.error));
      return;
    }

    setLoading(true);
    const result = await secureApi<{ ok: boolean }>("/api/auth/login", {
      method: "POST",
      json: parsed.data,
    });
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    await refresh();
    notifyAuthSessionChanged();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <ButtonLinkSteam mode="login" disabled={loading} label={t("signInSteam")} />

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted">
          {t("orEmail")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submitLogin();
        }}
        noValidate
      >
        <HoneypotField value={honeypot} onChange={setHoneypot} />

        <Input
          label={t("email")}
          type="email"
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          icon={<Mail className="h-4.5 w-4.5" />}
        />
        <Input
          label={t("password")}
          type="password"
          placeholder={t("passwordPlaceholder")}
          autoComplete="current-password"
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          icon={<Lock className="h-4.5 w-4.5" />}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            {t("remember")}
          </label>
          <Link href="#" className="text-sm text-primary hover:underline">
            {t("forgot")}
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Spinner size="md" />
          ) : (
            <>
              {t("signIn")}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function ButtonLinkSteam({
  mode,
  disabled,
  label = "Entrar com Steam",
}: {
  mode: "login" | "register";
  disabled?: boolean;
  label?: string;
}) {
  return (
    <a
      href={`/api/auth/steam?mode=${mode}`}
      className={`relative inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-semibold uppercase tracking-wide glass text-foreground transition-all hover:glow-ring hover:-translate-y-0.5 ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <SteamIcon className="h-5 w-5 text-primary" />
      {label}
    </a>
  );
}
