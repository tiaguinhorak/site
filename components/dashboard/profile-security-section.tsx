"use client";

import { useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Smartphone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import {
  passwordChangeSchema,
  mfaVerifySchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { cn } from "@/lib/utils";

const MFA_SECRET = "CLUTCHCLUBE-HE7RY-2FA9";
const MOCK_BACKUP_CODES = [
  "8K2P-9LMN",
  "4R7X-QW3T",
  "HJ5V-6B8C",
  "N9D2-FG4K",
  "W1Y6-ZP7R",
  "3T8M-LQ5N",
];

type ProfileSecuritySectionProps = {
  mfaEnabled: boolean;
  onMfaChange: (enabled: boolean) => void;
};

type MfaStep = "idle" | "setup" | "verify";

export function ProfileSecuritySection({
  mfaEnabled,
  onMfaChange,
}: ProfileSecuritySectionProps) {
  const t = useTranslations("security");
  const tc = useTranslations("common");
  const confirmPresets = useConfirmPresets();
  const [mfaStep, setMfaStep] = useState<MfaStep>("idle");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordTone, setPasswordTone] = useState<"ok" | "err">("ok");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  function startMfaSetup() {
    setMfaStep("setup");
    setVerifyCode("");
    setVerifyError("");
  }

  function handleVerifyMfa() {
    const parsed = mfaVerifySchema.safeParse({ code: verifyCode });
    if (!parsed.success) {
      setVerifyError(firstZodError(parsed.error));
      return;
    }
    setVerifyError("");
    onMfaChange(true);
    setMfaStep("idle");
    setVerifyCode("");
  }

  async function handlePasswordChange() {
    setPasswordErrors({});
    setPasswordMessage(null);

    const parsed = passwordChangeSchema.safeParse({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.new,
      confirmPassword: passwordForm.confirm,
    });

    if (!parsed.success) {
      setPasswordErrors(formatZodErrors(parsed.error));
      setPasswordTone("err");
      setPasswordMessage(firstZodError(parsed.error));
      return;
    }

    setChangingPassword(true);
    const result = await secureApi<{ ok: boolean }>("/api/profile/password", {
      method: "POST",
      json: parsed.data,
    });
    setChangingPassword(false);

    if (!result.ok) {
      if (result.fieldErrors) setPasswordErrors(result.fieldErrors);
      setPasswordTone("err");
      setPasswordMessage(result.error);
      return;
    }

    setPasswordForm({ current: "", new: "", confirm: "" });
    setPasswordTone("ok");
    setPasswordMessage(t("passwordChanged"));
  }

  function handleDisableMfa() {
    onMfaChange(false);
    setMfaStep("idle");
    setVerifyCode("");
  }

  async function copySecret() {
    await navigator.clipboard.writeText(MFA_SECRET);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Senha */}
      <section className="rounded-card glass p-5 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              {t("changePasswordTitle")}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {t("changePasswordDesc")}
            </p>
          </div>
        </div>

        {passwordMessage && (
          <p
            className={cn(
              "mb-4 rounded-xl border px-4 py-3 text-sm",
              passwordTone === "ok"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400",
            )}
            role="status"
          >
            {passwordMessage}
          </p>
        )}

        <div className="space-y-4">
          <Input
            label={t("currentPassword")}
            type="password"
            maxLength={128}
            value={passwordForm.current}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, current: e.target.value }))
            }
            error={passwordErrors.currentPassword}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("newPassword")}
              type="password"
              maxLength={128}
              value={passwordForm.new}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, new: e.target.value }))
              }
              error={passwordErrors.newPassword}
            />
            <Input
              label={t("confirmPassword")}
              type="password"
              maxLength={128}
              value={passwordForm.confirm}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))
              }
              error={passwordErrors.confirmPassword}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={changingPassword}
            confirm={confirmPresets.changePassword}
            onClick={handlePasswordChange}
          >
            {changingPassword ? t("changing") : t("changePassword")}
          </Button>
        </div>
      </section>

      {/* MFA */}
      <section className="rounded-card glass p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                mfaEnabled
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary",
              )}
            >
              {mfaEnabled ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <ShieldOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {t("mfaTitle")}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {t("mfaDesc")}
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                  mfaEnabled
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-muted/20 text-muted",
                )}
              >
                {mfaEnabled ? t("active") : t("disabled")}
              </span>
            </div>
          </div>

          {mfaEnabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              confirm={confirmPresets.disableMfa}
              onClick={handleDisableMfa}
            >
              {t("disable2fa")}
            </Button>
          ) : mfaStep === "idle" ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              confirm={confirmPresets.enableMfa}
              onClick={startMfaSetup}
            >
              <Smartphone className="h-4 w-4" />
              {t("enable2fa")}
            </Button>
          ) : null}
        </div>

        {mfaEnabled && (
          <div className="space-y-4 rounded-xl glass border border-emerald-400/25 p-4">
            <p className="text-sm font-medium text-foreground">
              {t("recoveryCodes")}
            </p>
            <p className="text-xs text-muted">
              {t("recoveryCodesDesc")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MOCK_BACKUP_CODES.map((code) => (
                <code
                  key={code}
                  className="rounded-lg glass-input px-3 py-2 font-mono text-sm text-foreground"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>
        )}

        {!mfaEnabled && mfaStep === "setup" && (
          <div className="space-y-6 rounded-xl glass p-4 sm:p-5">
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                {t("step1")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("step1Desc")}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div
                className="flex h-36 w-36 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-2"
                aria-hidden
              >
                <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-0.5">
                  {Array.from({ length: 64 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-[1px]",
                        (i % 3 === 0 || i % 7 === 2) ? "bg-black" : "bg-white",
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  {t("orManual")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded-lg glass-input px-3 py-2 font-mono text-sm text-foreground">
                    {MFA_SECRET}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copySecret}
                    aria-label={t("copyKey")}
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                {t("step2")}
              </p>
              <div className="mt-3 max-w-xs">
                <Input
                  label={t("verifyCode")}
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => {
                    setVerifyCode(e.target.value.replace(/\D/g, ""));
                    setVerifyError("");
                  }}
                  placeholder="000000"
                />
                {verifyError && (
                  <p className="mt-2 text-xs text-rose-400">{verifyError}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleVerifyMfa}
              >
                {t("confirmActivate")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMfaStep("idle");
                  setVerifyCode("");
                  setVerifyError("");
                }}
              >
                {tc("cancel")}
              </Button>
            </div>
          </div>
        )}

        {!mfaEnabled && mfaStep === "idle" && (
          <p className="text-sm text-muted">
            {t("mfaRecommend")}
          </p>
        )}
      </section>
    </div>
  );
}
