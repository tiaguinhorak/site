"use client";

import { useCallback, useState } from "react";
import type { SkinPreviewData } from "@/components/skins/skin-preview-modal";

export function useSkinPreview() {
  const [previewSkin, setPreviewSkin] = useState<SkinPreviewData | null>(null);
  const openPreview = useCallback((skin: SkinPreviewData) => setPreviewSkin(skin), []);
  const closePreview = useCallback(() => setPreviewSkin(null), []);

  return {
    previewSkin,
    openPreview,
    closePreview,
    isPreviewOpen: previewSkin !== null,
  };
}
