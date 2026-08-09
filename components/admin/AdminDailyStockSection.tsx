"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchDailyStock } from "@/lib/api-client";
import type { DailyStockItem } from "@/lib/analytics";
import { ALL_DESTINATION, normalizeDestination } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";

interface AdminDailyStockSectionProps {
  date: string;
  onDateChange: (date: string) => void;
  /** When set (and not All), only stock-out rows matching this destination are shown. */
  destinationFilter?: string;
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
      {message}
    </p>
  );
}

function DayStockInTable({ rows }: { rows: DailyStockItem[] }) {
  if (!rows.length) {
    return <EmptyBlock message="No stock-in movements for this day." />;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.itemId}>
                <TableCell className="font-medium">{row.itemName}</TableCell>
                <TableCell>{formatNumber(row.stockIn)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.itemId}>
            <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
              <p className="font-medium text-slate-900">{row.itemName}</p>
              <p className="text-slate-700">{formatNumber(row.stockIn)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function DayStockOutTable({ rows }: { rows: DailyStockItem[] }) {
  if (!rows.length) {
    return <EmptyBlock message="No stock-out movements for this day." />;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock Out</TableHead>
              <TableHead>Destination</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.itemId}>
                <TableCell className="font-medium">{row.itemName}</TableCell>
                <TableCell>{formatNumber(row.stockOut)}</TableCell>
                <TableCell>{row.destination || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.itemId}>
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-medium text-slate-900">{row.itemName}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-500">Stock Out</p>
                  <p className="font-medium">{formatNumber(row.stockOut)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Destination</p>
                  <p className="font-medium">{row.destination || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function AdminDailyStockSection({
  date,
  onDateChange,
  destinationFilter = ALL_DESTINATION,
}: AdminDailyStockSectionProps) {
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

  const stockInRows = useMemo(
    () => items.filter((item) => item.stockIn > 0),
    [items]
  );
  const stockOutRows = useMemo(() => {
    const outs = items.filter((item) => item.stockOut > 0);
    if (!destinationFilter || destinationFilter === ALL_DESTINATION) {
      return outs;
    }
    return outs.filter((item) => {
      const parts = item.destination
        .split(",")
        .map((part) => normalizeDestination(part));
      return parts.includes(destinationFilter);
    });
  }, [items, destinationFilter]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Daily stock</h2>
          <p className="text-sm text-slate-500">
            Stock in and stock out for a selected day
            {destinationFilter && destinationFilter !== ALL_DESTINATION
              ? ` (stock out filtered to ${destinationFilter})`
              : ""}
            .
          </p>
        </div>
        <div className="w-full space-y-2 sm:w-auto">
          <Label htmlFor="daily-stock-date">Date</Label>
          <Input
            id="daily-stock-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
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
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Stock In</h3>
            <DayStockInTable rows={stockInRows} />
          </div>
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Stock Out</h3>
            <DayStockOutTable rows={stockOutRows} />
          </div>
        </div>
      )}
    </section>
  );
}
