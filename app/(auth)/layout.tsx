import { Navbar } from "@/components/layout/navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar variant="auth" />
      <main className="relative">{children}</main>
    </>
  );
}
