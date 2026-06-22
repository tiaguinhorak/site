import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  translateArticleBundle,
  translateText,
} from "@/lib/translation/auto-translate";

const bodySchema = z.object({
  title: z.string().max(500).optional(),
  excerpt: z.string().max(2000).optional(),
  body: z.string().max(50000).optional(),
  text: z.string().max(5000).optional(),
  target: z.enum(["en", "es"]),
  source: z.enum(["pt-BR", "en", "es"]).optional().default("pt-BR"),
});

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "admin-translate",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { error: adminError } = await requireAdmin(request);
  if (adminError) return adminError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { title, excerpt, body, text, target, source } = parsed.data;
  const sourceLocale = isLocale(source) ? source : "pt-BR";

  if (title !== undefined || excerpt !== undefined || body !== undefined) {
    const bundle = await translateArticleBundle(
      title ?? "",
      excerpt ?? "",
      body ?? "",
      target,
    );
    return NextResponse.json({ ok: true, translation: bundle });
  }

  if (text) {
    const translated = await translateText(text, target, sourceLocale);
    return NextResponse.json({ ok: true, text: translated });
  }

  return NextResponse.json({ error: "No content to translate." }, { status: 400 });
}
