"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/ui/honeypot-field";
import { SteamIcon } from "@/components/ui/icons";
import { secureApi } from "@/lib/api/client";
import { notifyAuthSessionChanged } from "@/lib/auth/auth-events";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "@/lib/toast";
import { sanitizeNickname } from "@/lib/security/sanitize";
import {
  loginSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";

function normalizeNicknameInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 24);
}

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useUser();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  async function submitLogin() {
    setFieldErrors({});

    const parsed = loginSchema.safeParse({
      nickname: sanitizeNickname(nickname),
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
    <div className="space-y-6">
      <a
        href="/api/auth/steam?mode=login"
        className={`relative inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-semibold uppercase tracking-wide glass text-foreground transition-all hover:glow-ring hover:-translate-y-0.5 ${loading ? "pointer-events-none opacity-50" : ""}`}
      >
        <SteamIcon className="h-5 w-5 text-primary" />
        Entrar com Steam
      </a>

      <div className="my-2 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted">ou nick e senha</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <p className="text-sm text-muted">
        Não consegue abrir a Steam agora? Entre com seu nick do site e a senha definida no cadastro.
      </p>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submitLogin();
        }}
        noValidate
      >
        <HoneypotField value={honeypot} onChange={setHoneypot} />

        <Input
          label="Nick"
          placeholder="SEU_NICK"
          autoComplete="username"
          maxLength={24}
          value={nickname}
          onChange={(e) => setNickname(normalizeNicknameInput(e.target.value))}
          error={fieldErrors.nickname}
          icon={<User className="h-4.5 w-4.5" />}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="Sua senha"
          autoComplete="current-password"
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          icon={<Lock className="h-4.5 w-4.5" />}
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          Lembrar de mim
        </label>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Spinner size="md" />
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
