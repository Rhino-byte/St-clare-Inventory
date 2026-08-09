"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminDailyStockSection } from "@/components/admin/AdminDailyStockSection";
import { DestinationBreakdownChart } from "@/components/admin/DestinationBreakdownChart";
import { InOutMovementChart } from "@/components/admin/InOutMovementChart";
import { ItemUsageCompareChart } from "@/components/admin/ItemUsageCompareChart";
import { PeriodComparisonChart } from "@/components/admin/PeriodComparisonChart";
import { StockHealthCards } from "@/components/admin/StockHealthCards";
import { TopUsedDailyChart } from "@/components/admin/TopUsedDailyChart";
import { UserActivityChart } from "@/components/admin/UserActivityChart";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { ALL_DESTINATION } from "@/lib/analytics";
import { fetchAnalytics, type AnalyticsResponse } from "@/lib/api-client";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";
import { todayDateKey } from "@/lib/dates";
import { STOCK_DESTINATIONS } from "@/lib/types";

const RANGE_OPTIONS = [
  { label: "Today", value: 0 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
] as const;

const selectClassName =
  "flex h-10 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

export function AnalyticsPageClient() {
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState("");
  const [destination, setDestination] = useState(ALL_DESTINATION);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => todayDateKey());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const headers = await getFirebaseAuthHeader();
        const analytics = await fetchAnalytics(days, headers, {
          category: category || undefined,
          destination,
        });
        setData(analytics);
        setCategories(analytics.categories ?? []);
        if (!category && analytics.category) {
          setCategory(analytics.category);
        } else if (
          category &&
          analytics.categories?.length &&
          !analytics.categories.includes(category)
        ) {
          setCategory(analytics.category || analytics.categories[0] || "");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load analytics"
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days, category, destination]);

  const scopeLabel = [
    category || "Category",
    destination === ALL_DESTINATION ? "All destinations" : destination,
  ].join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
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

        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label htmlFor="analytics-category">Category</Label>
            <select
              id="analytics-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={selectClassName}
              disabled={!categories.length}
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="analytics-destination">Destination</Label>
            <select
              id="analytics-destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className={selectClassName}
            >
              <option value={ALL_DESTINATION}>All</option>
              {STOCK_DESTINATIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || !data ? (
        <LoadingState
          label="Loading analytics"
          layout="centered"
          className="min-h-[40vh]"
        />
      ) : (
        <>
          <StockHealthCards
            health={
              data.stockHealth ?? {
                totalItems: 0,
                lowStockCount: 0,
                outOfStockCount: 0,
                atOrBelowReorder: 0,
              }
            }
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <InOutMovementChart
              data={data.dailyMovement ?? []}
              subtitle={`${scopeLabel}. Destination filter applies to stock-out only.`}
            />
            <DestinationBreakdownChart
              data={data.destinationTotals ?? []}
              destinationFilter={destination}
              subtitle={`Stock-out by destination in ${category || "category"}.`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopUsedDailyChart
              series={
                data.topUsed ?? {
                  topItems: [],
                  points: [],
                }
              }
              subtitle={`Daily stock-out for top items · ${scopeLabel}.`}
            />
            <PeriodComparisonChart
              data={
                data.periodComparison ?? {
                  currentFrom: "",
                  currentTo: "",
                  previousFrom: "",
                  previousTo: "",
                  points: [],
                }
              }
              subtitle={`Current (${data.periodComparison?.currentFrom} → ${data.periodComparison?.currentTo}) vs previous (${data.periodComparison?.previousFrom} → ${data.periodComparison?.previousTo}) · ${scopeLabel}.`}
            />
          </div>

          <ItemUsageCompareChart
            days={data.itemUsageDays ?? (days <= 0 ? 7 : Math.min(days, 30))}
            inventoryOptions={data.inventoryOptions ?? []}
            itemUsageSeries={
              data.itemUsageSeries ?? {
                itemIds: [],
                itemNames: {},
                points: [],
              }
            }
            defaultItemIds={data.defaultItemIds}
            subtitle={`${scopeLabel}. Chart window capped at 30 days for readability.`}
          />

          <AdminDailyStockSection
            date={selectedDate}
            onDateChange={setSelectedDate}
            destinationFilter={destination}
          />

          <UserActivityChart
            data={data.userActivity ?? { users: [], points: [] }}
          />
        </>
      )}
    </div>
  );
}
