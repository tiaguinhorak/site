import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { RouteKey } from "@/components/layout/route-key";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="relative">
        <RouteKey>{children}</RouteKey>
      </main>
      <Footer />
    </>
  );
}
