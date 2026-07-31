"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { UserActivityChart } from "@/components/admin/UserActivityChart";
import { WeeklyItemUsageChart } from "@/components/admin/WeeklyItemUsageChart";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { fetchAnalytics, type AnalyticsResponse } from "@/lib/api-client";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";

const RANGE_OPTIONS = [
  { label: "Today", value: 0 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
] as const;

export function AnalyticsPageClient() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const headers = await getFirebaseAuthHeader();
        const analytics = await fetchAnalytics(days, headers);
        setData(analytics);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load analytics");
        setData(null);
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
        <>
          <AnalyticsCharts
            categories={data.categories ?? []}
            dailyTopByCategory={data.dailyTopByCategory ?? {}}
            topStockIn={data.topStockIn}
            periodComparison={
              data.periodComparison ?? {
                currentFrom: "",
                currentTo: "",
                previousFrom: "",
                previousTo: "",
                points: [],
              }
            }
          />

          <WeeklyItemUsageChart
            days={days <= 0 ? 7 : days}
            inventoryOptions={data.inventoryOptions ?? []}
            itemUsageSeries={
              data.itemUsageSeries ?? {
                itemIds: [],
                itemNames: {},
                points: [],
              }
            }
          />
        </>
      )}

      {!loading && data && (
        <UserActivityChart
          data={data.userActivity ?? { users: [], points: [] }}
        />
      )}
    </div>
  );
}
