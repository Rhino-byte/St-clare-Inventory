"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ItemMultiSelect } from "@/components/admin/ItemMultiSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryOption, ItemDailyOutSeries } from "@/lib/analytics";
import { useIsMobile } from "@/lib/use-media-query";

const LINE_COLORS = [
  "#047857",
  "#b45309",
  "#1d4ed8",
  "#7c3aed",
  "#be123c",
];

function usageCopy(days: number): { title: string; description: string } {
  if (days >= 90) {
    return {
      title: "Quarterly item usage",
      description:
        "Compare stock-out for selected items over the last 90 days.",
    };
  }
  if (days >= 30) {
    return {
      title: "Monthly item usage",
      description:
        "Compare stock-out for selected items over the last 30 days.",
    };
  }
  return {
    title: "Weekly item usage",
    description: "Compare stock-out for selected items over the last 7 days.",
  };
}

interface WeeklyItemUsageChartProps {
  days: number;
  inventoryOptions: InventoryOption[];
  itemUsageSeries: ItemDailyOutSeries;
}

export function WeeklyItemUsageChart({
  days,
  inventoryOptions,
  itemUsageSeries,
}: WeeklyItemUsageChartProps) {
  const isMobile = useIsMobile();
  const { title, description } = usageCopy(days);

  const defaultIds = useMemo(() => {
    const withActivity = itemUsageSeries.itemIds.filter((id) =>
      itemUsageSeries.points.some((point) => Number(point[id] ?? 0) > 0)
    );
    const pool = withActivity.length
      ? withActivity
      : inventoryOptions.map((option) => option.itemId);
    return pool.slice(0, 3);
  }, [inventoryOptions, itemUsageSeries]);

  const [selectedIds, setSelectedIds] = useState<string[]>(defaultIds);

  useEffect(() => {
    setSelectedIds(defaultIds);
  }, [defaultIds]);

  const chartItems = selectedIds.map((id) => ({
    itemId: id,
    itemName:
      itemUsageSeries.itemNames[id] ??
      inventoryOptions.find((option) => option.itemId === id)?.itemName ??
      id,
  }));

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm font-normal text-slate-500">{description}</p>
        <ItemMultiSelect
          options={inventoryOptions}
          value={selectedIds}
          onChange={setSelectedIds}
        />
      </CardHeader>
      <CardContent className="h-72 sm:h-96">
        {selectedIds.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Select at least one item to compare.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={itemUsageSeries.points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 40} />
              <Tooltip />
              <Legend />
              {chartItems.map((item, index) => (
                <Line
                  key={item.itemId}
                  type="monotone"
                  dataKey={item.itemId}
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
