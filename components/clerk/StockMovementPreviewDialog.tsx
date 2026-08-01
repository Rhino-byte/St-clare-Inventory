"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/utils";
import {
  STOCK_DESTINATIONS,
  type InventoryItem,
  type StockDestination,
} from "@/lib/types";

export type PreviewLine = {
  key: string;
  itemId: string;
  itemName: string;
  unit: string;
  available: number;
  quantity: string;
  notes: string;
  destination: StockDestination;
};

interface StockMovementPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "in" | "out";
  lines: PreviewLine[];
  submitting: boolean;
  onConfirm: (lines: PreviewLine[]) => void | Promise<void>;
}

function projectedClosing(
  type: "in" | "out",
  available: number,
  quantity: number
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return available;
  if (type === "in") return available + quantity;
  return Math.max(0, available - quantity);
}

export function StockMovementPreviewDialog({
  open,
  onOpenChange,
  type,
  lines,
  submitting,
  onConfirm,
}: StockMovementPreviewDialogProps) {
  const [draft, setDraft] = useState<PreviewLine[]>([]);

  useEffect(() => {
    if (open) {
      setDraft(lines.map((line) => ({ ...line })));
    }
  }, [open, lines]);

  function updateLine(key: string, patch: Partial<PreviewLine>) {
    setDraft((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  function removeLine(key: string) {
    setDraft((current) => current.filter((line) => line.key !== key));
  }

  async function handleConfirm() {
    if (draft.length === 0) {
      toast.error("Add at least one item.");
      return;
    }

    const totalsByItem = new Map<string, number>();

    for (const line of draft) {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Enter a valid quantity for ${line.itemName}.`);
        return;
      }
      totalsByItem.set(line.itemId, (totalsByItem.get(line.itemId) ?? 0) + qty);
    }

    if (type === "out") {
      for (const line of draft) {
        const total = totalsByItem.get(line.itemId) ?? 0;
        if (total > line.available) {
          toast.error(
            `Cannot remove ${total} ${line.unit || "units"} of ${line.itemName}. Only ${formatNumber(line.available)} available.`
          );
          return;
        }
      }
    }

    await onConfirm(draft);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Preview {type === "in" ? "Stock In" : "Stock Out"}
          </DialogTitle>
          <DialogDescription>
            Review and edit the list before saving. Nothing is written until you
            confirm.
          </DialogDescription>
        </DialogHeader>

        {draft.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No items left in this preview.
          </p>
        ) : (
          <ul className="space-y-3">
            {draft.map((line) => {
              const qty = Number(line.quantity);
              const projected = projectedClosing(type, line.available, qty);
              return (
                <li
                  key={line.key}
                  className="space-y-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {line.itemName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Available: {formatNumber(line.available)}{" "}
                        {line.unit || "units"}
                        {Number.isFinite(qty) && qty > 0 ? (
                          <>
                            {" "}
                            → After:{" "}
                            <span className="font-medium text-slate-700">
                              {formatNumber(projected)} {line.unit || "units"}
                            </span>
                          </>
                        ) : null}
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
                      <Label htmlFor={`preview-qty-${line.key}`}>Quantity</Label>
                      <Input
                        id={`preview-qty-${line.key}`}
                        type="number"
                        min="0"
                        step="any"
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.key, {
                            quantity: event.target.value,
                          })
                        }
                        disabled={submitting}
                      />
                    </div>

                    {type === "out" && (
                      <div className="space-y-2">
                        <Label htmlFor={`preview-dest-${line.key}`}>
                          Destination
                        </Label>
                        <select
                          id={`preview-dest-${line.key}`}
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

                    <div
                      className={`space-y-2 ${type === "out" ? "sm:col-span-2" : ""}`}
                    >
                      <Label htmlFor={`preview-notes-${line.key}`}>
                        Notes (optional)
                      </Label>
                      <Input
                        id={`preview-notes-${line.key}`}
                        value={line.notes}
                        onChange={(event) =>
                          updateLine(line.key, { notes: event.target.value })
                        }
                        placeholder="e.g. breakfast service"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || draft.length === 0}
          >
            {submitting
              ? "Saving..."
              : type === "in"
                ? "Confirm Add Stock"
                : "Confirm Remove Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Helper to map inventory + form line into a preview row. */
export function toPreviewLine(
  line: {
    key: string;
    itemId: string;
    quantity: string;
    notes: string;
    destination: StockDestination;
  },
  item: InventoryItem
): PreviewLine {
  return {
    key: line.key,
    itemId: line.itemId,
    itemName: item.itemName,
    unit: item.unit,
    available: item.closingStock,
    quantity: line.quantity,
    notes: line.notes,
    destination: line.destination,
  };
}
