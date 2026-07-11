import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </AdminAuthGuard>
  );
}
