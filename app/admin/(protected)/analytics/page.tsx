import { AnalyticsPageClient } from "@/components/admin/AnalyticsPageClient";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Analytics</h1>
      <p className="text-sm text-slate-500">
        Visualize stock levels, consumption, and movement trends.
      </p>
      <div className="pt-4">
        <AnalyticsPageClient />
      </div>
    </div>
  );
}
