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
import { useIsMobile } from "@/lib/use-media-query";

interface InOutMovementChartProps {
  data: Array<{ date: string; in: number; out: number }>;
  subtitle?: string;
}

export function InOutMovementChart({ data, subtitle }: InOutMovementChartProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily In vs Out</CardTitle>
        {subtitle ? (
          <p className="text-sm font-normal text-slate-500">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="h-64 sm:h-80">
        {data.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No stock movements in this range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 40} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="in"
                name="Stock in"
                stroke="#047857"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="out"
                name="Stock out"
                stroke="#b45309"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
