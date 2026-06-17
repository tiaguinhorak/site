import { NextResponse } from "next/server";
import { getNewsArticles } from "@/lib/queries";

export async function GET() {
  const articles = await getNewsArticles();
  return NextResponse.json({
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      date: a.publishedAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      imageAccent: a.imageAccent,
      imageUrl: a.imageUrl ?? undefined,
      featured: a.featured,
    })),
  });
}
