import { DashboardPageClient } from "@/components/admin/DashboardPageClient";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Dashboard</h1>
      <p className="text-sm text-slate-500">
        Overview of stock health and items that need attention.
      </p>
      <div className="pt-4">
        <DashboardPageClient />
      </div>
    </div>
  );
}
