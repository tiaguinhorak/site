import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { isLocale, type Locale } from "@/lib/i18n";
import { requestLocale, jsonErrorKey } from "@/lib/i18n/api-route";
import {
  translateArticleBundle,
  translateText,
} from "@/lib/translation/auto-translate";

const bodySchema = z.object({
  title: z.string().max(500).optional(),
  excerpt: z.string().max(2000).optional(),
  body: z.string().max(50000).optional(),
  text: z.string().max(5000).optional(),
  source: z.enum(["pt-BR", "en", "es"]).optional(),
});

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "content-translate",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data);
  if (!parsed.success) {
    return jsonErrorKey(request, 400, "invalidPayload");
  }

  const userLocale = requestLocale(request);
  const sourceRaw = parsed.data.source;
  const source: Locale = isLocale(sourceRaw) ? sourceRaw : "pt-BR";

  if (userLocale === source) {
    return NextResponse.json({ ok: true, alreadyInLocale: true });
  }

  const { title, excerpt, body, text } = parsed.data;

  if (title !== undefined || excerpt !== undefined || body !== undefined) {
    const bundle = await translateArticleBundle(
      title ?? "",
      excerpt ?? "",
      body ?? "",
      userLocale,
      source,
    );
    return NextResponse.json({
      ok: true,
      targetLocale: userLocale,
      translation: bundle,
    });
  }

  if (text?.trim()) {
    const translated = await translateText(text, userLocale, source);
    return NextResponse.json({
      ok: true,
      targetLocale: userLocale,
      text: translated,
    });
  }

  return jsonErrorKey(request, 400, "noContentToTranslate");
}
