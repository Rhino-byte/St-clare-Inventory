"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  ALL_CATEGORY,
  type DailyTopByCategory,
  type PeriodComparisonSeries,
} from "@/lib/analytics";
import { useIsMobile } from "@/lib/use-media-query";

const LINE_COLORS = [
  "#047857",
  "#b45309",
  "#1d4ed8",
  "#7c3aed",
  "#be123c",
];

interface AnalyticsChartsProps {
  categories: string[];
  dailyTopByCategory: DailyTopByCategory;
  topStockIn: Array<{ itemId: string; itemName: string; quantity: number }>;
  periodComparison: PeriodComparisonSeries;
}

export function AnalyticsCharts({
  categories,
  dailyTopByCategory,
  topStockIn,
  periodComparison,
}: AnalyticsChartsProps) {
  const isMobile = useIsMobile();
  const categoryOptions = useMemo(
    () => [ALL_CATEGORY, ...categories],
    [categories]
  );
  const [category, setCategory] = useState(ALL_CATEGORY);

  const selectedSeries =
    dailyTopByCategory[category] ??
    dailyTopByCategory[ALL_CATEGORY] ?? {
      topItems: [],
      points: [],
    };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Top 5 daily usage</CardTitle>
            <div className="space-y-2">
              <Label htmlFor="usage-category">Category</Label>
              <select
                id="usage-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm font-normal text-slate-500">
              Daily stock-out for the top 5 items in this category (current
              range).
            </p>
          </CardHeader>
          <CardContent className="h-64 sm:h-80">
            {selectedSeries.topItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No stock-out usage in this category for the selected range.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedSeries.points}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis allowDecimals={false} width={isMobile ? 28 : 40} />
                  <Tooltip />
                  <Legend />
                  {selectedSeries.topItems.map((item, index) => (
                    <Line
                      key={item.itemId}
                      type="monotone"
                      dataKey={item.itemName}
                      name={item.itemName}
                      stroke={LINE_COLORS[index % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top stock-in items</CardTitle>
            <p className="text-sm font-normal text-slate-500">
              Highest stock-in quantities in the selected range (top 10).
            </p>
          </CardHeader>
          <CardContent className="h-64 sm:h-80">
            {topStockIn.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No stock-in movements in this period.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStockIn} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="itemName"
                    width={isMobile ? 72 : 120}
                    tick={{ fontSize: isMobile ? 11 : 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#047857" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Period comparison</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            Daily stock-out: current ({periodComparison.currentFrom} →{" "}
            {periodComparison.currentTo}) vs previous (
            {periodComparison.previousFrom} → {periodComparison.previousTo}).
          </p>
        </CardHeader>
        <CardContent className="h-72 sm:h-96">
          {periodComparison.points.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No period data to compare.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodComparison.points}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} width={isMobile ? 28 : 40} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="current"
                  name="Current period"
                  fill="#047857"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="previous"
                  name="Previous period"
                  fill="#1d4ed8"
                  fillOpacity={0.45}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
