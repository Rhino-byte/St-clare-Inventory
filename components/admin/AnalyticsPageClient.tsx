"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminDailyStockSection } from "@/components/admin/AdminDailyStockSection";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { UserActivityChart } from "@/components/admin/UserActivityChart";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { fetchAnalytics } from "@/lib/api-client";
import type { UserActivitySeries } from "@/lib/analytics";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";
import { todayDateKey } from "@/lib/dates";

const RANGE_OPTIONS = [
  { label: "Today", value: 0 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
] as const;

export function AnalyticsPageClient() {
  const [days, setDays] = useState(30);
  const [selectedDate, setSelectedDate] = useState(() => todayDateKey());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    categoryStock: Array<{ category: string; stock: number }>;
    topConsumed: Array<{ itemId: string; itemName: string; quantity: number }>;
    userActivity: UserActivitySeries;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const headers = await getFirebaseAuthHeader();
        const analytics = await fetchAnalytics(days, headers);
        setData({
          categoryStock: analytics.categoryStock,
          topConsumed: analytics.topConsumed,
          userActivity: analytics.userActivity ?? { users: [], points: [] },
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={days === option.value ? "default" : "outline"}
            onClick={() => setDays(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {loading || !data ? (
        <LoadingState
          label="Loading analytics"
          layout="centered"
          className="min-h-[40vh]"
        />
      ) : (
        <AnalyticsCharts
          categoryStock={data.categoryStock}
          topConsumed={data.topConsumed}
        />
      )}

      <AdminDailyStockSection
        date={selectedDate}
        onDateChange={setSelectedDate}
      />

      {!loading && data && <UserActivityChart data={data.userActivity} />}
    </div>
  );
}
