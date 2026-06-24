import { Navbar } from "@/components/layout/navbar";
import { RouteKey } from "@/components/layout/route-key";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar variant="auth" />
      <main className="relative">
        <RouteKey>{children}</RouteKey>
      </main>
    </>
  );
}
