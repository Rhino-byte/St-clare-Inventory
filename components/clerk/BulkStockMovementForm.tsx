"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { ItemSearchCombobox } from "@/components/clerk/ItemSearchCombobox";
import {
  StockMovementPreviewDialog,
  toPreviewLine,
  type PreviewLine,
} from "@/components/clerk/StockMovementPreviewDialog";
import { fetchInventory, submitBulkStockMovement } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import {
  DEFAULT_STOCK_DESTINATION,
  STOCK_DESTINATIONS,
  type InventoryItem,
  type StockDestination,
} from "@/lib/types";

const MAX_BULK_LINES = 50;

type BulkLine = {
  key: string;
  itemId: string;
  quantity: string;
  notes: string;
  destination: StockDestination;
};

interface BulkStockMovementFormProps {
  type: "in" | "out";
}

export function BulkStockMovementForm({ type }: BulkStockMovementFormProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pickerItemId, setPickerItemId] = useState("");
  const [lines, setLines] = useState<BulkLine[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLines, setPreviewLines] = useState<PreviewLine[]>([]);

  useEffect(() => {
    fetchInventory()
      .then(setItems)
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to load inventory"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  function addLine(itemId: string) {
    if (!itemId) return;
    if (lines.some((line) => line.itemId === itemId)) {
      toast.error("That item is already in the list.");
      setPickerItemId("");
      return;
    }
    if (lines.length >= MAX_BULK_LINES) {
      toast.error(`Bulk updates are limited to ${MAX_BULK_LINES} items.`);
      setPickerItemId("");
      return;
    }

    setLines((current) => [
      {
        key: `${itemId}-${Date.now()}`,
        itemId,
        quantity: "",
        notes: "",
        destination: DEFAULT_STOCK_DESTINATION,
      },
      ...current,
    ]);
    setPickerItemId("");
  }

  function updateLine(key: string, patch: Partial<BulkLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (lines.length === 0) {
      toast.error("Add at least one item.");
      return;
    }

    const nextPreview: PreviewLine[] = [];
    for (const line of lines) {
      const item = items.find((entry) => entry.itemId === line.itemId);
      const qty = Number(line.quantity);
      if (!item) {
        toast.error(
          "One or more items could not be found. Refresh and try again."
        );
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Enter a valid quantity for ${item.itemName}.`);
        return;
      }
      nextPreview.push(toPreviewLine(line, item));
    }

    setPreviewLines(nextPreview);
    setPreviewOpen(true);
  }

  async function handleConfirm(draft: PreviewLine[]) {
    setSubmitting(true);
    try {
      const result = await submitBulkStockMovement({
        type,
        lines: draft.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          notes: type === "in" ? line.notes : "",
          ...(type === "out" ? { destination: line.destination } : {}),
        })),
      });
      toast.success(
        `${type === "in" ? "Stock in" : "Stock out"} recorded for ${result.items.length} item${result.items.length === 1 ? "" : "s"}.`
      );
      const updatedById = new Map(
        result.items.map((item) => [item.itemId, item])
      );
      setItems((current) =>
        current.map((item) => updatedById.get(item.itemId) ?? item)
      );
      setLines([]);
      setPickerItemId("");
      setPreviewOpen(false);
      setPreviewLines([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {type === "in" ? "Bulk Stock In" : "Bulk Stock Out"}
          </CardTitle>
          <CardDescription>
            {type === "in"
              ? "Add multiple received items in one submit."
              : "Record multiple removals in one submit. Set destination per item."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Add item</Label>
              <ItemSearchCombobox
                items={items}
                value={pickerItemId}
                onChange={addLine}
                disabled={loading || submitting}
              />
            </div>

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Search and select items to build your list.
              </p>
            ) : (
              <ul className="space-y-3">
                {lines.map((line) => {
                  const item = items.find(
                    (entry) => entry.itemId === line.itemId
                  );
                  if (!item) return null;
                  return (
                    <li
                      key={line.key}
                      className="space-y-3 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.itemName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Available: {formatNumber(item.closingStock)}{" "}
                            {item.unit || "units"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(line.key)}
                          disabled={submitting}
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`qty-${line.key}`}>Quantity</Label>
                          <Input
                            id={`qty-${line.key}`}
                            type="number"
                            min="0"
                            step="any"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.key, {
                                quantity: event.target.value,
                              })
                            }
                            required
                            disabled={submitting}
                          />
                        </div>

                        {type === "out" && (
                          <div className="space-y-2">
                            <Label htmlFor={`dest-${line.key}`}>
                              Destination
                            </Label>
                            <select
                              id={`dest-${line.key}`}
                              value={line.destination}
                              onChange={(event) =>
                                updateLine(line.key, {
                                  destination: event.target
                                    .value as StockDestination,
                                })
                              }
                              disabled={submitting}
                              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                            >
                              {STOCK_DESTINATIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {type === "in" && (
                          <div className="space-y-2 sm:col-span-1">
                            <Label htmlFor={`prices-${line.key}`}>
                              Prices (optional)
                            </Label>
                            <Input
                              id={`prices-${line.key}`}
                              value={line.notes}
                              onChange={(event) =>
                                updateLine(line.key, {
                                  notes: event.target.value,
                                })
                              }
                              placeholder="e.g. unit price"
                              disabled={submitting}
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={loading || lines.length === 0}
            >
              {type === "in"
                ? `Add Stock (${lines.length})`
                : `Remove Stock (${lines.length})`}
            </Button>
          </form>
        </CardContent>
      </Card>

      <StockMovementPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        type={type}
        lines={previewLines}
        submitting={submitting}
        onConfirm={handleConfirm}
      />
    </>
  );
}
