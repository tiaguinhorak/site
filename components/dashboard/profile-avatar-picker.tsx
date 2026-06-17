"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SteamIcon } from "@/components/ui/icons";
import { confirmPresets } from "@/lib/confirm-presets";
import { getAvatarInitials } from "@/lib/profile";
import { avatarPresets } from "@/lib/profile/avatar-presets";
import { compressImageFile } from "@/lib/client/compress-image";
import { secureApi } from "@/lib/api/client";
import type { UserProfile } from "@/lib/serializers";
import { API_REQUEST_HEADER, SITE_NAME } from "@/lib/brand";
import { ALLOWED_AVATAR_TYPES } from "@/lib/security/constants";
import { cn } from "@/lib/utils";

type ProfileAvatarPickerProps = {
  profile: UserProfile;
  onUpdated: (user: UserProfile) => void;
};

export function ProfileAvatarPicker({ profile, onUpdated }: ProfileAvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const initials = getAvatarInitials(
    profile.firstName,
    profile.lastName,
    profile.nickname,
  );

  async function applySource(
    body: { source: "steam" } | { source: "preset"; presetId: string },
  ) {
    setError(null);
    const result = await secureApi<{ user: UserProfile }>("/api/profile/avatar", {
      method: "PATCH",
      json: body,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdated(result.data.user);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const formData = new FormData();
      formData.append("file", compressed, "avatar.webp");

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: { [API_REQUEST_HEADER]: "1" },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Falha ao enviar foto.");
        return;
      }
      if (data.user) onUpdated(data.user);
    } catch {
      setError("Não foi possível processar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    const result = await secureApi<{ user: UserProfile }>("/api/profile/avatar", {
      method: "DELETE",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdated(result.data.user);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60"
            aria-label="Alterar foto de perfil"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-3xl font-bold text-white">
                {initials}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="text-center sm:text-left">
          <p className="font-display text-sm font-semibold text-foreground">
            Foto de perfil
          </p>
          <p className="mt-1 text-xs text-muted">
            Upload comprimido automaticamente (WebP, até 256px). Ou escolha um avatar {SITE_NAME}.
          </p>
          {profile.avatarSource === "steam" && profile.steamLinked && (
            <p className="mt-1 text-xs text-primary">Usando foto da Steam</p>
          )}
          {error && (
            <p className="mt-2 text-xs text-rose-400" role="alert">{error}</p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {uploading ? "Enviando..." : "Upload"}
            </Button>
            {profile.steamLinked && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => applySource({ source: "steam" })}
              >
                <SteamIcon className="h-4 w-4" />
                Usar Steam
              </Button>
            )}
            {(profile.customAvatarUrl || profile.avatarPreset) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                confirm={confirmPresets.removeAvatar}
                disabled={uploading}
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted">
          Avatares {SITE_NAME}
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {avatarPresets.map((preset) => {
            const active = profile.avatarPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                disabled={uploading}
                onClick={() =>
                  applySource({ source: "preset", presetId: preset.id })
                }
                className={cn(
                  "relative h-12 w-12 overflow-hidden rounded-xl border-2 transition-all hover:scale-105",
                  active
                    ? "border-primary ring-2 ring-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
                    : "border-transparent",
                )}
              >
                <div
                  className={cn(
                    "h-full w-full bg-gradient-to-br",
                    preset.gradient,
                  )}
                />
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="h-4 w-4 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
