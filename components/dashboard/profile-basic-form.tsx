"use client";

import { Mail, User, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CountryPicker } from "@/components/ui/country-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import type { UserProfile } from "@/lib/serializers";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { buildPhoneValue, extractNationalDigits } from "@/lib/profile/phone";
import {
  sanitizeNickname,
  sanitizeText,
} from "@/lib/security/sanitize";

type ProfileBasicFormProps = {
  profile: UserProfile;
  fieldErrors: Record<string, string>;
  saving: boolean;
  onChange: (updates: Partial<UserProfile>) => void;
  onSave?: () => void;
  hideSave?: boolean;
};

export function ProfileBasicForm({
  profile,
  fieldErrors,
  saving,
  onChange,
  onSave,
  hideSave = false,
}: ProfileBasicFormProps) {
  const t = useTranslations("profileForm");
  const confirmPresets = useConfirmPresets();
  const steamLocked = profile.steamLinked;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => e.preventDefault()}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("firstName")}
          icon={<User className="h-4 w-4" />}
          value={profile.firstName}
          maxLength={64}
          onChange={(e) =>
            onChange({ firstName: sanitizeText(e.target.value, 64) })
          }
          error={fieldErrors.firstName}
          placeholder={t("firstNamePlaceholder")}
        />
        <Input
          label={t("lastName")}
          value={profile.lastName}
          maxLength={64}
          onChange={(e) =>
            onChange({ lastName: sanitizeText(e.target.value, 64) })
          }
          error={fieldErrors.lastName}
          placeholder={t("lastNamePlaceholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label={t("nickname")}
            value={profile.nickname}
            maxLength={24}
            readOnly={steamLocked}
            disabled={steamLocked}
            onChange={(e) =>
              onChange({ nickname: sanitizeNickname(e.target.value) })
            }
            error={fieldErrors.nickname}
            placeholder="HENRY"
          />
          {steamLocked && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
              <Lock className="h-3 w-3" />
              {t("nicknameSteamLocked")}
            </p>
          )}
        </div>
        <div>
          <Input
            label={t("email")}
            type="email"
            icon={<Mail className="h-4 w-4" />}
            value={profile.email}
            maxLength={254}
            readOnly={steamLocked}
            disabled={steamLocked}
            onChange={(e) => onChange({ email: e.target.value })}
            error={fieldErrors.email}
            placeholder={t("emailPlaceholder")}
          />
          {steamLocked && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
              <Lock className="h-3 w-3" />
              {t("emailSteamLocked")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative">
          <CountryPicker
            value={profile.country}
            onChange={(code) => {
              const national = extractNationalDigits(profile.phone, profile.country);
              onChange({
                country: code,
                phone: national ? buildPhoneValue(national, code) : profile.phone,
              });
            }}
            error={fieldErrors.country}
          />
        </div>
        <div>
          <PhoneInput
            value={profile.phone}
            countryCode={profile.country}
            onChange={(phone) => onChange({ phone })}
            onCountryChange={(country) => onChange({ country })}
            error={fieldErrors.phone}
            hint={t("phoneHint")}
          />
        </div>
      </div>

      <Textarea
        label={t("bio")}
        value={profile.bio}
        onChange={(e) =>
          onChange({ bio: sanitizeText(e.target.value, 280) })
        }
        error={fieldErrors.bio}
        placeholder={t("bioPlaceholder")}
        maxLength={280}
        rows={4}
      />
      <p className="text-xs text-muted">
        {t("bioCounter", { count: profile.bio.length })}
        <a
          href={`/player/${profile.nickname}`}
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("publicProfile")}
        </a>
      </p>

      {!hideSave && (
        <div className="flex justify-end border-t border-border pt-6">
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={saving}
            confirm={confirmPresets.editProfile}
            onClick={onSave}
          >
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
