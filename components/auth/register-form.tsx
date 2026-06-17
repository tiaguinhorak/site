"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/ui/honeypot-field";
import { SteamIcon } from "@/components/ui/icons";
import { secureApi } from "@/lib/api/client";
import {
  registerSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { sanitizeNickname } from "@/lib/security/sanitize";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");

  async function submitRegister() {
    setFormError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse({
      nickname,
      email,
      password,
      confirmPassword,
      website: honeypot,
    });

    if (!parsed.success) {
      setFieldErrors(formatZodErrors(parsed.error));
      setFormError(firstZodError(parsed.error));
      return;
    }

    setLoading(true);
    const result = await secureApi<{ ok: boolean }>("/api/auth/register", {
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
      <a
        href="/api/auth/steam?mode=register"
        className={`relative inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-semibold uppercase tracking-wide glass text-foreground transition-all hover:glow-ring hover:-translate-y-0.5 ${loading ? "pointer-events-none opacity-50" : ""}`}
      >
        <SteamIcon className="h-5 w-5 text-primary" />
        Criar conta com Steam
      </a>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted">
          ou preencha os dados
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submitRegister();
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
          label="Nickname"
          placeholder="Seu nick in-game"
          autoComplete="username"
          maxLength={24}
          value={nickname}
          onChange={(e) => setNickname(sanitizeNickname(e.target.value))}
          error={fieldErrors.nickname}
          icon={<User className="h-4.5 w-4.5" />}
        />
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
          placeholder="Mín. 8 caracteres, maiúscula, minúscula e número"
          autoComplete="new-password"
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          icon={<Lock className="h-4.5 w-4.5" />}
        />
        <Input
          label="Confirmar senha"
          type="password"
          placeholder="Repita a senha"
          autoComplete="new-password"
          maxLength={128}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          icon={<Lock className="h-4.5 w-4.5" />}
        />

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Criar minha conta
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
