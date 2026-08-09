"use client";

import {
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
import type { CategoryTopDailySeries } from "@/lib/analytics";
import { useIsMobile } from "@/lib/use-media-query";

const LINE_COLORS = [
  "#047857",
  "#b45309",
  "#1d4ed8",
  "#7c3aed",
  "#be123c",
];

interface TopUsedDailyChartProps {
  series: CategoryTopDailySeries;
  subtitle?: string;
}

export function TopUsedDailyChart({ series, subtitle }: TopUsedDailyChartProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 most used</CardTitle>
        {subtitle ? (
          <p className="text-sm font-normal text-slate-500">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="h-64 sm:h-80">
        {series.topItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No stock-out usage for this category and destination.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 40} />
              <Tooltip />
              <Legend />
              {series.topItems.map((item, index) => (
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
  );
}
