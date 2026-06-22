"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  User,
  Lock,
  Loader2,
  ArrowRight,
  LogIn,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { CountryPicker } from "@/components/ui/country-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/ui/honeypot-field";
import { SteamIcon } from "@/components/ui/icons";
import { SteamDataNotice } from "@/components/auth/steam-data-notice";
import { secureApi } from "@/lib/api/client";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { formatZodErrors, firstZodError, steamCompleteProfileSchema } from "@/lib/security/schemas";
import { sanitizeText } from "@/lib/security/sanitize";
import { buildPhoneValue, extractNationalDigits } from "@/lib/profile/phone";
import type { UserProfile } from "@/lib/serializers";

const EMAIL_DRAFT_KEY = "clutchclube-complete-profile-email";

type SteamPreview = {
  nickname: string;
  storedNickname: string;
  steamPersonaName: string | null;
  steamId: string | null;
  steamProfileUrl: string | null;
  avatarUrl: string | null;
  country: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export function SteamCompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("steamComplete");
  const confirmPresets = useConfirmPresets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<SteamPreview | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("BR");
  const [honeypot, setHoneypot] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/auth/complete-profile", {
      credentials: "same-origin",
    });
    if (res.status === 400) {
      router.replace("/dashboard");
      return null;
    }
    if (!res.ok) return null;
    return res.json() as Promise<SteamPreview>;
  }, [router]);

  useEffect(() => {
    loadProfile()
      .then((data) => {
        if (!data) return;
        setPreview(data);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setPhone(data.phone ?? "");
        setCountry(data.country ?? "BR");
        const savedEmail = localStorage.getItem(EMAIL_DRAFT_KEY);
        setEmail(savedEmail ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadProfile]);

  useEffect(() => {
    const steam = searchParams.get("steam");
    const error = searchParams.get("error");
    if (steam === "connected") {
      setStatusMessage(t("statusConnected"));
      loadProfile().then((data) => {
        if (data) setPreview(data);
      });
    } else if (error === "steam_already_linked") {
      setFormError(t("errAlreadyLinked"));
    }
  }, [searchParams, loadProfile, t]);

  const saveDraft = useCallback(
    (fields: {
      firstName: string;
      lastName: string;
      phone: string;
      country: string;
      email: string;
    }) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(async () => {
        localStorage.setItem(EMAIL_DRAFT_KEY, fields.email);
        const result = await secureApi<{ ok: boolean }>(
          "/api/auth/complete-profile",
          {
            method: "PATCH",
            json: {
              firstName: fields.firstName,
              lastName: fields.lastName,
              phone: fields.phone,
              country: fields.country,
            },
          },
        );
        if (result.ok) {
          setDraftSaved(true);
          setTimeout(() => setDraftSaved(false), 2000);
        }
      }, 700);
    },
    [],
  );

  useEffect(() => {
    if (loading || !preview) return;
    saveDraft({ firstName, lastName, phone, country, email });
  }, [firstName, lastName, phone, country, email, loading, preview, saveDraft]);

  async function submit() {
    setFormError(null);
    setFieldErrors({});

    const parsed = steamCompleteProfileSchema.safeParse({
      email,
      firstName,
      lastName,
      phone,
      country,
      password,
      confirmPassword,
      website: honeypot,
    });

    if (!parsed.success) {
      setFieldErrors(formatZodErrors(parsed.error));
      setFormError(firstZodError(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await secureApi<{ ok: boolean; user: UserProfile }>(
      "/api/auth/complete-profile",
      { method: "POST", json: parsed.data },
    );
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    localStorage.removeItem(EMAIL_DRAFT_KEY);
    router.push("/dashboard");
    router.refresh();
  }

  async function leaveForAuth(path: "/login" | "/register") {
    await secureApi("/api/auth/logout", { method: "POST" });
    localStorage.removeItem(EMAIL_DRAFT_KEY);
    router.push(path);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!preview) {
    return (
      <p className="text-center text-sm text-muted">
        {t("loadError")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <SteamDataNotice />

      <div className="flex items-center gap-4 rounded-xl border border-border p-4 glass">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#171a21]">
          {preview.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <SteamIcon className="h-7 w-7 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-foreground">
            {preview.steamPersonaName ?? t("steamAccount")}
          </p>
          <p className="text-xs text-muted">{t("steamConnected")}</p>
          {preview.steamId && (
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              {preview.steamId}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 normal-case tracking-normal"
          confirm={confirmPresets.switchSteam}
          onClick={() => {
            window.location.href = "/api/auth/steam?mode=switch";
          }}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">{t("switchSteam")}</span>
        </Button>
      </div>

      {statusMessage && (
        <p
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-400"
          role="status"
        >
          {statusMessage}
        </p>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <HoneypotField value={honeypot} onChange={setHoneypot} />

        {draftSaved && (
          <p className="text-xs text-emerald-400" role="status">
            {t("draftSaved")}
          </p>
        )}

        {formError && (
          <p
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400"
            role="alert"
          >
            {formError}
          </p>
        )}

        <Input
          label={t("nicknameLabel")}
          value={preview.nickname}
          readOnly
          className="cursor-not-allowed opacity-80"
          icon={<User className="h-4.5 w-4.5" />}
        />
        <p className="text-xs text-muted">
          {t("nicknameHint", { name: preview.steamPersonaName ?? preview.nickname })}
        </p>

        <Input
          label={t("emailLabel")}
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
          label={t("passwordLabel")}
          type="password"
          placeholder={t("passwordPlaceholder")}
          autoComplete="new-password"
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          icon={<Lock className="h-4.5 w-4.5" />}
        />
        <Input
          label={t("confirmPasswordLabel")}
          type="password"
          placeholder={t("confirmPasswordPlaceholder")}
          autoComplete="new-password"
          maxLength={128}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          icon={<Lock className="h-4.5 w-4.5" />}
        />
        <p className="-mt-2 text-xs text-muted">
          {t("passwordHint")}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("firstNameLabel")}
            value={firstName}
            maxLength={64}
            onChange={(e) =>
              setFirstName(sanitizeText(e.target.value, 64))
            }
            error={fieldErrors.firstName}
            placeholder={t("firstNamePlaceholder")}
            icon={<User className="h-4.5 w-4.5" />}
          />
          <Input
            label={t("lastNameLabel")}
            value={lastName}
            maxLength={64}
            onChange={(e) =>
              setLastName(sanitizeText(e.target.value, 64))
            }
            error={fieldErrors.lastName}
            placeholder={t("lastNamePlaceholder")}
          />
        </div>

        <PhoneInput
          value={phone}
          countryCode={country}
          onChange={setPhone}
          onCountryChange={setCountry}
          error={fieldErrors.phone}
        />

        <div className="relative">
          <CountryPicker
            value={country}
            onChange={(code) => {
              const national = extractNationalDigits(phone, country);
              setCountry(code);
              if (national) setPhone(buildPhoneValue(national, code));
            }}
            error={fieldErrors.country}
            id="complete-profile-country"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {t("finish")}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="rounded-xl glass p-4 space-y-3">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-muted">
          {t("otherOptions")}
        </p>
        <p className="text-xs text-muted">
          {t("otherOptionsDesc")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="normal-case tracking-normal"
            confirm={confirmPresets.useAnotherAccount}
            onClick={() => leaveForAuth("/login")}
          >
            <LogIn className="h-4 w-4" />
            {t("loginOther")}
          </Button>
          <Button
            type="button"
            variant="glass"
            size="md"
            className="normal-case tracking-normal"
            confirm={confirmPresets.useAnotherAccount}
            onClick={() => leaveForAuth("/register")}
          >
            <UserPlus className="h-4 w-4" />
            {t("createEmail")}
          </Button>
        </div>
      </div>
    </div>
  );
}
