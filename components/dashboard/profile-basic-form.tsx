"use client";

import { Mail, Phone, User, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CountryPicker } from "@/components/ui/country-picker";
import type { UserProfile } from "@/lib/serializers";
import { confirmPresets } from "@/lib/confirm-presets";
import { getCountry } from "@/lib/profile/countries";
import {
  formatPhoneBR,
  sanitizeNickname,
  sanitizeText,
} from "@/lib/security/sanitize";

type ProfileBasicFormProps = {
  profile: UserProfile;
  fieldErrors: Record<string, string>;
  saving: boolean;
  onChange: (updates: Partial<UserProfile>) => void;
  onSave: () => void;
};

export function ProfileBasicForm({
  profile,
  fieldErrors,
  saving,
  onChange,
  onSave,
}: ProfileBasicFormProps) {
  const steamLocked = profile.steamLinked;
  const dial = getCountry(profile.country)?.dial ?? "+55";

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => e.preventDefault()}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nome"
          icon={<User className="h-4 w-4" />}
          value={profile.firstName}
          maxLength={64}
          onChange={(e) =>
            onChange({ firstName: sanitizeText(e.target.value, 64) })
          }
          error={fieldErrors.firstName}
          placeholder="Seu nome"
        />
        <Input
          label="Sobrenome"
          value={profile.lastName}
          maxLength={64}
          onChange={(e) =>
            onChange({ lastName: sanitizeText(e.target.value, 64) })
          }
          error={fieldErrors.lastName}
          placeholder="Seu sobrenome"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Nickname (in-game)"
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
              Definido pela Steam — não editável
            </p>
          )}
        </div>
        <div>
          <Input
            label="E-mail"
            type="email"
            icon={<Mail className="h-4 w-4" />}
            value={profile.email}
            maxLength={254}
            readOnly={steamLocked}
            disabled={steamLocked}
            onChange={(e) => onChange({ email: e.target.value })}
            error={fieldErrors.email}
            placeholder="voce@exemplo.com"
          />
          {steamLocked && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
              <Lock className="h-3 w-3" />
              Vinculado à conta Steam
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative">
          <CountryPicker
            value={profile.country}
            onChange={(code) => onChange({ country: code })}
            error={fieldErrors.country}
          />
        </div>
        <div>
          <Input
            label="Telefone"
            type="tel"
            icon={<Phone className="h-4 w-4" />}
            value={profile.phone}
            onChange={(e) =>
              onChange({ phone: formatPhoneBR(e.target.value) })
            }
            error={fieldErrors.phone}
            placeholder={`${dial} (11) 98765-4321`}
          />
          <p className="mt-1.5 text-xs text-muted">
            Privado — não aparece no perfil público
          </p>
        </div>
      </div>

      <Textarea
        label="Bio pública"
        value={profile.bio}
        onChange={(e) =>
          onChange({ bio: sanitizeText(e.target.value, 280) })
        }
        error={fieldErrors.bio}
        placeholder="Fale sobre seu estilo de jogo, modos favoritos..."
        maxLength={280}
        rows={4}
      />
      <p className="text-xs text-muted">
        {profile.bio.length}/280 · visível no{" "}
        <a
          href={`/player/${profile.nickname}`}
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          perfil público
        </a>
      </p>

      <div className="flex justify-end border-t border-border pt-6">
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={saving}
          confirm={confirmPresets.editProfile}
          onClick={onSave}
        >
          {saving ? "Salvando..." : "Salvar informações"}
        </Button>
      </div>
    </form>
  );
}
