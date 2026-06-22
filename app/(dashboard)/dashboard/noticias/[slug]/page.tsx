import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { NewsArticleDetail } from "@/components/dashboard/news-article-detail";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function NoticiaDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("pageHeaders");

  return (
    <DashboardPageShell title={t("newsTitle")} description={t("newsDesc")}>
      <NewsArticleDetail slug={slug} />
    </DashboardPageShell>
  );
}
