"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/lib/use-media-query";

interface AnalyticsChartsProps {
  categoryStock: Array<{ category: string; stock: number }>;
  topConsumed: Array<{ itemId: string; itemName: string; quantity: number }>;
}

export function AnalyticsCharts({
  categoryStock,
  topConsumed,
}: AnalyticsChartsProps) {
  const isMobile = useIsMobile();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Stock by category</CardTitle>
        </CardHeader>
        <CardContent className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryStock}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" hide={categoryStock.length > 8} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="stock" fill="#047857" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top consumed items</CardTitle>
        </CardHeader>
        <CardContent className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topConsumed} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="itemName"
                width={isMobile ? 72 : 120}
                tick={{ fontSize: isMobile ? 11 : 12 }}
              />
              <Tooltip />
              <Bar dataKey="quantity" fill="#b45309" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
