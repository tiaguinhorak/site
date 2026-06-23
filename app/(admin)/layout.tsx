import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getServerSessionUser } from "@/lib/auth/server-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login?from=/admin");
  }
  if (!user.isAdmin) {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
