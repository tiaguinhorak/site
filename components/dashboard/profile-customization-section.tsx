"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Crown, ImageIcon, Loader2, Palette, Sparkles, Upload, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { ProfileCustomizationHero } from "@/components/profile/profile-customization-hero";
import { ProfileDisplayName } from "@/components/profile/profile-display-name";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { PlanBadge } from "@/components/profile/plan-badge";
import { ProfileColorPicker } from "@/components/profile/profile-color-picker";
import {
  PROFILE_BACKGROUNDS,
  PROFILE_BORDERS,
  PROFILE_FRAMES,
  PROFILE_THEMES,
  DEFAULT_OVERLAY_HOLE_RATIO,
  DEFAULT_OVERLAY_CORNER,
  DEFAULT_OVERLAY_CORNER_SCALE,
  isOverlayFrameId,
  type ProfileCustomizationState,
} from "@/lib/profile/customization-presets";
import { notifyProfileCustomizationChanged } from "@/lib/profile/customization-events";
import {
  extractCustomizationState,
  resolvePublicCustomization,
  type PublicProfileCustomization,
} from "@/lib/profile/serialize-customization";
import { ImageCropModal, type ImageCropSource } from "@/components/ui/image-crop-modal";
import { GifPreviewModal } from "@/components/ui/gif-preview-modal";
import { secureApi, secureFormApi } from "@/lib/api/client";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type CustomizationResponse = {
  isElite: boolean;
  isAdmin: boolean;
  customization: PublicProfileCustomization | null;
};

