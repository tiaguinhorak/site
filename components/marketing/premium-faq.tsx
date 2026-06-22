import { getTranslations } from "next-intl/server";

export async function PremiumFaq() {
  const t = await getTranslations("premiumFaq");
  const faqs = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
  ];
  return (
    <div className="mt-12 rounded-card glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-foreground">
        {t("title")}
      </h2>
      <ul className="mt-6 divide-y divide-border">
        {faqs.map((faq) => (
          <li key={faq.q} className="py-4 first:pt-0 last:pb-0">
            <h3 className="font-display text-sm font-semibold text-foreground">
              {faq.q}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{faq.a}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
