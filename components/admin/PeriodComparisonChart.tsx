"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PeriodComparisonSeries } from "@/lib/analytics";
import { useIsMobile } from "@/lib/use-media-query";

interface PeriodComparisonChartProps {
  data: PeriodComparisonSeries;
  subtitle?: string;
}

export function PeriodComparisonChart({
  data,
  subtitle,
}: PeriodComparisonChartProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Period comparison</CardTitle>
        <p className="text-sm font-normal text-slate-500">
          {subtitle ??
            `Daily stock-out: current (${data.currentFrom} → ${data.currentTo}) vs previous (${data.previousFrom} → ${data.previousTo}).`}
        </p>
      </CardHeader>
      <CardContent className="h-72 sm:h-96">
        {data.points.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No period data to compare.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.points}>
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
  );
}
