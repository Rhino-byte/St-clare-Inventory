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
import type { UserActivitySeries } from "@/lib/analytics";
import { useIsMobile } from "@/lib/use-media-query";

const LINE_COLORS = [
  "#047857",
  "#b45309",
  "#1d4ed8",
  "#7c3aed",
  "#be123c",
  "#0f766e",
  "#a16207",
  "#4338ca",
];

interface UserActivityChartProps {
  data: UserActivitySeries;
}

export function UserActivityChart({ data }: UserActivityChartProps) {
  const isMobile = useIsMobile();

  if (!data.users.length || !data.points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No staff activity in this period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff activity</CardTitle>
        <p className="text-sm font-normal text-slate-500">
          Transactions recorded per user each day (from the range selected above).
        </p>
      </CardHeader>
      <CardContent className="h-72 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} width={isMobile ? 28 : 40} />
            <Tooltip />
            <Legend />
            {data.users.map((user, index) => (
              <Line
                key={user}
                type="monotone"
                dataKey={user}
                name={user}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
