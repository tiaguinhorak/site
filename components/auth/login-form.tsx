"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/ui/honeypot-field";
import { SteamIcon } from "@/components/ui/icons";
import { secureApi } from "@/lib/api/client";
import {
  loginSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  async function submitLogin() {
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({
      email,
      password,
      remember,
      website: honeypot,
    });

    if (!parsed.success) {
      setFieldErrors(formatZodErrors(parsed.error));
      setFormError(firstZodError(parsed.error));
      return;
    }

    setLoading(true);
    const result = await secureApi<{ ok: boolean }>("/api/auth/login", {
      method: "POST",
      json: parsed.data,
    });
    setLoading(false);

    if (!result.ok) {
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <ButtonLinkSteam mode="login" disabled={loading} />

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted">
          ou com e-mail
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

        {formError && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400" role="alert">
            {formError}
          </p>
        )}

        <Input
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          icon={<Mail className="h-4.5 w-4.5" />}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
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
            Lembrar de mim
          </label>
          <Link href="#" className="text-sm text-primary hover:underline">
            Esqueceu a senha?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Entrar
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
