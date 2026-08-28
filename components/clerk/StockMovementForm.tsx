"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemSearchCombobox } from "@/components/clerk/ItemSearchCombobox";
import { fetchInventory, submitStockMovement } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import {
  DEFAULT_STOCK_DESTINATION,
  STOCK_DESTINATIONS,
  type InventoryItem,
  type StockDestination,
} from "@/lib/types";

interface StockMovementFormProps {
  type: "in" | "out";
}

export function StockMovementForm({ type }: StockMovementFormProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [destination, setDestination] = useState<StockDestination>(
    DEFAULT_STOCK_DESTINATION
  );

  useEffect(() => {
    fetchInventory()
      .then(setItems)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Failed to load inventory")
      )
      .finally(() => setLoading(false));
  }, []);

  const selectedItem = items.find((item) => item.itemId === itemId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!itemId) {
      toast.error("Select an item.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitStockMovement({
        itemId,
        type,
        quantity: qty,
        notes: type === "in" ? notes : "",
        ...(type === "out" ? { destination } : {}),
      });
      toast.success(
        `${type === "in" ? "Stock in" : "Stock out"} recorded for ${result.item.itemName}.`
      );
      setItems((current) =>
        current.map((item) => (item.itemId === result.item.itemId ? result.item : item))
      );
      setQuantity("");
      setNotes("");
      setDestination(DEFAULT_STOCK_DESTINATION);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === "in" ? "Record Stock In" : "Record Stock Out"}</CardTitle>
        <CardDescription>
          {type === "in"
            ? "Add received stock to the inventory."
            : "Record items used or removed from store."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <ItemSearchCombobox
            items={items}
            value={itemId}
            onChange={setItemId}
            disabled={loading}
          />

          {selectedItem && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Available:{" "}
              <span className="font-semibold text-slate-900">
                {formatNumber(selectedItem.closingStock)} {selectedItem.unit || "units"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </div>

          {type === "out" && (
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <select
                id="destination"
                value={destination}
                onChange={(event) =>
                  setDestination(event.target.value as StockDestination)
                }
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
            <div className="space-y-2">
              <Label htmlFor="prices">Prices (optional)</Label>
              <Input
                id="prices"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. unit price"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={submitting}
            disabled={loading}
          >
            {type === "in" ? "Add Stock" : "Remove Stock"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