export function ProfileCustomizationSection() {
  const t = useTranslations("profileCustomization");
  const tCrop = useTranslations("mediaCrop");
  const { user, patchUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBannerGif, setUploadingBannerGif] = useState(false);
  const [uploadingGif, setUploadingGif] = useState(false);
  const [bannerCropSource, setBannerCropSource] = useState<ImageCropSource | null>(null);
  const [gifPreviewFile, setGifPreviewFile] = useState<File | null>(null);
  const [bannerGifPreviewFile, setBannerGifPreviewFile] = useState<File | null>(null);
  const [isElite, setIsElite] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, setState] = useState<ProfileCustomizationState | null>(null);
  const stateRef = useRef<ProfileCustomizationState | null>(null);

  const applyCustomization = useCallback(
    (payload: CustomizationResponse) => {
      setIsElite(payload.isElite);
      setIsAdmin(payload.isAdmin);
      const nextState = payload.customization
        ? extractCustomizationState(payload.customization)
        : null;
      setState(nextState);
      stateRef.current = nextState;
      if (payload.customization) {
        patchUser({ customization: payload.customization });
        notifyProfileCustomizationChanged(payload.customization);
      }
    },
    [patchUser],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/profile/customization", { credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as CustomizationResponse;
      applyCustomization(data);
    }
    setLoading(false);
  }, [applyCustomization]);

  useEffect(() => {
    if (user?.customization && user.plan === "elite") {
      const nextState = extractCustomizationState(user.customization);
      setState(nextState);
      stateRef.current = nextState;
      setIsElite(true);
      setIsAdmin(user.isAdmin);
      setLoading(false);
      return;
    }
    void load();
  }, [load, user?.customization, user?.isAdmin, user?.plan]);

  const display = useMemo(
    () => (state ? resolvePublicCustomization("elite", state, { isAdmin }) : null),
    [state, isAdmin],
  );

  async function save(patch: Partial<ProfileCustomizationState>) {
    if (!isElite || !stateRef.current) return;
    const merged = { ...stateRef.current, ...patch };
    stateRef.current = merged;
    setState(merged);

    setSaving(true);
    const result = await secureApi<CustomizationResponse & { ok: true }>(
      "/api/profile/customization",
      { method: "PATCH", json: patch },
    );
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      void load();
      return;
    }
    applyCustomization(result.data);
    toast.success(t("saved"));
  }

  async function uploadBannerBlob(blob: Blob) {
    setUploadingBanner(true);
    const form = new FormData();
    form.append("file", blob, "banner.webp");
    const result = await secureFormApi<{ ok: true; url: string }>(
      "/api/profile/banner",
      form,
      { method: "POST" },
    );
    setUploadingBanner(false);
    if (!result.ok) {
      toast.error(result.error ?? t("uploadError"));
      return;
    }
    toast.success(t("bannerUploaded"));
    void load();
  }

  async function uploadBannerGifFile(file: File) {
    setUploadingBannerGif(true);
    const form = new FormData();
    form.set("file", file);
    const result = await secureFormApi<{ ok: true; url: string; moderationStatus: string }>(
      "/api/profile/banner/gif",
      form,
      { method: "POST" },
    );
    setUploadingBannerGif(false);
    if (!result.ok) {
      toast.error(result.error ?? t("uploadError"));
      return;
    }
    toast.success(
      result.data.moderationStatus === "APPROVED"
        ? t("bannerGifApproved")
        : t("bannerGifPending"),
    );
    void load();
  }

  async function uploadGifFile(file: File) {
    setUploadingGif(true);
    const form = new FormData();
    form.set("file", file);
    const result = await secureFormApi<{ ok: true; url: string; moderationStatus: string }>(
      "/api/profile/avatar/gif",
      form,
      { method: "POST" },
    );
    setUploadingGif(false);
    if (!result.ok) {
      toast.error(result.error ?? t("uploadError"));
      return;
    }
    toast.success(t("gifPending"));
    void load();
  }

  const isStaticBanner = state?.profileBannerMediaType !== "GIF";
  const visibleFrames = PROFILE_FRAMES.filter((row) => !row.adminOnly || isAdmin);

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isElite) {
    return (
      <section className="rounded-card glass-strong p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
            <Crown className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{t("eliteTitle")}</h2>
            <p className="mt-2 max-w-lg text-sm text-muted">{t("eliteDesc")}</p>
          </div>
          <PlanBadge plan="elite" size="lg" />
          <ButtonLink href="/dashboard/planos" variant="primary">
            {t("upgradeElite")}
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
          <Sparkles className="h-5 w-5 text-amber-400" />
          {t("previewTitle")}
        </h2>
        <ProfileCustomizationHero
          customization={display}
          contentClassName="p-5 sm:p-6"
          ownerPreview
          priority
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <UserProfileAvatar
              avatarUrl={user.avatarUrl}
              nickname={user.nickname}
              customization={display}
              size="lg"
              priority
            />
            <div>
              <ProfileDisplayName
                nickname={user.nickname}
                displayName={user.displayName}
                plan={user.plan}
                customization={display}
                nameClassName="font-display text-2xl font-bold text-foreground"
              />
              {state?.avatarModerationStatus === "PENDING" && (
                <p className="mt-2 text-xs text-amber-400">{t("gifModerationPending")}</p>
              )}
              {state?.profileBannerModerationStatus === "PENDING" &&
                state.profileBannerMediaType === "GIF" && (
                  <p className="mt-2 text-xs text-amber-400">{t("bannerGifModerationPending")}</p>
                )}
            </div>
          </div>
        </ProfileCustomizationHero>
      </section>

      <section className="rounded-card glass p-4 sm:p-6">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <ImageIcon className="h-4 w-4 text-primary" />
          {t("bannerTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">{t("bannerDesc")}</p>
        <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
          {t("bannerGifModerationPolicy")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-black/10">
            <Upload className="h-4 w-4" />
            {uploadingBanner ? t("uploading") : t("uploadBanner")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploadingBanner || uploadingBannerGif}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setBannerCropSource({ kind: "file", file });
                e.target.value = "";
              }}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-black/10">
            <Upload className="h-4 w-4" />
            {uploadingBannerGif ? t("uploading") : t("uploadBannerGif")}
            <input
              type="file"
              accept="image/gif"
              className="sr-only"
              disabled={uploadingBanner || uploadingBannerGif}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setBannerGifPreviewFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {state?.profileBannerUrl && isStaticBanner && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingBanner}
                onClick={() => {
                  const base = state.profileBannerUrl!.split("?")[0];
                  setBannerCropSource({
                    kind: "url",
                    url: `${base}?v=${Date.now()}`,
                  });
                }}
              >
                {t("editBanner")}
              </Button>
            </>
          )}
          {state?.profileBannerUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await secureApi("/api/profile/banner", { method: "DELETE" });
                void load();
              }}
            >
              {t("removeBanner")}
            </Button>
          )}
        </div>
        {state?.profileBannerMediaType === "GIF" && (
          <p className="mt-3 text-xs text-muted">{t("bannerGifDesc")}</p>
        )}
      </section>

      <section className="rounded-card glass p-4 sm:p-6">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <Wand2 className="h-4 w-4 text-primary" />
          {t("gifAvatarTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">{t("gifAvatarDesc")}</p>
        <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
          {t("gifModerationPolicy")}
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-black/10">
          <Upload className="h-4 w-4" />
          {uploadingGif ? t("uploading") : t("uploadGif")}
          <input
            type="file"
            accept="image/gif"
            className="sr-only"
            disabled={uploadingGif}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setGifPreviewFile(file);
            }}
          />
        </label>
      </section>

      <PresetGrid
        title={t("backgroundTitle")}
        description={t("backgroundColorDesc")}
        options={PROFILE_BACKGROUNDS.map((row) => ({
          id: row.id,
          label: t(row.labelKey),
          preview: <div className={cn("h-10 w-full rounded-lg", row.previewClass)} />,
        }))}
        value={state?.profileBackgroundId ?? "default"}
        onChange={(id) => void save({ profileBackgroundId: id })}
        saving={saving}
        colorPicker={
          <ProfileColorPicker
            value={state?.profileBackgroundColor ?? null}
            onChange={(color) => void save({ profileBackgroundColor: color })}
            defaultLabel={t("colorDefault")}
            invalidMessage={t("colorCustomInvalid")}
            pickerLabel={t("colorCustomPicker")}
            hexLabel={t("colorCustomHex")}
            disabled={saving}
          />
        }
      />

      <PresetGrid
        title={t("frameTitle")}
        description={t("frameDesc")}
        options={visibleFrames.map((row) => ({
          id: row.id,
          label: t(row.labelKey),
          preview: row.overlayAsset ? (
            row.overlayLayout === "wrap" ? (
              (() => {
                const outer = 40;
                const inner = Math.round(outer * (row.overlayHoleRatio ?? DEFAULT_OVERLAY_HOLE_RATIO));
                return (
                  <div
                    className="relative mx-auto flex items-center justify-center"
                    style={{ width: outer, height: outer }}
                  >
                    <div
                      className="absolute z-0 rounded-[3px] bg-zinc-700/60"
                      style={{ width: inner, height: inner }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.overlayAsset}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      style={{ mixBlendMode: row.overlayBlendMode ?? "screen" }}
                    />
                  </div>
                );
              })()
            ) : row.overlayLayout === "corner" ? (
              (() => {
                const corner = row.overlayCorner ?? DEFAULT_OVERLAY_CORNER;
                const scale = row.overlayCornerScale ?? DEFAULT_OVERLAY_CORNER_SCALE;
                const cornerClass =
                  corner === "top-left"
                    ? "top-0 left-0"
                    : corner === "top-right"
                      ? "top-0 right-0"
                      : corner === "bottom-right"
                        ? "bottom-0 right-0"
                        : "bottom-0 left-0";
                return (
                  <div className="relative mx-auto h-10 w-10 overflow-hidden rounded-lg bg-zinc-900/80">
                    <div className="absolute inset-0 bg-zinc-700/50" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.overlayAsset}
                      alt=""
                      className={cn(
                        "pointer-events-none absolute object-contain",
                        cornerClass,
                      )}
                      style={{
                        width: `${scale * 100}%`,
                        height: `${scale * 100}%`,
                        mixBlendMode: row.overlayBlendMode ?? "screen",
                      }}
                    />
                  </div>
                );
              })()
            ) : (
              <div className="relative mx-auto h-10 w-10 overflow-hidden rounded-lg bg-zinc-900/80">
                <div className="absolute inset-0 bg-zinc-700/50" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.overlayAsset}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  style={{ mixBlendMode: row.overlayBlendMode ?? "screen" }}
                />
              </div>
            )
          ) : row.isRainbow ? (
            <div
              className="profile-frame-rainbow profile-frame-rainbow-preview mx-auto h-10 w-10 rounded-lg"
              data-motion-safe
            >
              <div className="profile-frame-rainbow-inner rounded-[4px] bg-zinc-900/90" />
            </div>
          ) : (
            <div
              className="mx-auto box-border h-10 w-10 rounded-lg border-2 bg-zinc-900/80"
              style={{
                borderColor: row.previewBorderColor,
                boxShadow: row.previewGlow,
              }}
            />
          ),
        }))}
        value={state?.profileFrameId ?? "none"}
        onChange={(id) => void save({ profileFrameId: id })}
        saving={saving}
        colorPicker={
          state?.profileFrameId !== "none" &&
          state?.profileFrameId !== "admin-rainbow" &&
          !isOverlayFrameId(state?.profileFrameId ?? "none") ? (
            <ProfileColorPicker
              value={state?.profileFrameColor ?? null}
              onChange={(color) => void save({ profileFrameColor: color })}
              defaultLabel={t("colorDefault")}
              invalidMessage={t("colorCustomInvalid")}
              pickerLabel={t("colorCustomPicker")}
              hexLabel={t("colorCustomHex")}
              disabled={saving}
            />
          ) : (
            <p className="mt-4 text-xs text-muted">{t("frameColorUnavailable")}</p>
          )
        }
      />

      <PresetGrid
        title={t("themeTitle")}
        description={t("themeDesc")}
        options={PROFILE_THEMES.map((row) => ({
          id: row.id,
          label: t(row.labelKey),
          preview: (
            <div
              className="h-10 w-full rounded-lg"
              style={{ background: row.heroGradient }}
            />
          ),
        }))}
        value={state?.profileThemeId ?? "aurora"}
        onChange={(id) => void save({ profileThemeId: id })}
        saving={saving}
        colorPicker={
          <ProfileColorPicker
            value={state?.profileThemeColor ?? null}
            onChange={(color) => void save({ profileThemeColor: color })}
            defaultLabel={t("colorDefault")}
            invalidMessage={t("colorCustomInvalid")}
            pickerLabel={t("colorCustomPicker")}
            hexLabel={t("colorCustomHex")}
            disabled={saving}
          />
        }
      />

      <PresetGrid
        title={t("borderTitle")}
        description={t("borderDesc")}
        options={PROFILE_BORDERS.map((row) => ({
          id: row.id,
          label: t(row.labelKey),
          preview: (
            <div
              className="box-border h-10 w-full rounded-lg border-2 bg-zinc-900/60"
              style={{
                borderColor: row.previewBorderColor,
                boxShadow: row.previewGlow,
              }}
            />
          ),
        }))}
        value={state?.profileBorderId ?? "none"}
        onChange={(id) => void save({ profileBorderId: id })}
        saving={saving}
        colorPicker={
          state?.profileBorderId !== "none" ? (
            <ProfileColorPicker
              value={state?.profileBorderColor ?? null}
              onChange={(color) => void save({ profileBorderColor: color })}
              defaultLabel={t("colorDefault")}
              invalidMessage={t("colorCustomInvalid")}
              pickerLabel={t("colorCustomPicker")}
              hexLabel={t("colorCustomHex")}
              disabled={saving}
            />
          ) : (
            <p className="mt-4 text-xs text-muted">{t("borderColorUnavailable")}</p>
          )
        }
      />

      <section className="rounded-card glass p-4 sm:p-6">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <Palette className="h-4 w-4 text-primary" />
          {t("accentTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">{t("accentDesc")}</p>
        <ProfileColorPicker
          value={state?.profileAccentColor ?? null}
          onChange={(color) => void save({ profileAccentColor: color })}
          defaultLabel={t("accentDefault")}
          invalidMessage={t("colorCustomInvalid")}
          pickerLabel={t("colorCustomPicker")}
          hexLabel={t("colorCustomHex")}
          disabled={saving}
        />
      </section>

      <section className="rounded-card glass p-4 sm:p-6">
        <h3 className="font-display font-bold">{t("badgesTitle")}</h3>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={state?.profileShowPlanBadge ?? true}
              onChange={(e) => void save({ profileShowPlanBadge: e.target.checked })}
            />
            {t("showPlanBadge")}
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={state?.profileShowAchievements ?? true}
              onChange={(e) => void save({ profileShowAchievements: e.target.checked })}
            />
            {t("showAchievements")}
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <PlanBadge plan="free" />
          <PlanBadge plan="premium" />
          <PlanBadge plan="elite" />
        </div>
      </section>
    </div>
      <ImageCropModal
        open={Boolean(bannerCropSource)}
        source={bannerCropSource}
        aspect="banner"
        title={tCrop("bannerTitle")}
        description={tCrop("bannerDesc")}
        onClose={() => setBannerCropSource(null)}
        onConfirm={async (blob) => {
          await uploadBannerBlob(blob);
        }}
      />
      <GifPreviewModal
        open={Boolean(gifPreviewFile)}
        file={gifPreviewFile}
        nickname={user.nickname}
        customization={display}
        onClose={() => setGifPreviewFile(null)}
        onConfirm={async (file) => {
          await uploadGifFile(file);
        }}
      />
      <GifPreviewModal
        open={Boolean(bannerGifPreviewFile)}
        file={bannerGifPreviewFile}
        nickname={user.nickname}
        customization={display}
        variant="banner"
        onClose={() => setBannerGifPreviewFile(null)}
        onConfirm={async (file) => {
          await uploadBannerGifFile(file);
        }}
      />
    </>
  );
}

function PresetGrid({
  title,
  description,
  options,
  value,
  onChange,
  saving,
  colorPicker,
}: {
  title: string;
  description?: string;
  options: { id: string; label: string; preview: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
  saving: boolean;
  colorPicker?: ReactNode;
}) {
  return (
    <section className="rounded-card glass p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-bold">{title}</h3>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {saving && <Loader2 className="h-4 w-4 motion-safe-spin text-primary" />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              value === option.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40",
            )}
          >
            {option.preview}
            <p className="mt-2 text-xs font-medium">{option.label}</p>
          </button>
        ))}
      </div>
      {colorPicker}
    </section>
  );
}
