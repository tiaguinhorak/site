"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_REQUEST_HEADER } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Tab = "url" | "upload";

export function ImagePicker({
  value,
  onChange,
  folder = "news",
  label = "Imagem de capa",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}) {
  const [tab, setTab] = useState<Tab>("url");
  const [urlInput, setUrlInput] = useState(value.startsWith("http") ? value : "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: { [API_REQUEST_HEADER]: "1" },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha no upload.");
        return;
      }
      onChange(data.url);
      setUrlInput(data.url);
    } catch {
      setError("Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
            tab === "url" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted",
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          URL
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
            tab === "upload" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted",
          )}
        >
          <Upload className="h-3.5 w-3.5" />
          Do PC
        </button>
      </div>

      {tab === "url" ? (
        <input
          type="url"
          placeholder="https://exemplo.com/imagem.jpg"
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
        />
      ) : (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="normal-case tracking-normal"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 motion-safe-spin" />
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                Selecionar arquivo
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted">JPG, PNG, WebP ou GIF · máx. 5 MB</p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

      {value && (
        <div className="relative mt-4 overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-40 w-full object-cover sm:h-48" />
          <button
            type="button"
            aria-label="Remover imagem"
            className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/80"
            onClick={() => {
              onChange("");
              setUrlInput("");
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
