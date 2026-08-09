"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_DESTINATION, type DestinationTotal } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#047857", "#b45309", "#1d4ed8", "#7c3aed", "#be123c", "#0f766e"];

interface DestinationBreakdownChartProps {
  data: DestinationTotal[];
  destinationFilter: string;
  subtitle?: string;
}

export function DestinationBreakdownChart({
  data,
  destinationFilter,
  subtitle,
}: DestinationBreakdownChartProps) {
  const selected =
    destinationFilter !== ALL_DESTINATION
      ? data.find((entry) => entry.destination === destinationFilter)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Destination breakdown</CardTitle>
        {subtitle ? (
          <p className="text-sm font-normal text-slate-500">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="h-64 sm:h-80">
        {destinationFilter !== ALL_DESTINATION ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-slate-500">{destinationFilter}</p>
            <p className="text-4xl font-semibold text-slate-900">
              {formatNumber(selected?.quantity ?? 0)}
            </p>
            <p className="text-sm text-slate-500">stock-out units in range</p>
          </div>
        ) : data.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No stock-out destinations in this range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="quantity"
                nameKey="destination"
                cx="50%"
                cy="50%"
                outerRadius={90}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.destination}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
