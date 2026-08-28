"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ItemSearchCombobox } from "@/components/clerk/ItemSearchCombobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchCorrections,
  fetchInventory,
  submitStockCorrection,
} from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import type { InventoryItem, StockCorrection } from "@/lib/types";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString();
}

export function CorrectionsPageClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [corrections, setCorrections] = useState<StockCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itemId, setItemId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [inventory, history] = await Promise.all([
        fetchInventory(),
        fetchCorrections(50),
      ]);
      setItems(inventory);
      setCorrections(history);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load corrections"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedItem = items.find((item) => item.itemId === itemId);

  const projectedClosing = useMemo(() => {
    if (!selectedItem) return null;
    const value = Number(delta);
    if (!Number.isFinite(value) || value === 0) return selectedItem.closingStock;
    return Math.max(0, selectedItem.closingStock + value);
  }, [selectedItem, delta]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!itemId) {
      toast.error("Select an item.");
      return;
    }

    const value = Number(delta);
    if (!Number.isFinite(value) || value === 0) {
      toast.error("Enter a non-zero adjustment quantity.");
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("Enter a reason for this correction.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitStockCorrection({
        itemId,
        delta: value,
        reason: trimmedReason,
      });
      toast.success(
        `Corrected ${result.item.itemName}: ${formatNumber(result.correction.beforeClosing)} → ${formatNumber(result.correction.afterClosing)}`
      );
      setItems((current) =>
        current.map((item) =>
          item.itemId === result.item.itemId ? result.item : item
        )
      );
      setCorrections((current) => [result.correction, ...current].slice(0, 50));
      setDelta("");
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Correction failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adjust live stock</CardTitle>
          <CardDescription>
            Use a positive quantity to add stock or a negative quantity to
            remove it. Every change is logged on the Corrections sheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <ItemSearchCombobox
              items={items}
              value={itemId}
              onChange={setItemId}
              disabled={loading || submitting}
            />

            {selectedItem && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Available:{" "}
                <span className="font-semibold text-slate-900">
                  {formatNumber(selectedItem.closingStock)}{" "}
                  {selectedItem.unit || "units"}
                </span>
                {Number.isFinite(Number(delta)) && Number(delta) !== 0 ? (
                  <>
                    {" "}
                    → After:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatNumber(projectedClosing ?? 0)}{" "}
                      {selectedItem.unit || "units"}
                    </span>
                  </>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="correction-delta">Adjustment quantity</Label>
              <Input
                id="correction-delta"
                type="number"
                step="any"
                value={delta}
                onChange={(event) => setDelta(event.target.value)}
                placeholder="e.g. 5 or -3"
                required
                disabled={submitting}
              />
              <p className="text-xs text-slate-500">
                Positive adds stock. Negative removes stock.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="correction-reason">Reason</Label>
              <Input
                id="correction-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. counted physical stock"
                required
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full sm:w-auto"
              loading={submitting}
              disabled={loading}
            >
              Apply correction
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent corrections</CardTitle>
          <CardDescription>
            Newest first. Shows who changed what and why.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading corrections…</p>
          ) : corrections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No corrections recorded yet.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Before</TableHead>
                      <TableHead>After</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {corrections.map((entry) => (
                      <TableRow
                        key={`${entry.timestamp}-${entry.itemId}-${entry.delta}-${entry.reason}`}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell>{entry.itemName}</TableCell>
                        <TableCell>
                          {entry.delta > 0 ? "+" : ""}
                          {formatNumber(entry.delta)}
                        </TableCell>
                        <TableCell>
                          {formatNumber(entry.beforeClosing)}
                        </TableCell>
                        <TableCell>
                          {formatNumber(entry.afterClosing)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {entry.adminEmail || "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-3 md:hidden">
                {corrections.map((entry) => (
                  <li
                    key={`${entry.timestamp}-${entry.itemId}-${entry.delta}-${entry.reason}-m`}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-900">
                      {entry.itemName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTimestamp(entry.timestamp)}
                    </p>
                    <p className="mt-2 text-slate-700">
                      Delta: {entry.delta > 0 ? "+" : ""}
                      {formatNumber(entry.delta)} ·{" "}
                      {formatNumber(entry.beforeClosing)} →{" "}
                      {formatNumber(entry.afterClosing)}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {entry.adminEmail || "—"}
                    </p>
                    <p className="mt-1 text-slate-500">{entry.reason || "—"}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
