"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DailyStockTable } from "@/components/shared/DailyStockTable";
import { LoadingState } from "@/components/ui/loading-state";
import { fetchDailyStock } from "@/lib/api-client";
import type { DailyStockItem } from "@/lib/analytics";

export function StaffDailyStockClient() {
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [items, setItems] = useState<DailyStockItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchDailyStock();
        setDate(data.date);
        setItems(data.items);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load today's stock"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <LoadingState
        label="Loading today's stock"
        layout="centered"
        className="min-h-[40vh]"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Today's stock
        </h1>
        <p className="text-sm text-slate-500">
          Per-item stock in and out for {date || "today"}.
        </p>
      </div>
      <DailyStockTable
        items={items}
        emptyMessage="No stock movements recorded today."
      />
    </div>
  );
}
