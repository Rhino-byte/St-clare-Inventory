"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { Button } from "@/components/ui/button";
import { fetchAnalytics } from "@/lib/api-client";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";

export function AnalyticsPageClient() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    categoryStock: Array<{ category: string; stock: number }>;
    topConsumed: Array<{ itemId: string; itemName: string; quantity: number }>;
    dailyMovement: Array<{ date: string; in: number; out: number }>;
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
          dailyMovement: analytics.dailyMovement,
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
        {[7, 30, 90].map((value) => (
          <Button
            key={value}
            variant={days === value ? "default" : "outline"}
            onClick={() => setDays(value)}
          >
            Last {value} days
          </Button>
        ))}
      </div>

      {loading || !data ? (
        <p className="text-sm text-slate-500">Loading analytics...</p>
      ) : (
        <AnalyticsCharts
          categoryStock={data.categoryStock}
          topConsumed={data.topConsumed}
          dailyMovement={data.dailyMovement}
        />
      )}
    </div>
  );
}
