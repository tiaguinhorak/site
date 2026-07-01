import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/admin-shell";
import { SESSION_COOKIE } from "@/lib/security/constants";
import { verifySessionToken } from "@/lib/security/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login?from=/admin");
  }
  if (!session.isAdmin) {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
