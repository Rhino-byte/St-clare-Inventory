"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DailyStockTable } from "@/components/shared/DailyStockTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { fetchDailyStock } from "@/lib/api-client";
import type { DailyStockItem } from "@/lib/analytics";

export function AdminDailyStockSection() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DailyStockItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchDailyStock(date);
        setItems(data.items);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load daily stock"
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Daily stock</h2>
          <p className="text-sm text-slate-500">
            Per-item stock in and out for a selected day.
          </p>
        </div>
        <div className="w-full space-y-2 sm:w-auto">
          <Label htmlFor="daily-stock-date">Date</Label>
          <Input
            id="daily-stock-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="sm:w-48"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState
          label="Loading daily stock"
          layout="centered"
          className="min-h-[20vh]"
        />
      ) : (
        <DailyStockTable items={items} />
      )}
    </section>
  );
}
