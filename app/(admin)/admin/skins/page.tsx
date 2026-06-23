import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCatalogTabs } from "@/components/admin/admin-catalog-tabs";

export default function AdminSkinsPage() {
  return (
    <AdminShell>
      <div className="py-8">
        <AdminCatalogTabs />
      </div>
    </AdminShell>
  );
}
